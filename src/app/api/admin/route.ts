import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get admin dashboard stats
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
    const type = searchParams.get('type') || 'stats';

    if (type === 'stats') {
      // Get platform statistics
      const [
        totalUsers,
        totalPosts,
        totalGroups,
        totalPages,
        totalEvents,
        pendingReports,
        activeUsers24h
      ] = await Promise.all([
        db.user.count(),
        db.post.count({ where: { deletedAt: null } }),
        db.group.count({ where: { deletedAt: null } }),
        db.page.count({ where: { deletedAt: null } }),
        db.event.count({ where: { deletedAt: null } }),
        db.report.count({ where: { status: 'pending' } }),
        db.user.count({
          where: {
            lastActive: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        })
      ]);

      return NextResponse.json({
        stats: {
          totalUsers,
          totalPosts,
          totalGroups,
          totalPages,
          totalEvents,
          pendingReports,
          activeUsers24h
        }
      });
    }

    if (type === 'users') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const search = searchParams.get('search');
      const skip = (page - 1) * limit;

      let where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } }
        ];
      }

      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          isVerified: true,
          isAdmin: true,
          isOnline: true,
          lastActive: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              friendships1: true,
              friendships2: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      const total = await db.user.count({ where });

      return NextResponse.json({
        users,
        total,
        hasMore: skip + users.length < total
      });
    }

    if (type === 'logs') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      const logs = await db.adminLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ logs });
    }

    if (type === 'settings') {
      const settings = await db.systemSetting.findMany();
      return NextResponse.json({ settings: Object.fromEntries(settings.map(s => [s.key, s.value])) });
    }

    if (type === 'announcements') {
      const announcements = await db.announcement.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ announcements });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Admin actions
export async function POST(request: NextRequest) {
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
    const { action, targetType, targetId, data } = body;

    // Ban user
    if (action === 'ban_user') {
      await db.user.update({
        where: { id: targetId },
        data: { deletedAt: new Date() }
      });

      await db.adminLog.create({
        data: {
          adminId: authUser.userId,
          action: 'ban_user',
          targetType: 'user',
          targetId,
          details: JSON.stringify(data)
        }
      });

      return NextResponse.json({ message: 'User banned' });
    }

    // Unban user
    if (action === 'unban_user') {
      await db.user.update({
        where: { id: targetId },
        data: { deletedAt: null }
      });

      await db.adminLog.create({
        data: {
          adminId: authUser.userId,
          action: 'unban_user',
          targetType: 'user',
          targetId
        }
      });

      return NextResponse.json({ message: 'User unbanned' });
    }

    // Verify user
    if (action === 'verify_user') {
      await db.user.update({
        where: { id: targetId },
        data: { isVerified: true }
      });

      await db.adminLog.create({
        data: {
          adminId: authUser.userId,
          action: 'verify_user',
          targetType: 'user',
          targetId
        }
      });

      return NextResponse.json({ message: 'User verified' });
    }

    // Make admin
    if (action === 'make_admin') {
      await db.user.update({
        where: { id: targetId },
        data: { isAdmin: true }
      });

      await db.adminLog.create({
        data: {
          adminId: authUser.userId,
          action: 'make_admin',
          targetType: 'user',
          targetId
        }
      });

      return NextResponse.json({ message: 'User made admin' });
    }

    // Remove admin
    if (action === 'remove_admin') {
      await db.user.update({
        where: { id: targetId },
        data: { isAdmin: false }
      });

      await db.adminLog.create({
        data: {
          adminId: authUser.userId,
          action: 'remove_admin',
          targetType: 'user',
          targetId
        }
      });

      return NextResponse.json({ message: 'Admin removed' });
    }

    // Delete content
    if (action === 'delete_content') {
      if (targetType === 'post') {
        await db.post.update({
          where: { id: targetId },
          data: { deletedAt: new Date() }
        });
      } else if (targetType === 'comment') {
        await db.comment.update({
          where: { id: targetId },
          data: { deletedAt: new Date() }
        });
      } else if (targetType === 'group') {
        await db.group.update({
          where: { id: targetId },
          data: { deletedAt: new Date() }
        });
      } else if (targetType === 'page') {
        await db.page.update({
          where: { id: targetId },
          data: { deletedAt: new Date() }
        });
      }

      await db.adminLog.create({
        data: {
          adminId: authUser.userId,
          action: 'delete_content',
          targetType,
          targetId
        }
      });

      return NextResponse.json({ message: 'Content deleted' });
    }

    // Create announcement
    if (action === 'create_announcement') {
      const announcement = await db.announcement.create({
        data: {
          title: data.title,
          content: data.content,
          type: data.type || 'info',
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null
        }
      });

      await db.adminLog.create({
        data: {
          adminId: authUser.userId,
          action: 'create_announcement',
          targetType: 'announcement',
          targetId: announcement.id
        }
      });

      return NextResponse.json({ announcement }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Admin POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update system settings
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
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await db.systemSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) }
      });
    }

    await db.adminLog.create({
      data: {
        adminId: authUser.userId,
        action: 'update_settings',
        details: JSON.stringify(settings)
      }
    });

    return NextResponse.json({ message: 'Settings updated' });

  } catch (error) {
    console.error('Admin PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
