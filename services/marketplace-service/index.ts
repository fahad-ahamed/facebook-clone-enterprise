/**
 * Marketplace Service
 * Buying, selling, listings, and transactions
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../../gateway/auth-middleware';

const router = Router();
const prisma = new PrismaClient();

// =====================================================
// Listing Management
// =====================================================

/**
 * Create a new listing
 * POST /api/v1/marketplace
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      title,
      description,
      price,
      currency,
      category,
      condition,
      location,
      latitude,
      longitude,
      images,
    } = req.body;

    const listing = await prisma.marketplaceListing.create({
      data: {
        sellerId: userId,
        title,
        description,
        price,
        currency: currency || 'USD',
        category,
        condition,
        location,
        latitude,
        longitude,
        status: 'available',
        images: {
          create: images?.map((url: string, index: number) => ({
            url,
            position: index,
          })) || [],
        },
      },
      include: {
        images: true,
      },
    });

    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    console.error('Listing creation error:', error);
    res.status(500).json({ success: false, error: 'LISTING_CREATION_FAILED' });
  }
});

/**
 * Get listing by ID
 * GET /api/v1/marketplace/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        images: { orderBy: { position: 'asc' } },
      },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'LISTING_NOT_FOUND' });
    }

    // Increment view count
    await prisma.marketplaceListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ success: true, data: listing });
  } catch (error) {
    console.error('Listing fetch error:', error);
    res.status(500).json({ success: false, error: 'LISTING_FETCH_FAILED' });
  }
});

/**
 * Update listing
 * PUT /api/v1/marketplace/:id
 */
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'LISTING_NOT_FOUND' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data: {
        title: updates.title,
        description: updates.description,
        price: updates.price,
        currency: updates.currency,
        category: updates.category,
        condition: updates.condition,
        location: updates.location,
        latitude: updates.latitude,
        longitude: updates.longitude,
        status: updates.status,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Listing update error:', error);
    res.status(500).json({ success: false, error: 'LISTING_UPDATE_FAILED' });
  }
});

/**
 * Delete listing
 * DELETE /api/v1/marketplace/:id
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'LISTING_NOT_FOUND' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    await prisma.marketplaceListing.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Listing deletion error:', error);
    res.status(500).json({ success: false, error: 'LISTING_DELETION_FAILED' });
  }
});

/**
 * Search listings
 * GET /api/v1/marketplace/search
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q,
      category,
      condition,
      minPrice,
      maxPrice,
      location,
      radius,
      lat,
      lon,
      sort = 'recent',
      page = 1,
      limit = 20,
    } = req.query;

    const where: any = { status: 'available' };

    if (q) {
      where.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (condition) where.condition = condition;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (location) where.location = { contains: location as string, mode: 'insensitive' };

    // Geo query would be more complex in production
    // This is a simplified version

    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'price_low':
        orderBy = { price: 'asc' };
        break;
      case 'price_high':
        orderBy = { price: 'desc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        include: {
          seller: {
            select: { id: true, username: true, fullName: true, avatarUrl: true },
          },
          images: { take: 1, orderBy: { position: 'asc' } },
        },
        orderBy,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'SEARCH_FAILED' });
  }
});

/**
 * Get seller's listings
 * GET /api/v1/marketplace/seller/:sellerId
 */
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const where: any = { sellerId };
    if (status) where.status = status;

    const listings = await prisma.marketplaceListing.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: listings });
  } catch (error) {
    console.error('Seller listings fetch error:', error);
    res.status(500).json({ success: false, error: 'LISTINGS_FETCH_FAILED' });
  }
});

/**
 * Mark listing as sold
 * POST /api/v1/marketplace/:id/sold
 */
router.post('/:id/sold', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { buyerId } = req.body;
    const userId = req.user!.id;

    const listing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ success: false, error: 'LISTING_NOT_FOUND' });
    }

    if (listing.sellerId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data: { status: 'sold' },
    });

    // Create notification for buyer if specified
    if (buyerId) {
      await prisma.notification.create({
        data: {
          userId: buyerId,
          type: 'marketplace_purchase',
          content: `You purchased "${listing.title}"`,
          data: { listingId: id },
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Mark sold error:', error);
    res.status(500).json({ success: false, error: 'MARK_SOLD_FAILED' });
  }
});

/**
 * Get categories
 * GET /api/v1/marketplace/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.marketplaceListing.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'available' },
    });

    res.json({
      success: true,
      data: categories.map(c => ({
        name: c.category,
        count: c._count.id,
      })),
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ success: false, error: 'CATEGORIES_FETCH_FAILED' });
  }
});

/**
 * Get user's saved listings
 * GET /api/v1/marketplace/saved
 */
router.get('/saved', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const saved = await prisma.savedListing.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            images: { take: 1 },
            seller: { select: { id: true, username: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: saved.map(s => s.listing) });
  } catch (error) {
    console.error('Saved listings fetch error:', error);
    res.status(500).json({ success: false, error: 'SAVED_FETCH_FAILED' });
  }
});

/**
 * Save/unsave listing
 * POST /api/v1/marketplace/:id/save
 */
router.post('/:id/save', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.savedListing.findUnique({
      where: { userId_listingId: { userId, listingId: id } },
    });

    if (existing) {
      await prisma.savedListing.delete({ where: { id: existing.id } });
      res.json({ success: true, saved: false });
    } else {
      await prisma.savedListing.create({
        data: { userId, listingId: id },
      });
      res.json({ success: true, saved: true });
    }
  } catch (error) {
    console.error('Save listing error:', error);
    res.status(500).json({ success: false, error: 'SAVE_FAILED' });
  }
});

export default router;
