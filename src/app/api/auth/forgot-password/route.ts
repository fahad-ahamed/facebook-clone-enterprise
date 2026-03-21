import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, getPasswordResetEmailHtml, isEmailConfigured } from '@/lib/email';

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

    // Send password reset email
    let emailSent = false;
    let emailError: string | undefined = undefined;

    if (isEmailConfigured()) {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Reset Your Password - Facebook Clone',
        html: getPasswordResetEmailHtml(resetCode, user.firstName)
      });
      emailSent = emailResult.success;
      emailError = emailResult.error;
    }

    if (emailSent) {
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset code has been sent.',
        emailSent: true
      });
    } else {
      // Email service not configured or failed - return code in response for demo
      return NextResponse.json({ 
        message: 'If an account with that email exists, a password reset code has been sent.',
        resetCode: resetCode, // Only shown if email failed
        emailSent: false,
        emailError: emailError || 'Email service not configured. Please add RESEND_API_KEY to .env file.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
