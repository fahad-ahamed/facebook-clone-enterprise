import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Follow/Unfollow a page
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

    const existingFollow = await db.pageFollow.findFirst({
      where: { pageId, userId: authUser.userId }
    });

    if (action === 'follow') {
      if (existingFollow) {
        return NextResponse.json({ error: 'Already following' }, { status: 400 });
      }

      await db.pageFollow.create({
        data: { pageId, userId: authUser.userId }
      });

      // Update count
      await db.page.update({
        where: { id: pageId },
        data: { followerCount: { increment: 1 } }
      });

      return NextResponse.json({ message: 'Page followed', following: true });
    }

    if (action === 'unfollow') {
      if (!existingFollow) {
        return NextResponse.json({ error: 'Not following' }, { status: 400 });
      }

      await db.pageFollow.delete({
        where: { id: existingFollow.id }
      });

      // Update count
      await db.page.update({
        where: { id: pageId },
        data: { followerCount: { decrement: 1 } }
      });

      return NextResponse.json({ message: 'Page unfollowed', following: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Page follow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check if user follows the page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ following: false });
    }

    const { id: pageId } = await params;

    const follow = await db.pageFollow.findFirst({
      where: { pageId, userId: authUser.userId }
    });

    return NextResponse.json({ following: !!follow });

  } catch (error) {
    console.error('Check page follow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
