/**
 * Ads System - Tracking Service
 * Tracks ad impressions, clicks, conversions
 * Attribution and fraud detection
 */

import { Router } from 'express';
import { RedisClient } from '../../cache-system/redis';

const router = Router();
const redis = new RedisClient();

// Tracking event types
type TrackingEvent = 'impression' | 'click' | 'view' | 'conversion' | 'engagement';

interface AdEvent {
  eventType: TrackingEvent;
  adId: string;
  campaignId: string;
  userId?: string;
  requestId: string;
  timestamp: Date;
  metadata: {
    placement?: string;
    device?: string;
    os?: string;
    browser?: string;
    location?: string;
    cost?: number;
    conversionValue?: number;
    viewDuration?: number;
    scrollDepth?: number;
  };
}

/**
 * Track ad impression
 * GET /api/v1/ads/track/impression/:adId
 */
router.get('/impression/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { request_id, campaign_id, user_id, placement } = req.query;

    const event: AdEvent = {
      eventType: 'impression',
      adId,
      campaignId: campaign_id as string,
      userId: user_id as string,
      requestId: request_id as string,
      timestamp: new Date(),
      metadata: {
        placement: placement as string,
        device: detectDevice(req.headers['user-agent']),
        os: detectOS(req.headers['user-agent']),
        browser: detectBrowser(req.headers['user-agent']),
        location: req.headers['x-geo-country'] as string,
      },
    };

    // Store event
    await storeEvent(event);

    // Update real-time counters
    await incrementCounters(event);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  } catch (error) {
    console.error('Impression tracking error:', error);
    res.status(204).send();
  }
});

/**
 * Track ad click
 * GET /api/v1/ads/track/click/:adId
 */
router.get('/click/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { request_id, campaign_id, user_id, destination } = req.query;

    const event: AdEvent = {
      eventType: 'click',
      adId,
      campaignId: campaign_id as string,
      userId: user_id as string,
      requestId: request_id as string,
      timestamp: new Date(),
      metadata: {
        device: detectDevice(req.headers['user-agent']),
        os: detectOS(req.headers['user-agent']),
        browser: detectBrowser(req.headers['user-agent']),
        location: req.headers['x-geo-country'] as string,
      },
    };

    // Store event
    await storeEvent(event);

    // Update real-time counters
    await incrementCounters(event);

    // Check for click fraud
    const fraudScore = await detectClickFraud(event);
    if (fraudScore > 0.8) {
      await flagAsFraud(event, fraudScore);
    }

    // Redirect to destination
    if (destination) {
      res.redirect(302, decodeURIComponent(destination as string));
    } else {
      res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Click tracking error:', error);
    res.status(500).json({ success: false });
  }
});

/**
 * Track ad view (video)
 * POST /api/v1/ads/track/view/:adId
 */
router.post('/view/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { request_id, campaign_id, user_id, duration, quartile } = req.body;

    const event: AdEvent = {
      eventType: 'view',
      adId,
      campaignId: campaign_id,
      userId: user_id,
      requestId: request_id,
      timestamp: new Date(),
      metadata: {
        viewDuration: duration,
        device: detectDevice(req.headers['user-agent']),
      },
    };

    await storeEvent(event);
    await incrementCounters(event);

    // Track quartile completions
    if (quartile) {
      await trackVideoQuartile(adId, quartile, duration);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    res.status(500).json({ success: false });
  }
});

/**
 * Track conversion
 * POST /api/v1/ads/track/conversion
 */
router.post('/conversion', async (req, res) => {
  try {
    const { 
      conversion_id, 
      value, 
      currency = 'USD',
      user_id,
      attribution_window = 7,
    } = req.body;

    // Find attributed ad within window
    const attributedAd = await findAttributedAd(user_id, attribution_window);

    if (!attributedAd) {
      return res.status(200).json({ 
        success: true, 
        message: 'No attributed ad found' 
      });
    }

    const event: AdEvent = {
      eventType: 'conversion',
      adId: attributedAd.adId,
      campaignId: attributedAd.campaignId,
      userId: user_id,
      requestId: conversion_id,
      timestamp: new Date(),
      metadata: {
        conversionValue: value,
        device: detectDevice(req.headers['user-agent']),
      },
    };

    await storeEvent(event);
    await incrementCounters(event);

    // Update ROAS tracking
    await updateROAS(attributedAd.campaignId, value);

    res.json({ 
      success: true, 
      attribution: {
        adId: attributedAd.adId,
        campaignId: attributedAd.campaignId,
        clickTime: attributedAd.clickTime,
      },
    });
  } catch (error) {
    console.error('Conversion tracking error:', error);
    res.status(500).json({ success: false });
  }
});

/**
 * Track engagement (like, share, comment on ad)
 * POST /api/v1/ads/track/engagement/:adId
 */
