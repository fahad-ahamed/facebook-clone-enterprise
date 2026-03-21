import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Reset password with 6-digit code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are required' }, { status: 400 });
    }

    // Validate password
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid reset request' }, { status: 400 });
    }

    // Find valid reset code
    const resetRecord = await db.passwordReset.findFirst({
      where: {
        userId: user.id,
        token: code,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword }
    });

    // Mark code as used
    await db.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    });

    return NextResponse.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Verify reset code
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ valid: false });
    }

    const resetRecord = await db.passwordReset.findFirst({
      where: {
        userId: user.id,
        token: code,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired code' });
    }

    return NextResponse.json({ valid: true });

  } catch (error) {
    console.error('Verify reset code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Legacy GET endpoint for token-based verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const resetRecord = await db.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired token' });
    }

    return NextResponse.json({ valid: true });

  } catch (error) {
    console.error('Verify reset token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
