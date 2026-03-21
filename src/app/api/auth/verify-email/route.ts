import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, getVerificationEmailHtml, isEmailConfigured } from '@/lib/email';

// Verify email with 6-digit code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: 'Email is already verified', user });
    }

    // Find valid verification code
    const verificationRecord = await db.verificationToken.findFirst({
      where: {
        userId: user.id,
        token: code,
        type: 'email_verification',
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verificationRecord) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Update user as verified
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { isVerified: true }
    });

    // Mark token as used
    await db.verificationToken.update({
      where: { id: verificationRecord.id },
      data: { used: true }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({ 
      message: 'Email verified successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Request new verification code (Resend)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: 'If an account exists, a new code has been sent.' });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: 'Email is already verified' });
    }

    // Generate new 6-digit code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new verification token
    await db.verificationToken.create({
      data: {
        userId: user.id,
        token: newCode,
        type: 'email_verification',
        expiresAt
      }
    });

    // Send verification email
    let emailSent = false;
    let emailError: string | undefined = undefined;

    if (isEmailConfigured()) {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Your New Verification Code - Facebook Clone',
        html: getVerificationEmailHtml(newCode, user.firstName)
      });
      emailSent = emailResult.success;
      emailError = emailResult.error;
    }

    if (emailSent) {
      return NextResponse.json({ 
        message: 'New verification code sent to your email',
        emailSent: true
      });
    } else {
      // Email service not configured or failed - return code in response for demo
      return NextResponse.json({ 
        message: 'New verification code generated',
        verificationCode: newCode, // Only shown if email failed
        emailSent: false,
        emailError: emailError || 'Email service not configured. Please add RESEND_API_KEY to .env file.'
      });
    }

  } catch (error) {
    console.error('Resend verification error:', error);
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
