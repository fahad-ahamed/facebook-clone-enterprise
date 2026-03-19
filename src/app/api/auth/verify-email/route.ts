import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import crypto from 'crypto';

// Request email verification
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    let userId = authUser?.userId;
    
    // If not authenticated, check for email in body
    if (!userId) {
      const body = await request.json();
      const { email } = body;
      
      if (!email) {
        return NextResponse.json({ error: 'Authentication or email required' }, { status: 400 });
      }
      
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ message: 'If an account exists, a verification email has been sent.' });
      }
      userId = user.id;
    }

    // Check if already verified
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user?.isVerified) {
      return NextResponse.json({ message: 'Email is already verified' });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create verification token
    await db.verificationToken.create({
      data: {
        userId,
        token,
        type: 'email_verification',
        expiresAt
      }
    });

    // In production, send email with verification link
    console.log(`Email verification token for user ${userId}: ${token}`);

    return NextResponse.json({ 
      message: 'Verification email sent',
      // Remove in production:
      devToken: process.env.NODE_ENV === 'development' ? token : undefined
    });

  } catch (error) {
    console.error('Request verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Verify email with token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find valid token
    const verificationRecord = await db.verificationToken.findFirst({
      where: {
        token,
        type: 'email_verification',
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verificationRecord) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Update user as verified
    await db.user.update({
      where: { id: verificationRecord.userId },
      data: { isVerified: true }
    });

    // Mark token as used
    await db.verificationToken.update({
      where: { id: verificationRecord.id },
      data: { used: true }
    });

    return NextResponse.json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
