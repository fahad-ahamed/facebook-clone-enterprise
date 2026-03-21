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
      select: { id: true, likeCount: true }
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

    let reaction: { userId: string; id: string; createdAt: Date; type: string; postId: string | null; commentId: string | null } | null = null;
    let newLikeCount = post.likeCount;

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Remove reaction if same type
        await db.reaction.delete({
          where: { id: existingReaction.id }
        });
        newLikeCount = Math.max(0, post.likeCount - 1);
        await db.post.update({
          where: { id: postId },
          data: { likeCount: newLikeCount }
        });
      } else {
        // Update reaction type
        reaction = await db.reaction.update({
          where: { id: existingReaction.id },
          data: { type }
        });
      }
    } else {
      // Create new reaction
      reaction = await db.reaction.create({
        data: {
          userId: authUser.userId,
          postId,
          type
        }
      });
      newLikeCount = post.likeCount + 1;
      await db.post.update({
        where: { id: postId },
        data: { likeCount: newLikeCount }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: reaction ? 'Reaction added' : 'Reaction removed', 
      reaction,
      likeCount: newLikeCount
    }, { status: 201 });

  } catch (error) {
    console.error('React error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
