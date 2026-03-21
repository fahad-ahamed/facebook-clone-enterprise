import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get RSVPs for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let where: Record<string, unknown> = { eventId };
    if (status) where.status = status;

    const rsvps = await db.eventRSVP.findMany({
      where,
      include: {
        user: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            avatar: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ rsvps });

  } catch (error) {
    console.error('Get RSVPs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// RSVP to an event
export async function POST(
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
    const { status } = body; // going, interested, not_going

    if (!status || !['going', 'interested', 'not_going'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required (going, interested, not_going)' }, { status: 400 });
    }

    // Check if event exists
    const event = await db.event.findUnique({
      where: { id: eventId, deletedAt: null }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if already RSVPed
    const existingRSVP = await db.eventRSVP.findFirst({
      where: { eventId, userId: authUser.userId }
    });

    if (existingRSVP) {
      // Update existing RSVP
      const oldStatus = existingRSVP.status;
      const updated = await db.eventRSVP.update({
        where: { id: existingRSVP.id },
        data: { status },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Update counts
      if (oldStatus !== status) {
        if (oldStatus === 'going') {
          await db.event.update({
            where: { id: eventId },
            data: { goingCount: { decrement: 1 } }
          });
        } else if (oldStatus === 'interested') {
          await db.event.update({
            where: { id: eventId },
            data: { interestedCount: { decrement: 1 } }
          });
        }

        if (status === 'going') {
          await db.event.update({
            where: { id: eventId },
            data: { goingCount: { increment: 1 } }
          });
        } else if (status === 'interested') {
          await db.event.update({
            where: { id: eventId },
            data: { interestedCount: { increment: 1 } }
          });
        }
      }

      return NextResponse.json({ rsvp: updated });
    }

    // Create new RSVP
    const rsvp = await db.eventRSVP.create({
      data: {
        eventId,
        userId: authUser.userId,
        status
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    // Update counts
    if (status === 'going') {
      await db.event.update({
        where: { id: eventId },
        data: { goingCount: { increment: 1 } }
      });
    } else if (status === 'interested') {
      await db.event.update({
        where: { id: eventId },
        data: { interestedCount: { increment: 1 } }
      });
    }

    return NextResponse.json({ rsvp }, { status: 201 });

  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove RSVP
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

    const rsvp = await db.eventRSVP.findFirst({
      where: { eventId, userId: authUser.userId }
    });

    if (!rsvp) {
      return NextResponse.json({ error: 'RSVP not found' }, { status: 404 });
    }

    const status = rsvp.status;

    await db.eventRSVP.delete({
      where: { id: rsvp.id }
    });

    // Update counts
    if (status === 'going') {
      await db.event.update({
        where: { id: eventId },
        data: { goingCount: { decrement: 1 } }
      });
    } else if (status === 'interested') {
      await db.event.update({
        where: { id: eventId },
        data: { interestedCount: { decrement: 1 } }
      });
    }

    return NextResponse.json({ message: 'RSVP removed' });

  } catch (error) {
    console.error('Remove RSVP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
