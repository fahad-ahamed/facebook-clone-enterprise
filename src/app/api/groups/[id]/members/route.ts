import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get group members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Check if group exists
    const group = await db.group.findUnique({
      where: { id: groupId, deletedAt: null }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // For private groups, check membership
    if (group.type === 'private') {
      const authUser = await getAuthUser(request);
      if (!authUser) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const member = await db.groupMember.findFirst({
        where: { groupId, userId: authUser.userId }
      });

      if (!member) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    let where: Record<string, unknown> = { groupId };
    if (role) where.role = role;

    const members = await db.groupMember.findMany({
      where,
      include: {
        user: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            avatar: true,
            isVerified: true,
            currentCity: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: [
        { role: 'asc' }, // admins first
        { joinedAt: 'asc' }
      ]
    });

    const total = await db.groupMember.count({ where });

    return NextResponse.json({ 
      members,
      total,
      hasMore: skip + members.length < total
    });

  } catch (error) {
    console.error('Get group members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Invite/Add member, Remove member, Change role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { action, targetUserId, role } = body;

    // Check if user is admin/moderator
    const adminMember = await db.groupMember.findFirst({
      where: { groupId, userId: authUser.userId, role: { in: ['admin', 'moderator'] } }
    });

    if (!adminMember) {
      return NextResponse.json({ error: 'Only admins/moderators can manage members' }, { status: 403 });
    }

    if (action === 'invite' || action === 'add') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
      }

      // Check if already a member
      const existing = await db.groupMember.findFirst({
        where: { groupId, userId: targetUserId }
      });

      if (existing) {
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
      }

      // Add member
      const member = await db.groupMember.create({
        data: {
          groupId,
          userId: targetUserId,
          role: role || 'member',
          status: 'active'
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Update member count
      await db.group.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } }
      });

      // Create notification
      await db.notification.create({
        data: {
          userId: targetUserId,
          type: 'group_invite',
          message: `You have been added to a group`,
          relatedType: 'group',
          relatedId: groupId,
          actorId: authUser.userId
        }
      });

      return NextResponse.json({ message: 'Member added', member }, { status: 201 });
    }

    if (action === 'remove') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
      }

      const targetMember = await db.groupMember.findFirst({
        where: { groupId, userId: targetUserId }
      });

      if (!targetMember) {
        return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
      }

      // Cannot remove another admin unless you're the creator
      const group = await db.group.findUnique({ where: { id: groupId } });
      if (targetMember.role === 'admin' && group?.creatorId !== authUser.userId) {
        return NextResponse.json({ error: 'Cannot remove another admin' }, { status: 403 });
      }

      await db.groupMember.delete({
        where: { id: targetMember.id }
      });

      // Update member count
      await db.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } }
      });

      return NextResponse.json({ message: 'Member removed' });
    }

    if (action === 'changeRole') {
      if (!targetUserId || !role) {
        return NextResponse.json({ error: 'Target user ID and role are required' }, { status: 400 });
      }

      if (!['admin', 'moderator', 'member'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const targetMember = await db.groupMember.findFirst({
        where: { groupId, userId: targetUserId }
      });

      if (!targetMember) {
        return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
      }

      // Only creator can change admin roles
      const group = await db.group.findUnique({ where: { id: groupId } });
      if (role === 'admin' && group?.creatorId !== authUser.userId) {
        return NextResponse.json({ error: 'Only creator can assign admin role' }, { status: 403 });
      }

      const updated = await db.groupMember.update({
        where: { id: targetMember.id },
        data: { role },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      return NextResponse.json({ message: 'Role updated', member: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Manage group member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
