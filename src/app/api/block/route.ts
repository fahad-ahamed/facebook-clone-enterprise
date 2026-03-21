import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get blocked users
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

    const blockedUsers = await db.block.findMany({
      where: { blockerId: authUser.userId },
      include: {
        blocked: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            avatar: true 
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      blockedUsers: blockedUsers.map(b => ({
        ...b.blocked,
        blockedAt: b.createdAt
      }))
    });

  } catch (error) {
    console.error('Get blocked users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Block/Unblock user
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, action } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    if (targetUserId === authUser.userId) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingBlock = await db.block.findFirst({
      where: {
        blockerId: authUser.userId,
        blockedId: targetUserId
      }
    });

    if (action === 'block') {
      if (existingBlock) {
        return NextResponse.json({ error: 'Already blocked' }, { status: 400 });
      }

      // Create block
      await db.block.create({
        data: {
          blockerId: authUser.userId,
          blockedId: targetUserId
        }
      });

      // Remove friendship if exists
      await db.friendship.deleteMany({
        where: {
          OR: [
            { user1Id: authUser.userId, user2Id: targetUserId },
            { user1Id: targetUserId, user2Id: authUser.userId }
          ]
        }
      });

      // Remove follow relationships
      await db.follow.deleteMany({
        where: {
          OR: [
            { followerId: authUser.userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: authUser.userId }
          ]
        }
      });

      // Cancel pending friend requests
      await db.friendRequest.updateMany({
        where: {
          OR: [
            { senderId: authUser.userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: authUser.userId }
          ],
          status: 'pending'
        },
        data: { status: 'canceled' }
      });

      return NextResponse.json({ message: 'User blocked successfully', blocked: true });
    }

    if (action === 'unblock') {
      if (!existingBlock) {
        return NextResponse.json({ error: 'Not blocked' }, { status: 400 });
      }

      await db.block.delete({
        where: { id: existingBlock.id }
      });

      return NextResponse.json({ message: 'User unblocked successfully', blocked: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Block action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
