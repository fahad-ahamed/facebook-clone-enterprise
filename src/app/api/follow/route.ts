import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get followers or following
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'following';
    const userId = searchParams.get('userId') || authUser?.userId;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (type === 'followers') {
      const followers = await db.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              avatar: true, 
              bio: true,
              isVerified: true 
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      const total = await db.follow.count({
        where: { followingId: userId }
      });

      return NextResponse.json({ 
        followers: followers.map(f => f.follower),
        total,
        hasMore: skip + followers.length < total
      });
    }

    if (type === 'following') {
      const following = await db.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              avatar: true, 
              bio: true,
              isVerified: true 
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      const total = await db.follow.count({
        where: { followerId: userId }
      });

      return NextResponse.json({ 
        following: following.map(f => f.following),
        total,
        hasMore: skip + following.length < total
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Get follow data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Follow/Unfollow user
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, action } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    if (targetUserId === authUser.userId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if blocked
    const blockExists = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: authUser.userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: authUser.userId }
        ]
      }
    });

    if (blockExists) {
      return NextResponse.json({ error: 'Cannot follow this user' }, { status: 403 });
    }

    const existingFollow = await db.follow.findFirst({
      where: {
        followerId: authUser.userId,
        followingId: targetUserId
      }
    });

    if (action === 'follow') {
      if (existingFollow) {
        return NextResponse.json({ error: 'Already following' }, { status: 400 });
      }

      await db.follow.create({
        data: {
          followerId: authUser.userId,
          followingId: targetUserId
        }
      });

      return NextResponse.json({ message: 'Followed successfully', following: true });
    }

    if (action === 'unfollow') {
      if (!existingFollow) {
        return NextResponse.json({ error: 'Not following' }, { status: 400 });
      }

      await db.follow.delete({
        where: { id: existingFollow.id }
      });

      return NextResponse.json({ message: 'Unfollowed successfully', following: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Follow action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
