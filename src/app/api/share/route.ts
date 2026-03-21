import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get shares for a post
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const shares = await db.postShare.findMany({
      where: { postId },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatar: true }
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await db.postShare.count({ where: { postId } });

    return NextResponse.json({ shares, total });

  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Share a post
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, content, shareType = 'timeline', groupId, pageId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if post exists and is accessible
    const originalPost = await db.post.findUnique({
      where: { id: postId, deletedAt: null },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!originalPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check visibility
    if (originalPost.visibility === 'private' && originalPost.authorId !== authUser.userId) {
      return NextResponse.json({ error: 'Cannot share private post' }, { status: 403 });
    }

    if (originalPost.visibility === 'friends') {
      const friendship = await db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: authUser.userId, user2Id: originalPost.authorId },
            { user1Id: originalPost.authorId, user2Id: authUser.userId }
          ]
        }
      });
      
      if (!friendship && originalPost.authorId !== authUser.userId) {
        return NextResponse.json({ error: 'Cannot share friends-only post' }, { status: 403 });
      }
    }

    // Check if sharing is allowed
    if (!originalPost.allowSharing) {
      return NextResponse.json({ error: 'Sharing is disabled for this post' }, { status: 403 });
    }

    // Create share record
    const share = await db.postShare.create({
      data: {
        postId,
        userId: authUser.userId,
        content: content || null
      }
    });

    // If shareType is timeline, also create a new post
    if (shareType === 'timeline') {
      const newPost = await db.post.create({
        data: {
          authorId: authUser.userId,
          content: content || null,
          postType: 'status',
          visibility: 'public',
          // Store reference to original post
          linkUrl: `/post/${postId}`,
          linkTitle: `${originalPost.author.firstName} ${originalPost.author.lastName}'s post`,
          linkDescription: originalPost.content?.substring(0, 200) || 'Shared post',
          groupId: groupId || null,
          pageId: pageId || null
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Update share count
      await db.post.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } }
      });

      return NextResponse.json({ share, post: newPost }, { status: 201 });
    }

    // Update share count
    await db.post.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } }
    });

    return NextResponse.json({ share }, { status: 201 });

  } catch (error) {
    console.error('Share post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
