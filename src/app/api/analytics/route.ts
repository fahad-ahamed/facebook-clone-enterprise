import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Track analytics event
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const body = await request.json();
    const { eventType, entityType, entityId, metadata } = body;

    // Store analytics event (we could use a separate analytics DB/table)
    // For now, we'll just log it and potentially store in admin log
    if (authUser) {
      const user = await db.user.findUnique({
        where: { id: authUser.userId }
      });
      
      if (user?.isAdmin) {
        await db.adminLog.create({
          data: {
            adminId: authUser.userId,
            action: `analytics_${eventType}`,
            targetType: entityType,
            targetId: entityId,
            details: JSON.stringify(metadata)
          }
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get analytics data (admin only)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: authUser.userId }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get various analytics
    const [
      newUsers,
      newPosts,
      newGroups,
      newPages,
      activeUsers,
      totalReactions,
      totalComments,
      totalShares
    ] = await Promise.all([
      db.user.count({
        where: { createdAt: { gte: startDate } }
      }),
      db.post.count({
        where: { createdAt: { gte: startDate }, deletedAt: null }
      }),
      db.group.count({
        where: { createdAt: { gte: startDate }, deletedAt: null }
      }),
      db.page.count({
        where: { createdAt: { gte: startDate }, deletedAt: null }
      }),
      db.user.count({
        where: { lastActive: { gte: startDate } }
      }),
      db.reaction.count({
        where: { createdAt: { gte: startDate } }
      }),
      db.comment.count({
        where: { createdAt: { gte: startDate }, deletedAt: null }
      }),
      db.postShare.count({
        where: { createdAt: { gte: startDate } }
      })
    ]);

    // Get daily signups for chart
    const dailySignups = await db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT date(createdAt) as date, COUNT(*) as count
      FROM User
      WHERE createdAt >= datetime(${startDate.toISOString()})
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `;

    // Get daily posts for chart
    const dailyPosts = await db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT date(createdAt) as date, COUNT(*) as count
      FROM Post
      WHERE createdAt >= datetime(${startDate.toISOString()}) AND deletedAt IS NULL
      GROUP BY date(createdAt)
      ORDER BY date ASC
    `;

    return NextResponse.json({
      range,
      startDate,
      endDate: now,
      metrics: {
        newUsers,
        newPosts,
        newGroups,
        newPages,
        activeUsers,
        totalReactions,
        totalComments,
        totalShares
      },
      charts: {
        dailySignups,
        dailyPosts
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
