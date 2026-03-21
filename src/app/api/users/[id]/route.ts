import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const authUser = await getAuthUser(request);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        avatar: true,
        coverPhoto: true,
        bio: true,
        currentCity: true,
        hometown: true,
        workplace: true,
        education: true,
        relationshipStatus: true,
        isVerified: true,
        isOnline: true,
        lastActive: true,
        createdAt: true,
        // Privacy fields - only show if not the user
        ...(authUser?.userId !== userId ? {
          email: false,
          // Check profile visibility
        } : {}),
        _count: {
          select: {
            posts: { where: { deletedAt: null } },
            friendships1: true,
            friendships2: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate friend count
    const friendCount = user._count.friendships1 + user._count.friendships2;

    // Check if current user is friends with this user
    let isFriend = false;
    let hasPendingRequest = false;
    
    if (authUser && authUser.userId !== userId) {
      const friendship = await db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: authUser.userId, user2Id: userId },
            { user1Id: userId, user2Id: authUser.userId }
          ]
        }
      });
      isFriend = !!friendship;

      const request = await db.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: authUser.userId, receiverId: userId, status: 'pending' },
            { senderId: userId, receiverId: authUser.userId, status: 'pending' }
          ]
        }
      });
      hasPendingRequest = !!request;
    }

    // Check if blocked
    let isBlocked = false;
    if (authUser && authUser.userId !== userId) {
      const block = await db.block.findFirst({
        where: {
          OR: [
            { blockerId: authUser.userId, blockedId: userId },
            { blockerId: userId, blockedId: authUser.userId }
          ]
        }
      });
      isBlocked = !!block;
    }

    // Check if following
    let isFollowing = false;
    if (authUser && authUser.userId !== userId) {
      const follow = await db.follow.findFirst({
        where: { followerId: authUser.userId, followingId: userId }
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({
      user: {
        ...user,
        friendCount,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        postCount: user._count.posts,
        isFriend,
        hasPendingRequest,
        isBlocked,
        isFollowing
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
