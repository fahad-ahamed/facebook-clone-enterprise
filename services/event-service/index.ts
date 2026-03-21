/**
 * Event Service
 * Event creation, management, RSVPs, and reminders
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../../gateway/auth-middleware';

const router = Router();
const prisma = new PrismaClient();

// =====================================================
// Event Management
// =====================================================

/**
 * Create a new event
 * POST /api/v1/events
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      description,
      coverImage,
      startTime,
      endTime,
      location,
      latitude,
      longitude,
      isOnline,
      onlineUrl,
      privacy,
      groupId,
    } = req.body;

    const event = await prisma.event.create({
      data: {
        name,
        description,
        coverUrl: coverImage,
        creatorId: userId,
        groupId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location,
        latitude,
        longitude,
        isOnline: isOnline || false,
        onlineUrl,
        privacy: privacy || 'public',
        rsvps: {
          create: {
            userId,
            status: 'going',
          },
        },
      },
      include: {
        rsvps: true,
      },
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ success: false, error: 'EVENT_CREATION_FAILED' });
  }
});

/**
 * Get event by ID
 * GET /api/v1/events/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        group: true,
        _count: {
          select: { rsvps: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
    }

    // Check access for private events
    if (event.privacy === 'private' && event.groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: event.groupId, userId } },
      });
      if (!membership) {
        return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
      }
    }

    // Get user's RSVP status
    let userRsvp = null;
    if (userId) {
      userRsvp = await prisma.eventRsvp.findUnique({
        where: { eventId_userId: { eventId: id, userId } },
      });
    }

    res.json({
      success: true,
      data: {
        ...event,
        userRsvp: userRsvp?.status,
      },
    });
  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({ success: false, error: 'EVENT_FETCH_FAILED' });
  }
});

/**
 * Update event
 * PUT /api/v1/events/:id
 */
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
    }

    if (event.creatorId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        coverUrl: updates.coverImage,
        startTime: updates.startTime ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
        location: updates.location,
        latitude: updates.latitude,
        longitude: updates.longitude,
        isOnline: updates.isOnline,
        onlineUrl: updates.onlineUrl,
        privacy: updates.privacy,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({ success: false, error: 'EVENT_UPDATE_FAILED' });
  }
});

/**
 * Delete event
 * DELETE /api/v1/events/:id
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
    }

    if (event.creatorId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    await prisma.event.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Event deletion error:', error);
    res.status(500).json({ success: false, error: 'EVENT_DELETION_FAILED' });
  }
});

// =====================================================
// Event RSVPs
// =====================================================

/**
 * RSVP to event
 * POST /api/v1/events/:id/rsvp
 */
router.post('/:id/rsvp', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // going, interested, not_going
    const userId = req.user!.id;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
    }

    // Check if event is in the past
    if (new Date(event.startTime) < new Date()) {
      return res.status(400).json({ success: false, error: 'EVENT_PAST' });
    }

    const existing = await prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (existing) {
      // Update existing RSVP
      const oldStatus = existing.status;
      const updated = await prisma.eventRsvp.update({
        where: { id: existing.id },
        data: { status },
      });

      // Update counts
      await updateEventCounts(id, oldStatus, status);

      res.json({ success: true, data: updated });
    } else {
      // Create new RSVP
      const rsvp = await prisma.eventRsvp.create({
        data: { eventId: id, userId, status },
      });

      // Update counts
      await prisma.event.update({
        where: { id },
        data: {
          goingCount: status === 'going' ? { increment: 1 } : undefined,
          interestedCount: status === 'interested' ? { increment: 1 } : undefined,
        },
      });

      res.status(201).json({ success: true, data: rsvp });
    }
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ success: false, error: 'RSVP_FAILED' });
  }
});

/**
 * Remove RSVP
 * DELETE /api/v1/events/:id/rsvp
 */
router.delete('/:id/rsvp', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const rsvp = await prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
    });

    if (!rsvp) {
      return res.status(400).json({ success: false, error: 'NO_RSVP' });
    }

    await prisma.eventRsvp.delete({ where: { id: rsvp.id } });

    // Update counts
    await prisma.event.update({
      where: { id },
      data: {
        goingCount: rsvp.status === 'going' ? { decrement: 1 } : undefined,
        interestedCount: rsvp.status === 'interested' ? { decrement: 1 } : undefined,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('RSVP removal error:', error);
    res.status(500).json({ success: false, error: 'RSVP_REMOVAL_FAILED' });
  }
});

/**
 * Get event attendees
 * GET /api/v1/events/:id/attendees
 */
router.get('/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const where: any = { eventId: id };
    if (status) where.status = status;

    const rsvps = await prisma.eventRsvp.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: rsvps.map(r => ({ ...r.user, status: r.status })),
    });
  } catch (error) {
    console.error('Attendees fetch error:', error);
    res.status(500).json({ success: false, error: 'ATTENDEES_FETCH_FAILED' });
  }
});

/**
 * Get upcoming events
 * GET /api/v1/events/upcoming
 */
router.get('/upcoming', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const events = await prisma.event.findMany({
      where: {
        startTime: { gte: new Date() },
        OR: [
          { privacy: 'public' },
          { rsvps: { some: { userId } } },
        ],
      },
      include: {
        creator: {
          select: { id: true, username: true, fullName: true },
        },
        _count: { select: { rsvps: true } },
      },
      orderBy: { startTime: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Upcoming events fetch error:', error);
    res.status(500).json({ success: false, error: 'EVENTS_FETCH_FAILED' });
  }
});

/**
 * Get user's events
 * GET /api/v1/events
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    const where: any = {
      rsvps: { some: { userId } },
    };
    if (status) where.rsvps.some.status = status;

    const events = await prisma.event.findMany({
      where,
      include: {
        creator: {
          select: { id: true, username: true, fullName: true },
        },
        rsvps: {
          where: { userId },
          select: { status: true },
        },
      },
      orderBy: { startTime: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: events.map(e => ({
        ...e,
        userStatus: e.rsvps[0]?.status,
      })),
    });
  } catch (error) {
    console.error('User events fetch error:', error);
    res.status(500).json({ success: false, error: 'EVENTS_FETCH_FAILED' });
  }
});

// Helper function
async function updateEventCounts(eventId: string, oldStatus: string, newStatus: string) {
  const updates: any = {};

  if (oldStatus === 'going') updates.goingCount = { decrement: 1 };
  if (oldStatus === 'interested') updates.interestedCount = { decrement: 1 };
  if (newStatus === 'going') updates.goingCount = { increment: 1 };
  if (newStatus === 'interested') updates.interestedCount = { increment: 1 };

  await prisma.event.update({
    where: { id: eventId },
    data: updates,
  });
}

export default router;
