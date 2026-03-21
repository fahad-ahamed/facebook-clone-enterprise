import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Search users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    const users = await db.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { username: { contains: query } }
        ],
        deletedAt: null
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        currentCity: true,
        country: true,
        isVerified: true,
        badgeType: true,
        isOnline: true
      }
    });

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update current user
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      username,
      bio,
      currentCity,
      hometown,
      workplace,
      education,
      relationshipStatus,
      phone,
      gender,
      dateOfBirth,
      avatar,
      coverPhoto,
      language,
      theme,
      country,
      isProfileLocked
    } = body;

    // Check username uniqueness if username is being changed
    if (username) {
      const existingUser = await db.user.findFirst({
        where: {
          username: username.toLowerCase(),
          NOT: { id: authUser.userId }
        }
      });
      if (existingUser) {
        return NextResponse.json({ error: 'Username is already taken', field: 'username' }, { status: 400 });
      }
    }

    const updatedUser = await db.user.update({
      where: { id: authUser.userId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username ? username.toLowerCase() : undefined,
        bio: bio || undefined,
        currentCity: currentCity || undefined,
        hometown: hometown || undefined,
        workplace: workplace || undefined,
        education: education || undefined,
        relationshipStatus: relationshipStatus || undefined,
        phone: phone || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        avatar: avatar || undefined,
        coverPhoto: coverPhoto || undefined,
        language: language || undefined,
        theme: theme || undefined,
        country: country || undefined,
        isProfileLocked: isProfileLocked !== undefined ? isProfileLocked : undefined
      },
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
        gender: true,
        dateOfBirth: true,
        country: true,
        isVerified: true,
        isAdmin: true,
        isProfileLocked: true,
        badgeType: true,
        language: true,
        theme: true
      }
    });

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
