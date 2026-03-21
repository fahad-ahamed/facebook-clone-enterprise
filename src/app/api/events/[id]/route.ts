import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const authUser = await getAuthUser(request);

    const event = await db.event.findUnique({
      where: { id: eventId, deletedAt: null },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        page: {
          select: { id: true, name: true, avatar: true }
        },
        rsvps: authUser ? {
          where: { userId: authUser.userId },
          select: { status: true }
        } : false
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check visibility
    if (event.visibility === 'private') {
      if (!authUser) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
      }

      // Check if user is invited or creator
      const isCreator = event.creatorId === authUser.userId;
      const hasRSVP = event.rsvps && event.rsvps.length > 0;

      if (!isCreator && !hasRSVP) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    return NextResponse.json({ 
      event: {
        ...event,
        userRSVP: event.rsvps?.[0]?.status || null
      }
    });

  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json();

    // Check if user is creator
    const event = await db.event.findUnique({
      where: { id: eventId, deletedAt: null }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.creatorId !== authUser.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const {
      title,
      description,
      coverPhoto,
      startDate,
      endDate,
      isAllDay,
      timezone,
      isOnline,
      onlineUrl,
      location,
      street,
      city,
      state,
      country,
      visibility,
      category,
      ticketUrl,
      price,
      allowGuestInvites,
      allowGuestPosts
    } = body;

    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: {
        title: title || undefined,
        description: description || undefined,
        coverPhoto: coverPhoto || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isAllDay: isAllDay ?? undefined,
        timezone: timezone || undefined,
        isOnline: isOnline ?? undefined,
        onlineUrl: onlineUrl || undefined,
        location: location || undefined,
        street: street || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        visibility: visibility || undefined,
        category: category || undefined,
        ticketUrl: ticketUrl || undefined,
        price: price || undefined,
        allowGuestInvites: allowGuestInvites ?? undefined,
        allowGuestPosts: allowGuestPosts ?? undefined
      }
    });

    return NextResponse.json({ event: updatedEvent });

  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: eventId } = await params;

    // Check if user is creator
    const event = await db.event.findUnique({
      where: { id: eventId, deletedAt: null }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.creatorId !== authUser.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ message: 'Event deleted' });

  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
