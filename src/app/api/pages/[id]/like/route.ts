import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Like/Unlike a page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: pageId } = await params;
    const body = await request.json();
    const { action } = body;

    // Check if page exists
    const page = await db.page.findUnique({
      where: { id: pageId, deletedAt: null }
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const existingLike = await db.pageLike.findFirst({
      where: { pageId, userId: authUser.userId }
    });

    if (action === 'like') {
      if (existingLike) {
        return NextResponse.json({ error: 'Already liked' }, { status: 400 });
      }

      await db.pageLike.create({
        data: { pageId, userId: authUser.userId }
      });

      // Also follow by default
      await db.pageFollow.upsert({
        where: {
          pageId_userId: { pageId, userId: authUser.userId }
        },
        create: { pageId, userId: authUser.userId },
        update: {}
      });

      // Update counts
      await db.page.update({
        where: { id: pageId },
        data: {
          likeCount: { increment: 1 },
          followerCount: { increment: 1 }
        }
      });

      return NextResponse.json({ message: 'Page liked', liked: true });
    }

    if (action === 'unlike') {
      if (!existingLike) {
        return NextResponse.json({ error: 'Not liked' }, { status: 400 });
      }

      await db.pageLike.delete({
        where: { id: existingLike.id }
      });

      // Update count
      await db.page.update({
        where: { id: pageId },
        data: { likeCount: { decrement: 1 } }
      });

      return NextResponse.json({ message: 'Page unliked', liked: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Page like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check if user likes the page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ liked: false });
    }

    const { id: pageId } = await params;

    const like = await db.pageLike.findFirst({
      where: { pageId, userId: authUser.userId }
    });

    return NextResponse.json({ liked: !!like });

  } catch (error) {
    console.error('Check page like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
