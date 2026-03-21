import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get saved posts
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = { userId: authUser.userId };
    if (collection) where.collection = collection;

    const savedPosts = await db.savedPost.findMany({
      where,
      include: {
        post: {
          include: {
            author: {
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                avatar: true,
                isVerified: true 
              }
            },
            reactions: {
              select: { type: true, userId: true }
            },
            _count: {
              select: { 
                comments: { where: { deletedAt: null } }, 
                reactions: true, 
                shares: true 
              }
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Get user's collections
    const collections = await db.savedPost.groupBy({
      by: ['collection'],
      where: { 
        userId: authUser.userId,
        collection: { not: null }
      },
      _count: true
    });

    return NextResponse.json({ 
      savedPosts: savedPosts.map(sp => ({
        ...sp.post,
        savedAt: sp.createdAt,
        collection: sp.collection
      })),
      collections: collections.map(c => ({
        name: c.collection,
        count: c._count
      }))
    });

  } catch (error) {
    console.error('Get saved posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Save/Unsave post
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, action, collection } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if post exists
    const post = await db.post.findUnique({
      where: { id: postId, deletedAt: null }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const existingSave = await db.savedPost.findFirst({
      where: {
        userId: authUser.userId,
        postId
      }
    });

    if (action === 'save') {
      if (existingSave) {
        return NextResponse.json({ error: 'Already saved' }, { status: 400 });
      }

      const savedPost = await db.savedPost.create({
        data: {
          userId: authUser.userId,
          postId,
          collection: collection || null
        }
      });

      return NextResponse.json({ message: 'Post saved successfully', savedPost, saved: true });
    }

    if (action === 'unsave') {
      if (!existingSave) {
        return NextResponse.json({ error: 'Not saved' }, { status: 400 });
      }

      await db.savedPost.delete({
        where: { id: existingSave.id }
      });

      return NextResponse.json({ message: 'Post unsaved successfully', saved: false });
    }

    if (action === 'move' && existingSave) {
      await db.savedPost.update({
        where: { id: existingSave.id },
        data: { collection: collection || null }
      });

      return NextResponse.json({ message: 'Post moved to collection' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Save post action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
