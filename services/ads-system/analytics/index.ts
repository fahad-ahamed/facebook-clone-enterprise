/**
 * Ads System - Analytics Service
 * Aggregates ad performance data and generates reports
 */

import { Router } from 'express';
import { RedisClient } from '../../cache-system/redis';

const router = Router();
const redis = new RedisClient();

// Analytics time periods
type TimePeriod = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

interface AdAnalytics {
  campaignId: string;
  period: TimePeriod;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    spend: number;
    conversions: number;
    conversionRate: number;
    costPerConversion: number;
    roas: number;
    reach: number;
    frequency: number;
  };
  breakdown: {
    byPlacement: Record<string, any>;
    byDevice: Record<string, any>;
    byAge: Record<string, any>;
    byGender: Record<string, any>;
    byLocation: Record<string, any>;
    byDay: Array<{ date: string; metrics: any }>;
  };
}

/**
 * Get campaign analytics
 * GET /api/v1/ads/analytics/campaign/:campaignId
 */
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { period = 'last_7_days', start_date, end_date } = req.query;

    const analytics = await getCampaignAnalytics(
      campaignId,
      period as TimePeriod,
      start_date ? new Date(start_date as string) : undefined,
      end_date ? new Date(end_date as string) : undefined
    );

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ success: false, error: 'ANALYTICS_FETCH_FAILED' });
  }
});

/**
 * Get account-level analytics
 * GET /api/v1/ads/analytics/account
 */
router.get('/account', async (req, res) => {
  try {
    const advertiserId = req.user?.id;
    const { period = 'last_30_days' } = req.query;

    const analytics = await getAccountAnalytics(advertiserId, period as TimePeriod);

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Account analytics error:', error);
    res.status(500).json({ success: false, error: 'ANALYTICS_FETCH_FAILED' });
  }
});

/**
 * Get real-time campaign stats
 * GET /api/v1/ads/analytics/realtime/:campaignId
 */
router.get('/realtime/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const stats = await getRealtimeStats(campaignId);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Realtime stats error:', error);
    res.status(500).json({ success: false, error: 'REALTIME_FETCH_FAILED' });
  }
});

/**
 * Export analytics report
 * GET /api/v1/ads/analytics/export/:campaignId
 */
router.get('/export/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { format = 'csv', period = 'last_30_days' } = req.query;

    const report = await generateReport(campaignId, period as TimePeriod, format as 'csv' | 'xlsx' | 'pdf');

    res.setHeader('Content-Type', report.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaignId}_report.${format}"`);
    res.send(report.data);
  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({ success: false, error: 'EXPORT_FAILED' });
  }
});

/**
 * Get ad performance insights
 * GET /api/v1/ads/analytics/insights/:campaignId
 */
router.get('/insights/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const insights = await generateInsights(campaignId);

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Insights generation error:', error);
    res.status(500).json({ success: false, error: 'INSIGHTS_FAILED' });
  }
});

// ==================== Helper Functions ====================

async function getCampaignAnalytics(
  campaignId: string,
  period: TimePeriod,
  startDate?: Date,
  endDate?: Date
): Promise<AdAnalytics> {
  const dateRange = getDateRange(period, startDate, endDate);

  // Fetch metrics from data warehouse
  const metrics = await fetchMetrics(campaignId, dateRange);
  const breakdown = await fetchBreakdown(campaignId, dateRange);

  return {
    campaignId,
    period,
    metrics: {
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions * 100) : 0,
      cpc: metrics.clicks > 0 ? (metrics.spend / metrics.clicks) : 0,
      cpm: metrics.impressions > 0 ? (metrics.spend / metrics.impressions * 1000) : 0,
      spend: metrics.spend,
      conversions: metrics.conversions,
      conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks * 100) : 0,
      costPerConversion: metrics.conversions > 0 ? (metrics.spend / metrics.conversions) : 0,
      roas: metrics.spend > 0 ? (metrics.conversionValue / metrics.spend) : 0,
      reach: metrics.reach,
      frequency: metrics.reach > 0 ? (metrics.impressions / metrics.reach) : 0,
    },
    breakdown,
  };
}

async function getAccountAnalytics(advertiserId: string, period: TimePeriod) {
  const dateRange = getDateRange(period);

  // Aggregate across all campaigns
  const campaigns = await getCampaignsForAdvertiser(advertiserId);
  const allMetrics = await Promise.all(
    campaigns.map(c => fetchMetrics(c.id, dateRange))
  );

  const totals = allMetrics.reduce((acc, m) => ({
    impressions: acc.impressions + m.impressions,
    clicks: acc.clicks + m.clicks,
    spend: acc.spend + m.spend,
    conversions: acc.conversions + m.conversions,
    conversionValue: acc.conversionValue + m.conversionValue,
    reach: acc.reach + m.reach,
  }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionValue: 0, reach: 0 });

  return {
    advertiserId,
    period,
    totals,
    campaigns: campaigns.map((c, i) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      metrics: allMetrics[i],
    })),
  };
}

