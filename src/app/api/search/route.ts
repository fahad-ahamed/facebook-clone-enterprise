import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Global search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // all, users, posts, groups, pages, events, marketplace

    if (!query) {
      return NextResponse.json({ results: {} });
    }

    const results: Record<string, unknown[]> = {};

    if (type === 'all' || type === 'users') {
      results.users = await db.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { username: { contains: query } }
          ],
          deletedAt: null
        },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true,
          currentCity: true
        }
      });
    }

    if (type === 'all' || type === 'posts') {
      results.posts = await db.post.findMany({
        where: {
          content: { contains: query },
          deletedAt: null
        },
        take: 5,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });
    }

    if (type === 'all' || type === 'groups') {
      results.groups = await db.group.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } }
          ],
          deletedAt: null
        },
        take: 5,
        select: {
          id: true,
          name: true,
          avatar: true,
          memberCount: true
        }
      });
    }

    if (type === 'all' || type === 'pages') {
      results.pages = await db.page.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } }
          ],
          deletedAt: null
        },
        take: 5,
        select: {
          id: true,
          name: true,
          avatar: true,
          likeCount: true
        }
      });
    }

    if (type === 'all' || type === 'events') {
      results.events = await db.event.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } }
          ],
          deletedAt: null
        },
        take: 5,
        select: {
          id: true,
          title: true,
          coverPhoto: true,
          startDate: true,
          location: true
        }
      });
    }

    if (type === 'all' || type === 'marketplace') {
      results.marketplace = await db.marketplaceListing.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } }
          ],
          status: 'available',
          deletedAt: null
        },
        take: 5,
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          images: true,
          location: true
        }
      });
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
