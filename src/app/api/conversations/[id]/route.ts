import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Check if user is member of this conversation
    const membership = await db.conversationMember.findFirst({
      where: { conversationId, userId: authUser.userId }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await db.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    // Update last read
    await db.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() }
    });

    return NextResponse.json({ messages: messages.reverse() });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { 
      content, 
      messageType = 'text', 
      mediaUrl, 
      mediaType,
      fileName,
      fileSize,
      stickerId,
      gifUrl,
      replyToId
    } = body;

    // Check if user is member
    const membership = await db.conversationMember.findFirst({
      where: { conversationId, userId: authUser.userId }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create message
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: authUser.userId,
        content: content || null,
        messageType,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        stickerId: stickerId || null,
        gifUrl: gifUrl || null,
        replyToId: replyToId || null
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    // Update conversation's last message
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: new Date()
      }
    });

    return NextResponse.json({ message }, { status: 201 });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    // Check if user is member
    const membership = await db.conversationMember.findFirst({
      where: { conversationId, userId: authUser.userId }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove user from conversation
    await db.conversationMember.delete({
      where: { id: membership.id }
    });

    return NextResponse.json({ message: 'Conversation deleted' });

  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
