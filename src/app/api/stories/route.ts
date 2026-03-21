import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get stories
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'feed';
    const userId = searchParams.get('userId');

    // Get current time for non-expired stories
    const now = new Date();

    if (type === 'feed') {
      // If not authenticated, return empty stories
      if (!authUser) {
        return NextResponse.json({ stories: [] });
      }

      // Get friends' IDs
      const friendships = await db.friendship.findMany({
        where: {
          OR: [
            { user1Id: authUser.userId },
            { user2Id: authUser.userId }
          ]
        }
      });

      const friendIds = friendships.map(f => 
        f.user1Id === authUser.userId ? f.user2Id : f.user1Id
      );

      // Include own stories and friends' stories
      const userIds = [authUser.userId, ...friendIds];

      const stories = await db.story.findMany({
        where: {
          userId: { in: userIds },
          deletedAt: null,
          expiresAt: { gt: now }
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          viewers: {
            where: { userId: authUser.userId },
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Group stories by user
      const groupedStories = stories.reduce((acc: Record<string, { user: typeof stories[0]['user']; stories: Array<typeof stories[0] & { isViewed: boolean }> }>, story) => {
        const userId = story.userId;
        if (!acc[userId]) {
          acc[userId] = {
            user: story.user,
            stories: []
          };
        }
        acc[userId].stories.push({
          ...story,
          isViewed: story.viewers.length > 0
        });
        return acc;
      }, {});

      return NextResponse.json({ stories: Object.values(groupedStories) });
    }

    if (type === 'user' && userId) {
      const stories = await db.story.findMany({
        where: {
          userId,
          deletedAt: null,
          expiresAt: { gt: now }
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          viewers: authUser ? {
            where: { userId: authUser.userId },
            select: { id: true }
          } : false
        },
        orderBy: { createdAt: 'asc' }
      });

      const storiesWithViewed = stories.map(s => ({
        ...s,
        isViewed: s.viewers?.length > 0
      }));

      return NextResponse.json({ stories: storiesWithViewed });
    }

    if (type === 'my' && authUser) {
      const stories = await db.story.findMany({
        where: {
          userId: authUser.userId,
          deletedAt: null,
          expiresAt: { gt: now }
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          viewers: {
            select: { id: true, userId: true, viewedAt: true, reaction: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ stories });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Get stories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create story
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      mediaType,
      mediaUrl,
      thumbnailUrl,
      caption,
      stickers,
      drawings,
      textOverlays,
      filters,
      music,
      visibility = 'friends',
      excludedUsers
    } = body;

    if (!mediaUrl || !mediaType) {
      return NextResponse.json({ error: 'Media URL and type are required' }, { status: 400 });
    }

    // Stories expire after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await db.story.create({
      data: {
        userId: authUser.userId,
        mediaType,
        mediaUrl,
        thumbnailUrl: thumbnailUrl || null,
        caption: caption || null,
        stickers: stickers ? JSON.stringify(stickers) : null,
        drawings: drawings ? JSON.stringify(drawings) : null,
        textOverlays: textOverlays ? JSON.stringify(textOverlays) : null,
        filters: filters || null,
        music: music ? JSON.stringify(music) : null,
        visibility,
        excludedUsers: excludedUsers ? JSON.stringify(excludedUsers) : null,
        expiresAt
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    return NextResponse.json({ story }, { status: 201 });

  } catch (error) {
    console.error('Create story error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete story
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('id');

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    const story = await db.story.findFirst({
      where: { id: storyId, userId: authUser.userId }
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    await db.story.update({
      where: { id: storyId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ message: 'Story deleted' });

  } catch (error) {
    console.error('Delete story error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
