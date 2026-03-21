import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get pages
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

    if (type === 'liked' && authUser) {
      const likes = await db.pageLike.findMany({
        where: { userId: authUser.userId },
        include: { 
          page: {
            include: {
              _count: { select: { likes: true, followers: true } }
            }
          } 
        }
      });
      return NextResponse.json({ pages: likes.map(l => l.page) });
    }

    if (type === 'admin' && authUser) {
      where.ownerId = authUser.userId;
    }

    const pages = await db.page.findMany({
      where,
      include: {
        _count: { select: { likes: true, followers: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({ pages });

  } catch (error) {
    console.error('Get pages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create page
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, username, description, category, pageType, 
      coverPhoto, avatar, phone, email, website, address, city, country 
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Page name is required' }, { status: 400 });
    }

    const page = await db.page.create({
      data: {
        name,
        username: username || null,
        description: description || null,
        category: category || null,
        pageType: pageType || 'business',
        coverPhoto: coverPhoto || null,
        avatar: avatar || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        city: city || null,
        country: country || null,
        ownerId: authUser.userId
      }
    });

    return NextResponse.json({ page }, { status: 201 });

  } catch (error) {
    console.error('Create page error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