async function getRealtimeStats(campaignId: string) {
  const today = new Date().toISOString().split('T')[0];

  // Get real-time counters from Redis
  const [
    impressions,
    clicks,
    spend,
    conversions,
  ] = await Promise.all([
    redis.get(`ads:count:impression:${campaignId}:${today}`),
    redis.get(`ads:count:click:${campaignId}:${today}`),
    redis.get(`ads:spend:${campaignId}:${today}`),
    redis.get(`ads:count:conversion:${campaignId}:${today}`),
  ]);

  return {
    campaignId,
    date: today,
    realtime: {
      impressions: parseInt(impressions || '0'),
      clicks: parseInt(clicks || '0'),
      spend: parseFloat(spend || '0'),
      conversions: parseInt(conversions || '0'),
    },
    lastUpdated: new Date().toISOString(),
  };
}

async function generateReport(
  campaignId: string,
  period: TimePeriod,
  format: 'csv' | 'xlsx' | 'pdf'
) {
  const analytics = await getCampaignAnalytics(campaignId, period);
  const dateRange = getDateRange(period);

  switch (format) {
    case 'csv':
      return {
        data: generateCSV(analytics),
        mimeType: 'text/csv',
      };
    case 'xlsx':
      return {
        data: generateExcel(analytics),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    case 'pdf':
      return {
        data: generatePDF(analytics),
        mimeType: 'application/pdf',
      };
  }
}

async function generateInsights(campaignId: string) {
  const analytics = await getCampaignAnalytics(campaignId, 'last_30_days');
  const insights: any[] = [];

  // Performance insights
  if (analytics.metrics.ctr < 1) {
    insights.push({
      type: 'performance',
      severity: 'warning',
      title: 'Low Click-Through Rate',
      description: `Your CTR of ${analytics.metrics.ctr.toFixed(2)}% is below average. Consider testing new ad creatives or headlines.`,
      recommendation: 'A/B test different headlines and images to improve engagement.',
    });
  }

  if (analytics.metrics.cpc > 2) {
    insights.push({
      type: 'cost',
      severity: 'info',
      title: 'High Cost Per Click',
      description: `Your CPC is $${analytics.metrics.cpc.toFixed(2)}. This might indicate high competition for your target audience.`,
      recommendation: 'Consider expanding your targeting or adjusting your bid strategy.',
    });
  }

  // Best performing placements
  const bestPlacement = Object.entries(analytics.breakdown.byPlacement)
    .sort(([, a], [, b]) => (b as any).clicks - (a as any).clicks)[0];
  
  if (bestPlacement) {
    insights.push({
      type: 'optimization',
      severity: 'success',
      title: 'Top Performing Placement',
      description: `${bestPlacement[0]} is your best performing placement with ${(bestPlacement[1] as any).clicks} clicks.`,
      recommendation: 'Consider allocating more budget to this placement.',
    });
  }

  return insights;
}

async function fetchMetrics(campaignId: string, dateRange: { start: Date; end: Date }) {
  // In production, query from data warehouse
  return {
    impressions: 100000,
    clicks: 2000,
    spend: 500,
    conversions: 50,
    conversionValue: 1500,
    reach: 80000,
  };
}

async function fetchBreakdown(campaignId: string, dateRange: { start: Date; end: Date }) {
  return {
    byPlacement: {
      feed: { impressions: 50000, clicks: 1200, spend: 250 },
      story: { impressions: 30000, clicks: 500, spend: 150 },
      reels: { impressions: 20000, clicks: 300, spend: 100 },
    },
    byDevice: {
      mobile: { impressions: 70000, clicks: 1500 },
      desktop: { impressions: 25000, clicks: 400 },
      tablet: { impressions: 5000, clicks: 100 },
    },
    byAge: {
      '18-24': { impressions: 20000, clicks: 500 },
      '25-34': { impressions: 40000, clicks: 900 },
      '35-44': { impressions: 25000, clicks: 400 },
      '45+': { impressions: 15000, clicks: 200 },
    },
    byGender: {
      male: { impressions: 55000, clicks: 1100 },
      female: { impressions: 45000, clicks: 900 },
    },
    byLocation: {
      'US': { impressions: 40000, clicks: 800 },
      'UK': { impressions: 20000, clicks: 400 },
      'Other': { impressions: 40000, clicks: 800 },
    },
    byDay: [],
  };
}

async function getCampaignsForAdvertiser(advertiserId: string) {
  return [
    { id: 'camp1', name: 'Summer Sale', status: 'ACTIVE' },
    { id: 'camp2', name: 'Brand Awareness', status: 'PAUSED' },
  ];
}

function getDateRange(
  period: TimePeriod,
  startDate?: Date,
  endDate?: Date
): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: today, end: now };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    case 'last_7_days':
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: now };
    case 'last_30_days':
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { start: monthAgo, end: now };
    case 'this_month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end: now };
    case 'last_month':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: lastMonthStart, end: lastMonthEnd };
    case 'custom':
      return { start: startDate || new Date(), end: endDate || new Date() };
  }
}

function generateCSV(analytics: AdAnalytics): Buffer {
  let csv = 'Metric,Value\n';
  for (const [key, value] of Object.entries(analytics.metrics)) {
    csv += `${key},${value}\n`;
  }
  return Buffer.from(csv);
}

function generateExcel(analytics: AdAnalytics): Buffer {
  // In production, use a library like exceljs
  return Buffer.from('Excel file');
}

function generatePDF(analytics: AdAnalytics): Buffer {
  // In production, use a library like pdfkit
  return Buffer.from('PDF file');
}

export default router;
