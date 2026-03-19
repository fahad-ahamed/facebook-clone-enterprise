import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create password reset record
    await db.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    // In production, send email with reset link
    // For now, return the token (remove in production!)
    console.log(`Password reset token for ${email}: ${token}`);

    return NextResponse.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Remove this in production:
      devToken: process.env.NODE_ENV === 'development' ? token : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
