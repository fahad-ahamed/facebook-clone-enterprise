import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Get verification requests (for admin) or user's own request
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'my'; // my, all (admin)
    const status = searchParams.get('status'); // pending, approved, rejected

    // If requesting all requests, check if user is admin
    if (type === 'all') {
      const user = await db.user.findUnique({
        where: { id: authUser.userId },
        select: { isAdmin: true }
      });

      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      const where: Record<string, unknown> = {};
      if (status) {
        where.status = status;
      }

      const requests = await db.verificationRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              avatar: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ requests });
    }

    // Get user's own verification request
    const myRequest = await db.verificationRequest.findFirst({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ request: myRequest });

  } catch (error) {
    console.error('Get verification requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Submit verification request
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, documentType, documentUrl, category, reason } = body;

    if (!fullName || !documentType || !category) {
      return NextResponse.json({ 
        error: 'Full name, document type, and category are required' 
      }, { status: 400 });
    }

    // Check if user already has a pending request
    const existingRequest = await db.verificationRequest.findFirst({
      where: {
        userId: authUser.userId,
        status: 'pending'
      }
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You already have a pending verification request' 
      }, { status: 400 });
    }

    // Check if user is already verified
    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      select: { badgeType: true }
    });

    if (user?.badgeType) {
      return NextResponse.json({ 
        error: 'You are already verified' 
      }, { status: 400 });
    }

    const verificationRequest = await db.verificationRequest.create({
      data: {
        userId: authUser.userId,
        fullName,
        documentType,
        documentUrl: documentUrl || null,
        category,
        reason: reason || null,
        status: 'pending'
      }
    });

    return NextResponse.json({ 
      message: 'Verification request submitted successfully',
      request: verificationRequest 
    }, { status: 201 });

  } catch (error) {
    console.error('Submit verification request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Admin: Approve or reject verification request
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const admin = await db.user.findUnique({
      where: { id: authUser.userId },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, rejectionReason, badgeType } = body;

    if (!requestId || !action) {
      return NextResponse.json({ 
        error: 'Request ID and action are required' 
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Action must be approve or reject' 
      }, { status: 400 });
    }

    const verificationRequest = await db.verificationRequest.findUnique({
      where: { id: requestId }
    });

    if (!verificationRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (verificationRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'This request has already been processed' 
      }, { status: 400 });
    }

    if (action === 'approve') {
      // Update request and user in a transaction
      await db.$transaction([
        db.verificationRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            reviewedBy: authUser.userId,
            reviewedAt: new Date()
          }
        }),
        db.user.update({
          where: { id: verificationRequest.userId },
          data: {
            badgeType: badgeType || 'blue',
            isVerified: true
          }
        })
      ]);

      return NextResponse.json({ 
        message: 'Verification request approved',
        badgeType: badgeType || 'blue'
      });

    } else {
      // Reject the request
      await db.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedBy: authUser.userId,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason || null
        }
      });

      return NextResponse.json({ 
        message: 'Verification request rejected' 
      });
    }

  } catch (error) {
    console.error('Process verification request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
