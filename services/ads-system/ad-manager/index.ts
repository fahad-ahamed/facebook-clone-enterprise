/**
 * Ads System - Ad Manager Service
 * Manages ad campaigns, creative assets, and targeting
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser, requirePermission } from '../../gateway/auth-middleware';

const router = Router();
const prisma = new PrismaClient();

// ==================== Campaign Management ====================

interface CreateCampaignDTO {
  name: string;
  objective: 'AWARENESS' | 'TRAFFIC' | 'ENGAGEMENT' | 'LEADS' | 'APP_PROMOTION' | 'SALES';
  budget: {
    daily?: number;
    lifetime?: number;
    currency: string;
  };
  schedule: {
    startDate: Date;
    endDate?: Date;
  };
  targeting: TargetingCriteria;
  creative: CreativeDTO;
}

interface TargetingCriteria {
  ageMin?: number;
  ageMax?: number;
  genders?: ('male' | 'female' | 'all')[];
  locations?: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
  };
  interests?: string[];
  behaviors?: string[];
  connections?: {
    type: 'friends_of_page' | 'page_fans' | 'app_users';
    targetId: string;
  }[];
  customAudiences?: string[];
  lookalikes?: {
    sourceId: string;
    similarity: number;
  }[];
}

interface CreativeDTO {
  type: 'image' | 'video' | 'carousel' | 'collection';
  media: {
    url: string;
    thumbnail?: string;
  }[];
  headline: string;
  description: string;
  callToAction: 'LEARN_MORE' | 'SHOP_NOW' | 'SIGN_UP' | 'DOWNLOAD' | 'CONTACT_US' | 'BOOK_NOW';
  destinationUrl: string;
}

/**
 * Create a new ad campaign
 * POST /api/v1/ads/campaigns
 */
router.post('/campaigns', authenticateUser, async (req, res) => {
  try {
    const advertiserId = req.user!.id;
    const data: CreateCampaignDTO = req.body;

    // Validate advertiser has payment method
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: advertiserId },
      include: { paymentMethods: true },
    });

    if (!advertiser || advertiser.paymentMethods.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'PAYMENT_METHOD_REQUIRED',
        message: 'Please add a payment method before creating campaigns',
      });
    }

    // Create campaign with all related entities
    const campaign = await prisma.adCampaign.create({
      data: {
        advertiserId: advertiser.id,
        name: data.name,
        objective: data.objective,
        status: 'DRAFT',
        dailyBudget: data.budget.daily,
        lifetimeBudget: data.budget.lifetime,
        currency: data.budget.currency,
        startDate: data.schedule.startDate,
        endDate: data.schedule.endDate,
        targeting: JSON.stringify(data.targeting),
        adSets: {
          create: {
            name: `${data.name} - Ad Set`,
            targeting: JSON.stringify(data.targeting),
            ads: {
              create: {
                creative: JSON.stringify(data.creative),
                status: 'DRAFT',
              },
            },
          },
        },
      },
      include: {
        adSets: {
          include: { ads: true },
        },
      },
    });

    // Emit event for real-time bidding system
    await publishEvent('campaign.created', {
      campaignId: campaign.id,
      advertiserId: advertiser.id,
      budget: data.budget,
      targeting: data.targeting,
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({
      success: false,
      error: 'CAMPAIGN_CREATION_FAILED',
    });
  }
});

/**
 * Update campaign
 * PUT /api/v1/ads/campaigns/:id
 */
router.put('/campaigns/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const campaign = await prisma.adCampaign.findFirst({
      where: {
        id,
        advertiser: { userId: req.user!.id },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'CAMPAIGN_NOT_FOUND',
      });
    }

    // Check if campaign can be edited
    if (campaign.status === 'ARCHIVED') {
      return res.status(400).json({
        success: false,
        error: 'CANNOT_EDIT_ARCHIVED_CAMPAIGN',
      });
    }

    const updated = await prisma.adCampaign.update({
      where: { id },
      data: {
        name: updates.name,
        dailyBudget: updates.budget?.daily,
        lifetimeBudget: updates.budget?.lifetime,
        startDate: updates.schedule?.startDate,
        endDate: updates.schedule?.endDate,
        targeting: updates.targeting ? JSON.stringify(updates.targeting) : undefined,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Campaign update error:', error);
    res.status(500).json({ success: false, error: 'UPDATE_FAILED' });
  }
});

/**
 * Get campaign performance metrics
 * GET /api/v1/ads/campaigns/:id/performance
 */
router.get('/campaigns/:id/performance', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, breakdown } = req.query;

    // Check ownership
    const campaign = await prisma.adCampaign.findFirst({
      where: {
        id,
        advertiser: { userId: req.user!.id },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'CAMPAIGN_NOT_FOUND',
      });
    }

    // Fetch performance data from analytics
    const performance = await getAggregatedMetrics(id, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      breakdown: breakdown as 'day' | 'week' | 'month' | undefined,
    });

    res.json({
      success: true,
      data: {
        campaignId: id,
        campaignName: campaign.name,
        status: campaign.status,
        spent: performance.totalSpent,
        budget: {
          daily: campaign.dailyBudget,
          lifetime: campaign.lifetimeBudget,
          remaining: (campaign.lifetimeBudget || 0) - performance.totalSpent,
        },
        metrics: {
          impressions: performance.impressions,
          clicks: performance.clicks,
          ctr: performance.impressions > 0 
            ? (performance.clicks / performance.impressions * 100).toFixed(2) 
            : '0',
          cpc: performance.clicks > 0 
            ? (performance.totalSpent / performance.clicks).toFixed(2) 
            : '0',
          conversions: performance.conversions,
          costPerConversion: performance.conversions > 0
            ? (performance.totalSpent / performance.conversions).toFixed(2)
            : '0',
          reach: performance.reach,
          frequency: performance.reach > 0
            ? (performance.impressions / performance.reach).toFixed(2)
            : '0',
        },
        breakdown: performance.breakdown,
      },
    });
  } catch (error) {
    console.error('Performance fetch error:', error);
    res.status(500).json({ success: false, error: 'PERFORMANCE_FETCH_FAILED' });
  }
});

