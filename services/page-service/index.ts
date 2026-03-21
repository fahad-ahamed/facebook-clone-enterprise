/**
 * Page Service
 * Page creation, management, followers, and content
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../../gateway/auth-middleware';

const router = Router();
const prisma = new PrismaClient();

// =====================================================
// Page Management
// =====================================================

/**
 * Create a new page
 * POST /api/v1/pages
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, username, description, category, avatarImage, coverImage } = req.body;

    // Check if username is taken
    if (username) {
      const existing = await prisma.page.findUnique({ where: { username } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'USERNAME_TAKEN' });
      }
    }

    const page = await prisma.page.create({
      data: {
        name,
        username,
        description,
        category,
        avatarUrl: avatarImage,
        coverUrl: coverImage,
        creatorId: userId,
        admins: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        admins: true,
      },
    });

    res.status(201).json({ success: true, data: page });
  } catch (error) {
    console.error('Page creation error:', error);
    res.status(500).json({ success: false, error: 'PAGE_CREATION_FAILED' });
  }
});

/**
 * Get page by ID or username
 * GET /api/v1/pages/:identifier
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find by ID or username
    const page = await prisma.page.findFirst({
      where: {
        OR: [
          { id: identifier },
          { username: identifier },
        ],
      },
      include: {
        _count: {
          select: { followers: true, posts: true },
        },
      },
    });

    if (!page) {
      return res.status(404).json({ success: false, error: 'PAGE_NOT_FOUND' });
    }

    res.json({ success: true, data: page });
  } catch (error) {
    console.error('Page fetch error:', error);
    res.status(500).json({ success: false, error: 'PAGE_FETCH_FAILED' });
  }
});

/**
 * Update page
 * PUT /api/v1/pages/:id
 */
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    // Check if user is admin
    const admin = await prisma.pageAdmin.findFirst({
      where: { pageId: id, userId },
    });

    if (!admin) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const updated = await prisma.page.update({
      where: { id },
      data: {
        name: updates.name,
        username: updates.username,
        description: updates.description,
        category: updates.category,
        avatarUrl: updates.avatarImage,
        coverUrl: updates.coverImage,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Page update error:', error);
    res.status(500).json({ success: false, error: 'PAGE_UPDATE_FAILED' });
  }
});

/**
 * Delete page
 * DELETE /api/v1/pages/:id
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const admin = await prisma.pageAdmin.findFirst({
      where: { pageId: id, userId, role: 'owner' },
    });

    if (!admin) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    await prisma.page.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Page deletion error:', error);
    res.status(500).json({ success: false, error: 'PAGE_DELETION_FAILED' });
  }
});

// =====================================================
// Page Followers
// =====================================================

/**
 * Follow page
 * POST /api/v1/pages/:id/follow
 */
router.post('/:id/follow', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.pageFollow.findUnique({
      where: { pageId_userId: { pageId: id, userId } },
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'ALREADY_FOLLOWING' });
    }

    await prisma.$transaction([
      prisma.pageFollow.create({
        data: { pageId: id, userId },
      }),
      prisma.page.update({
        where: { id },
        data: { followerCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, error: 'FOLLOW_FAILED' });
  }
});

/**
 * Unfollow page
 * DELETE /api/v1/pages/:id/follow
 */
router.delete('/:id/follow', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const follow = await prisma.pageFollow.findUnique({
      where: { pageId_userId: { pageId: id, userId } },
    });

    if (!follow) {
      return res.status(400).json({ success: false, error: 'NOT_FOLLOWING' });
    }

    await prisma.$transaction([
      prisma.pageFollow.delete({ where: { id: follow.id } }),
      prisma.page.update({
        where: { id },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ success: false, error: 'UNFOLLOW_FAILED' });
  }
});

/**
 * Get page followers
 * GET /api/v1/pages/:id/followers
 */
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const followers = await prisma.pageFollow.findMany({
      where: { pageId: id },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: followers.map(f => f.user) });
  } catch (error) {
    console.error('Followers fetch error:', error);
    res.status(500).json({ success: false, error: 'FOLLOWERS_FETCH_FAILED' });
  }
});

// =====================================================
// Page Admins
// =====================================================

/**
 * Add page admin
 * POST /api/v1/pages/:id/admins
 */
router.post('/:id/admins', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: newAdminId, role } = req.body;
    const userId = req.user!.id;

    // Check if requester is owner
    const admin = await prisma.pageAdmin.findFirst({
      where: { pageId: id, userId, role: 'owner' },
    });

    if (!admin) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const newAdmin = await prisma.pageAdmin.create({
      data: { pageId: id, userId: newAdminId, role: role || 'admin' },
    });

    res.status(201).json({ success: true, data: newAdmin });
  } catch (error) {
    console.error('Admin add error:', error);
    res.status(500).json({ success: false, error: 'ADMIN_ADD_FAILED' });
  }
});

/**
 * Remove page admin
 * DELETE /api/v1/pages/:id/admins/:adminId
 */
router.delete('/:id/admins/:adminId', authenticateUser, async (req, res) => {
  try {
    const { id, adminId } = req.params;
    const userId = req.user!.id;

    const admin = await prisma.pageAdmin.findFirst({
      where: { pageId: id, userId, role: 'owner' },
    });

    if (!admin) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    await prisma.pageAdmin.delete({ where: { id: adminId } });

    res.json({ success: true });
  } catch (error) {
    console.error('Admin remove error:', error);
    res.status(500).json({ success: false, error: 'ADMIN_REMOVE_FAILED' });
  }
});

/**
 * Get page admins
 * GET /api/v1/pages/:id/admins
 */
router.get('/:id/admins', async (req, res) => {
  try {
    const { id } = req.params;

    const admins = await prisma.pageAdmin.findMany({
      where: { pageId: id },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Admins fetch error:', error);
    res.status(500).json({ success: false, error: 'ADMINS_FETCH_FAILED' });
  }
});

/**
 * Search pages
 * GET /api/v1/pages/search
 */
router.get('/search', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q as string, mode: 'insensitive' } },
        { username: { contains: q as string, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const pages = await prisma.page.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: pages });
  } catch (error) {
    console.error('Page search error:', error);
    res.status(500).json({ success: false, error: 'SEARCH_FAILED' });
  }
});

export default router;
