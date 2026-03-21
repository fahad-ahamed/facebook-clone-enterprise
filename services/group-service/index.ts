/**
 * Group Service
 * Group creation, management, membership, and content
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../../gateway/auth-middleware';

const router = Router();
const prisma = new PrismaClient();

// =====================================================
// Group Management
// =====================================================

/**
 * Create a new group
 * POST /api/v1/groups
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, privacy, coverImage, rules } = req.body;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        privacy: privacy || 'public',
        coverUrl: coverImage,
        rules: rules || [],
        creatorId: userId,
        members: {
          create: {
            userId,
            role: 'creator',
            status: 'active',
          },
        },
      },
      include: {
        members: true,
      },
    });

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    console.error('Group creation error:', error);
    res.status(500).json({ success: false, error: 'GROUP_CREATION_FAILED' });
  }
});

/**
 * Get group by ID
 * GET /api/v1/groups/:id
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: 'active' },
          select: { userId: true, role: true },
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'GROUP_NOT_FOUND' });
    }

    // Check access for private/secret groups
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (group.privacy !== 'public' && !membership) {
      return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
    }

    res.json({ 
      success: true, 
      data: {
        ...group,
        isMember: !!membership,
        userRole: membership?.role,
      },
    });
  } catch (error) {
    console.error('Group fetch error:', error);
    res.status(500).json({ success: false, error: 'GROUP_FETCH_FAILED' });
  }
});

/**
 * Update group
 * PUT /api/v1/groups/:id
 */
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    // Check if user is admin
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!membership || !['creator', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const updated = await prisma.group.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        privacy: updates.privacy,
        coverUrl: updates.coverImage,
        rules: updates.rules,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Group update error:', error);
    res.status(500).json({ success: false, error: 'GROUP_UPDATE_FAILED' });
  }
});

/**
 * Delete group
 * DELETE /api/v1/groups/:id
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!membership || membership.role !== 'creator') {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    await prisma.group.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Group deletion error:', error);
    res.status(500).json({ success: false, error: 'GROUP_DELETION_FAILED' });
  }
});

// =====================================================
// Membership Management
// =====================================================

/**
 * Join group
 * POST /api/v1/groups/:id/join
 */
router.post('/:id/join', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      return res.status(404).json({ success: false, error: 'GROUP_NOT_FOUND' });
    }

    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'ALREADY_MEMBER' });
    }

    // Private groups require approval
    const status = group.privacy === 'private' ? 'pending' : 'active';

    const membership = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId,
        role: 'member',
        status,
      },
    });

    // Update member count
    if (status === 'active') {
      await prisma.group.update({
        where: { id },
        data: { memberCount: { increment: 1 } },
      });
    }

    res.status(201).json({ success: true, data: membership });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ success: false, error: 'JOIN_FAILED' });
  }
});

/**
 * Leave group
 * POST /api/v1/groups/:id/leave
 */
router.post('/:id/leave', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!membership) {
      return res.status(400).json({ success: false, error: 'NOT_MEMBER' });
    }

    if (membership.role === 'creator') {
      return res.status(400).json({ 
        success: false, 
        error: 'CREATOR_CANNOT_LEAVE',
        message: 'Transfer ownership or delete the group instead',
      });
    }

    await prisma.groupMember.delete({
      where: { id: membership.id },
    });

    await prisma.group.update({
      where: { id },
      data: { memberCount: { decrement: 1 } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ success: false, error: 'LEAVE_FAILED' });
  }
});

/**
 * Get group members
 * GET /api/v1/groups/:id/members
 */
router.get('/:id/members', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, page = 1, limit = 20 } = req.query;

    const where: any = { groupId: id, status: 'active' };
    if (role) where.role = role;

    const [members, total] = await Promise.all([
      prisma.groupMember.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'asc' },
        ],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.groupMember.count({ where }),
    ]);

    res.json({
      success: true,
      data: members,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Members fetch error:', error);
    res.status(500).json({ success: false, error: 'MEMBERS_FETCH_FAILED' });
  }
});

/**
 * Update member role
 * PUT /api/v1/groups/:id/members/:memberId/role
 */
router.put('/:id/members/:memberId/role', authenticateUser, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user!.id;

    // Check if requester is admin
    const requesterMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!requesterMembership || !['creator', 'admin'].includes(requesterMembership.role)) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const targetMembership = await prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.groupId !== id) {
      return res.status(404).json({ success: false, error: 'MEMBER_NOT_FOUND' });
    }

    if (targetMembership.role === 'creator') {
      return res.status(400).json({ success: false, error: 'CANNOT_CHANGE_CREATOR_ROLE' });
    }

    const updated = await prisma.groupMember.update({
      where: { id: memberId },
      data: { role },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ success: false, error: 'ROLE_UPDATE_FAILED' });
  }
});

/**
 * Remove member from group
 * DELETE /api/v1/groups/:id/members/:memberId
 */
router.delete('/:id/members/:memberId', authenticateUser, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user!.id;

    const requesterMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });

    if (!requesterMembership || !['creator', 'admin', 'moderator'].includes(requesterMembership.role)) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const targetMembership = await prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.groupId !== id) {
      return res.status(404).json({ success: false, error: 'MEMBER_NOT_FOUND' });
    }

    if (targetMembership.role === 'creator') {
      return res.status(400).json({ success: false, error: 'CANNOT_REMOVE_CREATOR' });
    }

    await prisma.groupMember.delete({ where: { id: memberId } });

    await prisma.group.update({
      where: { id },
      data: { memberCount: { decrement: 1 } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Member removal error:', error);
    res.status(500).json({ success: false, error: 'REMOVAL_FAILED' });
  }
});

/**
 * Get user's groups
 * GET /api/v1/groups
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const [groups, total] = await Promise.all([
      prisma.groupMember.findMany({
        where: { userId, status: 'active' },
        include: {
          group: {
            include: {
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.groupMember.count({ where: { userId, status: 'active' } }),
    ]);

    res.json({
      success: true,
      data: groups.map(m => m.group),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
    });
  } catch (error) {
    console.error('Groups fetch error:', error);
    res.status(500).json({ success: false, error: 'GROUPS_FETCH_FAILED' });
  }
});

/**
 * Search groups
 * GET /api/v1/groups/search
 */
router.get('/search', authenticateUser, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    const groups = await prisma.group.findMany({
      where: {
        name: { contains: q as string, mode: 'insensitive' },
        privacy: { in: ['public', 'private'] },
      },
      include: {
        _count: { select: { members: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: groups });
  } catch (error) {
    console.error('Group search error:', error);
    res.status(500).json({ success: false, error: 'SEARCH_FAILED' });
  }
});

export default router;