/**
 * List all campaigns for advertiser
 * GET /api/v1/ads/campaigns
 */
router.get('/campaigns', authenticateUser, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: req.user!.id },
    });

    if (!advertiser) {
      return res.status(404).json({
        success: false,
        error: 'ADVERTISER_NOT_FOUND',
      });
    }

    const where: any = { advertiserId: advertiser.id };
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        include: {
          _count: { select: { adSets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.adCampaign.count({ where }),
    ]);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Campaign list error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

// ==================== Ad Creative Management ====================

/**
 * Upload ad creative
 * POST /api/v1/ads/creatives
 */
router.post('/creatives', authenticateUser, async (req, res) => {
  try {
    const { adSetId, creative } = req.body;

    // Validate ad set belongs to user
    const adSet = await prisma.adSet.findFirst({
      where: {
        id: adSetId,
        campaign: { advertiser: { userId: req.user!.id } },
      },
    });

    if (!adSet) {
      return res.status(404).json({
        success: false,
        error: 'AD_SET_NOT_FOUND',
      });
    }

    // Validate creative assets
    const validation = await validateCreativeAssets(creative);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CREATIVE',
        details: validation.errors,
      });
    }

    const ad = await prisma.ad.create({
      data: {
        adSetId,
        creative: JSON.stringify(creative),
        status: 'PENDING_REVIEW',
      },
    });

    // Submit for review
    await submitForReview(ad.id, creative);

    res.status(201).json({ success: true, data: ad });
  } catch (error) {
    console.error('Creative creation error:', error);
    res.status(500).json({ success: false, error: 'CREATIVE_CREATION_FAILED' });
  }
});

/**
 * Preview ad creative
 * POST /api/v1/ads/creatives/preview
 */
router.post('/creatives/preview', authenticateUser, async (req, res) => {
  try {
    const { creative } = req.body;

    // Generate preview URL
    const preview = await generateAdPreview(creative);

    res.json({
      success: true,
      data: {
        previewUrl: preview.url,
        formats: preview.formats, // Different placements
      },
    });
  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({ success: false, error: 'PREVIEW_FAILED' });
  }
});

// ==================== Helper Functions ====================

async function getAggregatedMetrics(campaignId: string, options: any) {
  // Query analytics data warehouse
  const metrics = await prisma.adMetric.aggregate({
    where: {
      ad: { adSet: { campaignId } },
      timestamp: {
        gte: options.startDate,
        lte: options.endDate,
      },
    },
    _sum: {
      impressions: true,
      clicks: true,
      spend: true,
      conversions: true,
    },
    _count: { id: true },
  });

  return {
    totalSpent: metrics._sum.spend || 0,
    impressions: metrics._sum.impressions || 0,
    clicks: metrics._sum.clicks || 0,
    conversions: metrics._sum.conversions || 0,
    reach: metrics._count.id || 0,
    breakdown: [],
  };
}

async function validateCreativeAssets(creative: CreativeDTO) {
  const errors: string[] = [];

  // Check image dimensions
  if (creative.type === 'image') {
    for (const media of creative.media) {
      const dimensions = await getImageDimensions(media.url);
      if (dimensions.width < 600 || dimensions.height < 315) {
        errors.push('Image must be at least 600x315 pixels');
      }
      if (dimensions.aspectRatio < 1.2 || dimensions.aspectRatio > 1.91) {
        errors.push('Image aspect ratio must be between 1.2:1 and 1.91:1');
      }
    }
  }

  // Validate video duration
  if (creative.type === 'video') {
    for (const media of creative.media) {
      const duration = await getVideoDuration(media.url);
      if (duration < 3 || duration > 240) {
        errors.push('Video must be between 3 and 240 seconds');
      }
    }
  }

  // Validate text length
  if (creative.headline.length > 40) {
    errors.push('Headline must be 40 characters or less');
  }
  if (creative.description.length > 125) {
    errors.push('Description must be 125 characters or less');
  }

  return { valid: errors.length === 0, errors };
}

async function submitForReview(adId: string, creative: CreativeDTO) {
  // Automated content policy check
  const policyResult = await checkContentPolicy(creative);
  
  if (policyResult.passed) {
    await prisma.ad.update({
      where: { id: adId },
      data: { status: 'APPROVED' },
    });
  } else {
    await prisma.ad.update({
      where: { id: adId },
      data: { 
        status: 'REJECTED',
        rejectionReason: policyResult.reasons.join(', '),
      },
    });
  }
}

async function checkContentPolicy(creative: CreativeDTO) {
  // AI-based content policy check
  // Returns { passed: boolean, reasons: string[] }
  return { passed: true, reasons: [] };
}

async function generateAdPreview(creative: CreativeDTO) {
  return {
    url: `https://preview.facebook-clone.com/ad/${Date.now()}`,
    formats: [
      { placement: 'feed', url: '...' },
      { placement: 'story', url: '...' },
      { placement: 'reels', url: '...' },
      { placement: 'sidebar', url: '...' },
    ],
  };
}

async function publishEvent(event: string, data: any) {
  // Publish to message queue for real-time bidding
  console.log(`Publishing event: ${event}`, data);
}

async function getImageDimensions(url: string) {
  return { width: 1200, height: 628, aspectRatio: 1.91 };
}

async function getVideoDuration(url: string) {
  return 30;
}

export default router;
