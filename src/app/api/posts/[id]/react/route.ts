import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    // Check if post exists
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check for existing reaction
    const existingReaction = await db.reaction.findFirst({
      where: {
        userId: authUser.userId,
        postId: postId
      }
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Remove reaction if same type
        await db.reaction.delete({
          where: { id: existingReaction.id }
        });
        return NextResponse.json({ message: 'Reaction removed', reaction: null });
      } else {
        // Update reaction type
        const updated = await db.reaction.update({
          where: { id: existingReaction.id },
          data: { type }
        });
        return NextResponse.json({ message: 'Reaction updated', reaction: updated });
      }
    }

    // Create new reaction
    const reaction = await db.reaction.create({
      data: {
        userId: authUser.userId,
        postId,
        type
      }
    });

    return NextResponse.json({ message: 'Reaction added', reaction }, { status: 201 });

  } catch (error) {
    console.error('React error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
