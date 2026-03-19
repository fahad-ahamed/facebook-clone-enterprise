import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Join a group
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

    // Check if group exists
    const group = await db.group.findUnique({
      where: { id: groupId, deletedAt: null }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await db.groupMember.findFirst({
      where: { groupId, userId: authUser.userId }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Check if group requires approval
    if (group.membershipApproval === 'admin_approval') {
      // Create a pending membership request (we can add a status field later)
      // For now, just return a message
      return NextResponse.json({ 
        message: 'Membership request sent. Waiting for admin approval.',
        pending: true
      });
    }

    // Add member directly
    const member = await db.groupMember.create({
      data: {
        groupId,
        userId: authUser.userId,
        role: 'member',
        status: 'active'
      }
    });

    // Update member count
    await db.group.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } }
    });

    return NextResponse.json({ message: 'Joined group successfully', member }, { status: 201 });

  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
