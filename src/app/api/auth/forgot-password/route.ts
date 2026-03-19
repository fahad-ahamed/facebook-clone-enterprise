import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Generate 6-digit reset code
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
        message: 'If an account with that email exists, a password reset code has been sent.' 
      });
    }

    // Generate 6-digit reset code
    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create password reset record
    await db.passwordReset.create({
      data: {
        userId: user.id,
        token: resetCode,
        expiresAt
      }
    });

    // In production, send email with reset code
    // For demo, return the code (remove in production!)
    console.log(`Password reset code for ${email}: ${resetCode}`);

    return NextResponse.json({ 
      message: 'If an account with that email exists, a password reset code has been sent.',
      // Demo: show code in UI
      resetCode: resetCode
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
