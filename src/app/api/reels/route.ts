import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get reels
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'feed';
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = { deletedAt: null };

    if (type === 'user' && userId) {
      where.userId = userId;
    }

    if (type === 'following' && authUser) {
      const follows = await db.follow.findMany({
        where: { followerId: authUser.userId },
        select: { followingId: true }
      });
      const followingIds = follows.map(f => f.followingId);
      where.userId = { in: [...followingIds, authUser.userId] };
    }

    const reels = await db.reel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            avatar: true, 
            isVerified: true,
            isOnline: true 
          }
        },
        comments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          where: { deletedAt: null }
        }
      }
    });

    return NextResponse.json({ reels });

  } catch (error) {
    console.error('Get reels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create reel
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      videoUrl,
      thumbnailUrl,
      duration,
      caption,
      audio,
      effects,
      stickers,
      textOverlays,
      drawings,
      visibility = 'public',
      allowComments = true,
      allowDuets = true,
      allowRemix = true
    } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    const reel = await db.reel.create({
      data: {
        userId: authUser.userId,
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration || null,
        caption: caption || null,
        audio: audio ? JSON.stringify(audio) : null,
        effects: effects ? JSON.stringify(effects) : null,
        stickers: stickers ? JSON.stringify(stickers) : null,
        textOverlays: textOverlays ? JSON.stringify(textOverlays) : null,
        drawings: drawings ? JSON.stringify(drawings) : null,
        visibility,
        allowComments,
        allowDuets,
        allowRemix
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, isVerified: true }
        }
      }
    });

    return NextResponse.json({ reel }, { status: 201 });

  } catch (error) {
    console.error('Create reel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete reel
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reelId = searchParams.get('id');

    if (!reelId) {
      return NextResponse.json({ error: 'Reel ID is required' }, { status: 400 });
    }

    const reel = await db.reel.findFirst({
      where: { id: reelId, userId: authUser.userId }
    });

    if (!reel) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 });
    }

    await db.reel.update({
      where: { id: reelId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ message: 'Reel deleted' });

  } catch (error) {
    console.error('Delete reel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
