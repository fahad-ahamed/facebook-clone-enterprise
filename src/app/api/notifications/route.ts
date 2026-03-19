import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get notifications
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const notifications = await db.notification.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const unreadCount = await db.notification.count({
      where: { userId: authUser.userId, isRead: false }
    });

    return NextResponse.json({ notifications, unreadCount });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Mark as read
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await db.notification.updateMany({
        where: { userId: authUser.userId, isRead: false },
        data: { isRead: true, readAt: new Date() }
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (notificationId) {
      await db.notification.update({
        where: { id: notificationId, userId: authUser.userId },
        data: { isRead: true, readAt: new Date() }
      });
      return NextResponse.json({ message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