router.post('/engagement/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { 
      request_id, 
      campaign_id, 
      user_id, 
      engagement_type,
      post_id,
    } = req.body;

    const event: AdEvent = {
      eventType: 'engagement',
      adId,
      campaignId,
      userId: user_id,
      requestId: request_id,
      timestamp: new Date(),
      metadata: {
        device: detectDevice(req.headers['user-agent']),
      },
    };

    await storeEvent(event);
    await incrementCounters(event);

    res.json({ success: true });
  } catch (error) {
    console.error('Engagement tracking error:', error);
    res.status(500).json({ success: false });
  }
});

// ==================== Helper Functions ====================

async function storeEvent(event: AdEvent): Promise<void> {
  // Push to event stream for real-time processing
  await redis.xadd('ads:events', '*', {
    eventType: event.eventType,
    adId: event.adId,
    campaignId: event.campaignId,
    userId: event.userId || '',
    requestId: event.requestId,
    timestamp: event.timestamp.toISOString(),
    metadata: JSON.stringify(event.metadata),
  });

  // Also store in time-series for analytics
  await redis.lpush(
    `ads:events:${event.eventType}:${event.adId}`,
    JSON.stringify(event)
  );
  await redis.ltrim(`ads:events:${event.eventType}:${event.adId}`, 0, 999);
}

async function incrementCounters(event: AdEvent): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();

  // Increment multiple counters
  const keys = [
    `ads:count:${event.eventType}:total`,
    `ads:count:${event.eventType}:${date}`,
    `ads:count:${event.eventType}:${event.campaignId}`,
    `ads:count:${event.eventType}:${event.campaignId}:${date}`,
    `ads:hourly:${event.eventType}:${date}:${hour}`,
  ];

  for (const key of keys) {
    await redis.incr(key);
  }
}

async function detectClickFraud(event: AdEvent): Promise<number> {
  const { adId, userId, metadata } = event;

  let fraudScore = 0;

  // Check click frequency from same IP
  const ipClicks = await redis.get(`ads:ip_clicks:${metadata.location}`);
  if (ipClicks && parseInt(ipClicks) > 10) {
    fraudScore += 0.4;
  }

  // Check click frequency from same user
  if (userId) {
    const userClicks = await redis.get(`ads:user_clicks:${userId}:${adId}`);
    if (userClicks && parseInt(userClicks) > 3) {
      fraudScore += 0.3;
    }
    await redis.incr(`ads:user_clicks:${userId}:${adId}`);
    await redis.expire(`ads:user_clicks:${userId}:${adId}`, 3600);
  }

  // Check time between clicks
  const lastClick = await redis.get(`ads:last_click:${adId}`);
  if (lastClick) {
    const timeDiff = Date.now() - parseInt(lastClick);
    if (timeDiff < 1000) { // Less than 1 second
      fraudScore += 0.3;
    }
  }
  await redis.set(`ads:last_click:${adId}`, Date.now().toString());

  // Check for bot patterns
  const userAgent = metadata.browser;
  if (isKnownBot(userAgent)) {
    fraudScore = 1.0;
  }

  return Math.min(1, fraudScore);
}

async function flagAsFraud(event: AdEvent, score: number): Promise<void> {
  await redis.lpush('ads:fraud_queue', JSON.stringify({
    event,
    score,
    timestamp: new Date().toISOString(),
  }));
}

async function findAttributedAd(
  userId: string,
  windowDays: number
): Promise<{ adId: string; campaignId: string; clickTime: Date } | null> {
  // Look for clicks from this user within the attribution window
  const clicks = await redis.lrange(`ads:user_clicks_history:${userId}`, 0, -1);
  
  const windowStart = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  for (const click of clicks) {
    const clickEvent = JSON.parse(click);
    if (new Date(clickEvent.timestamp).getTime() >= windowStart) {
      return {
        adId: clickEvent.adId,
        campaignId: clickEvent.campaignId,
        clickTime: new Date(clickEvent.timestamp),
      };
    }
  }

  return null;
}

async function trackVideoQuartile(
  adId: string,
  quartile: '25' | '50' | '75' | '100',
  duration: number
): Promise<void> {
  await redis.incr(`ads:quartile:${adId}:${quartile}`);
}

async function updateROAS(campaignId: string, value: number): Promise<void> {
  await redis.incrbyfloat(`ads:conversion_value:${campaignId}`, value);
}

function detectDevice(userAgent: string | undefined): string {
  if (!userAgent) return 'unknown';
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function detectOS(userAgent: string | undefined): string {
  if (!userAgent) return 'unknown';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/mac/i.test(userAgent)) return 'MacOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
  return 'unknown';
}

function detectBrowser(userAgent: string | undefined): string {
  if (!userAgent) return 'unknown';
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/edge/i.test(userAgent)) return 'Edge';
  return 'unknown';
}

function isKnownBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const bots = ['bot', 'crawler', 'spider', 'scraper'];
  return bots.some(bot => userAgent.toLowerCase().includes(bot));
}

export default router;
