import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        coverPhoto: true,
        bio: true,
        currentCity: true,
        hometown: true,
        workplace: true,
        education: true,
        relationshipStatus: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        country: true,
        isVerified: true,
        isAdmin: true,
        isOnline: true,
        isProfileLocked: true,
        badgeType: true,
        language: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            friendships1: true,
            friendships2: true,
            followers: true,
            following: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate friend count
    const friendCount = user._count.friendships1 + user._count.friendships2;

    return NextResponse.json({
      user: {
        ...user,
        friendCount,
        followerCount: user._count.followers,
        followingCount: user._count.following
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
}
