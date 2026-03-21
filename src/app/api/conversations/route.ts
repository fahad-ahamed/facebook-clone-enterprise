import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get conversations where user is a member
    const memberships = await db.conversationMember.findMany({
      where: { userId: authUser.userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, avatar: true, isOnline: true }
                }
              }
            },
            lastMessage: {
              include: {
                sender: {
                  select: { id: true, firstName: true, lastName: true, avatar: true }
                }
              }
            },
            user1: {
              select: { id: true, firstName: true, lastName: true, avatar: true, isOnline: true }
            },
            user2: {
              select: { id: true, firstName: true, lastName: true, avatar: true, isOnline: true }
            }
          }
        }
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      skip,
      take: limit
    });

    const conversations = memberships.map(m => {
      const conv = m.conversation;
      const otherUser = conv.type === 'direct' 
        ? (conv.user1Id === authUser.userId ? conv.user2 : conv.user1)
        : null;
      
      const unreadCount = conv.lastMessage && conv.lastMessage.senderId !== authUser.userId && !m.lastReadAt
        ? 1 
        : 0;

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        avatar: conv.avatar,
        otherUser,
        members: conv.members.map(mem => mem.user),
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        muted: m.muted
      };
    });

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new conversation
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { type, recipientId, name, memberIds } = body;

    if (type === 'direct' && recipientId) {
      // Check if conversation already exists
      const existing = await db.conversation.findFirst({
        where: {
          type: 'direct',
          OR: [
            { user1Id: authUser.userId, user2Id: recipientId },
            { user1Id: recipientId, user2Id: authUser.userId }
          ]
        },
        include: {
          user1: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          user2: { select: { id: true, firstName: true, lastName: true, avatar: true } }
        }
      });

      if (existing) {
        return NextResponse.json({ conversation: existing });
      }

      // Create new direct conversation
      const conversation = await db.conversation.create({
        data: {
          type: 'direct',
          user1Id: authUser.userId,
          user2Id: recipientId,
          members: {
            create: [
              { userId: authUser.userId },
              { userId: recipientId }
            ]
          }
        },
        include: {
          user1: { select: { id: true, firstName: true, lastName: true, avatar: true, isOnline: true } },
          user2: { select: { id: true, firstName: true, lastName: true, avatar: true, isOnline: true } }
        }
      });

      return NextResponse.json({ conversation }, { status: 201 });
    }

    if (type === 'group' && name && memberIds?.length > 0) {
      // Create group conversation
      const conversation = await db.conversation.create({
        data: {
          type: 'group',
          name,
          createdBy: authUser.userId,
          members: {
            create: [
              { userId: authUser.userId, role: 'admin' },
              ...memberIds.map((id: string) => ({ userId: id }))
            ]
          }
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatar: true } }
            }
          }
        }
      });

      return NextResponse.json({ conversation }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
