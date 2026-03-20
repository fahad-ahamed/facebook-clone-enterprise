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
    const { content, parentId, mediaUrl, mediaType } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Check if post exists
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const comment = await db.comment.create({
      data: {
        postId,
        authorId: authUser.userId,
        content: content || '',
        parentId: parentId || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Update post comment count
    await db.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } }
    });

    return NextResponse.json({ comment }, { status: 201 });

  } catch (error) {
    console.error('Comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const comments = await db.comment.findMany({
      where: {
        postId,
        deletedAt: null,
        parentId: null // Only get top-level comments
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        replies: {
          where: { deletedAt: null },
          take: 3,
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: { replies: { where: { deletedAt: null } } }
        }
      }
    });

    return NextResponse.json({ comments });

  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE comment - Only post author OR comment author can delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Get the comment and post
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { 
        id: true, 
        authorId: true, 
        postId: true,
        parentId: true 
      }
    });

    if (!comment || comment.deletedAt) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Verify the comment belongs to this post
    if (comment.postId !== postId) {
      return NextResponse.json({ error: 'Comment does not belong to this post' }, { status: 400 });
    }

    // Get the post to check if user is post author
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check authorization: must be comment author OR post author
    const isCommentAuthor = comment.authorId === authUser.userId;
    const isPostAuthor = post.authorId === authUser.userId;

    if (!isCommentAuthor && !isPostAuthor) {
      return NextResponse.json({ 
        error: 'Not authorized to delete this comment. Only the comment author or post author can delete comments.' 
      }, { status: 403 });
    }

    // Soft delete the comment
    await db.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() }
    });

    // Update post comment count
    await db.post.update({
      where: { id: postId },
      data: { commentCount: { decrement: 1 } }
    });

    // If it was a reply, update parent's reply count
    if (comment.parentId) {
      await db.comment.update({
        where: { id: comment.parentId },
        data: { replyCount: { decrement: 1 } }
      });
    }

    return NextResponse.json({ 
      message: 'Comment deleted successfully',
      deletedBy: isCommentAuthor ? 'comment_author' : 'post_author'
    });

  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
