import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get events
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'upcoming';
    const query = searchParams.get('q');

    let where: Record<string, unknown> = { deletedAt: null };

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } }
      ];
    }

    if (type === 'upcoming') {
      where.startDate = { gte: new Date() };
    } else if (type === 'past') {
      where.startDate = { lt: new Date() };
    } else if (type === 'going' && authUser) {
      const rsvps = await db.eventRSVP.findMany({
        where: { userId: authUser.userId, status: 'going' },
        include: { 
          event: {
            include: {
              creator: {
                select: { id: true, firstName: true, lastName: true, avatar: true }
              },
              _count: { select: { rsvps: true } }
            }
          } 
        }
      });
      return NextResponse.json({ events: rsvps.map(r => r.event) });
    } else if (type === 'interested' && authUser) {
      const rsvps = await db.eventRSVP.findMany({
        where: { userId: authUser.userId, status: 'interested' },
        include: { 
          event: {
            include: {
              creator: {
                select: { id: true, firstName: true, lastName: true, avatar: true }
              },
              _count: { select: { rsvps: true } }
            }
          } 
        }
      });
      return NextResponse.json({ events: rsvps.map(r => r.event) });
    } else if (type === 'hosting' && authUser) {
      where.creatorId = authUser.userId;
    }

    const events = await db.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take: 20,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        _count: { select: { rsvps: true } }
      }
    });

    return NextResponse.json({ events });

  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create event
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, description, coverPhoto, startDate, endDate, isAllDay, timezone,
      isOnline, onlineUrl, location, street, city, state, country,
      visibility, category, ticketUrl, price
    } = body;

    if (!title || !startDate) {
      return NextResponse.json({ error: 'Title and start date are required' }, { status: 400 });
    }

    const event = await db.event.create({
      data: {
        title,
        description: description || null,
        coverPhoto: coverPhoto || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isAllDay: isAllDay || false,
        timezone: timezone || null,
        isOnline: isOnline || false,
        onlineUrl: onlineUrl || null,
        location: location || null,
        street: street || null,
        city: city || null,
        state: state || null,
        country: country || null,
        visibility: visibility || 'public',
        category: category || null,
        ticketUrl: ticketUrl || null,
        price: price || null,
        creatorId: authUser.userId,
        hostType: 'user',
        hostId: authUser.userId
      }
    });

    return NextResponse.json({ event }, { status: 201 });

  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
