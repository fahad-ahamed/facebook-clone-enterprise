import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Leave a group
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

    // Check if member
    const member = await db.groupMember.findFirst({
      where: { groupId, userId: authUser.userId }
    });

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 400 });
    }

    // Check if user is the only admin
    if (member.role === 'admin') {
      const adminCount = await db.groupMember.count({
        where: { groupId, role: 'admin' }
      });

      if (adminCount === 1) {
        // Need to assign a new admin before leaving
        const otherMembers = await db.groupMember.findMany({
          where: { 
            groupId, 
            userId: { not: authUser.userId }
          },
          take: 1
        });

        if (otherMembers.length === 0) {
          return NextResponse.json({ 
            error: 'Cannot leave. You are the only member. Delete the group instead.' 
          }, { status: 400 });
        }

        // Assign the first other member as admin
        await db.groupMember.update({
          where: { id: otherMembers[0].id },
          data: { role: 'admin' }
        });
      }
    }

    // Remove member
    await db.groupMember.delete({
      where: { id: member.id }
    });

    // Update member count
    await db.group.update({
      where: { id: groupId },
      data: { memberCount: { decrement: 1 } }
    });

    return NextResponse.json({ message: 'Left group successfully' });

  } catch (error) {
    console.error('Leave group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
