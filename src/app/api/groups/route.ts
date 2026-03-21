import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get groups
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const query = searchParams.get('q');

    let where: Record<string, unknown> = { deletedAt: null };

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { description: { contains: query } }
      ];
    }

    if (type === 'joined' && authUser) {
      const memberships = await db.groupMember.findMany({
        where: { userId: authUser.userId },
        include: {
          group: {
            include: {
              _count: { select: { members: true, posts: true } }
            }
          }
        }
      });
      return NextResponse.json({ groups: memberships.map(m => m.group) });
    }

    if (type === 'admin' && authUser) {
      where.creatorId = authUser.userId;
    }

    const groups = await db.group.findMany({
      where,
      include: {
        _count: { select: { members: true, posts: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({ groups });

  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create group
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, type, category, location, coverPhoto, avatar } = body;

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const group = await db.group.create({
      data: {
        name,
        description: description || null,
        type: type || 'public',
        category: category || null,
        location: location || null,
        coverPhoto: coverPhoto || null,
        avatar: avatar || null,
        creatorId: authUser.userId,
        memberCount: 1
      }
    });

    // Add creator as admin member
    await db.groupMember.create({
      data: {
        groupId: group.id,
        userId: authUser.userId,
        role: 'admin'
      }
    });

    return NextResponse.json({ group }, { status: 201 });

  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
