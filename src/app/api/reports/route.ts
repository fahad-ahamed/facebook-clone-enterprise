import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: authUser.userId }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const reportType = searchParams.get('reportType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (reportType) where.reportType = reportType;

    const reports = await db.report.findMany({
      where,
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await db.report.count({ where });

    return NextResponse.json({ 
      reports,
      total,
      hasMore: skip + reports.length < total
    });

  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a report
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { reportType, reportedId, reason, description } = body;

    if (!reportType || !reportedId || !reason) {
      return NextResponse.json({ error: 'Report type, reported ID, and reason are required' }, { status: 400 });
    }

    const validTypes = ['post', 'comment', 'user', 'page', 'group', 'message', 'marketplace', 'event'];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const validReasons = ['spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'fake_account', 'scam', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Check if already reported
    const existing = await db.report.findFirst({
      where: {
        reporterId: authUser.userId,
        reportType,
        reportedId
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Already reported' }, { status: 400 });
    }

    const report = await db.report.create({
      data: {
        reporterId: authUser.userId,
        reportType,
        reportedId,
        reason,
        description: description || null
      }
    });

    return NextResponse.json({ report }, { status: 201 });

  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update report status (admin only)
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { reportId, status, action } = body;

    if (!reportId || !status) {
      return NextResponse.json({ error: 'Report ID and status are required' }, { status: 400 });
    }

    const report = await db.report.update({
      where: { id: reportId },
      data: {
        status,
        action: action || null,
        reviewedBy: authUser.userId,
        reviewedAt: new Date()
      }
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        adminId: authUser.userId,
        action: 'review_report',
        targetType: 'report',
        targetId: reportId,
        details: JSON.stringify({ status, action })
      }
    });

    return NextResponse.json({ report });

  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
