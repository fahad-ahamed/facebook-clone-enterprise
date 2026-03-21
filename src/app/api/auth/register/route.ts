import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail, getVerificationEmailHtml, isEmailConfigured } from '@/lib/email';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, dateOfBirth, gender, phone, country } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    const randomSuffix = Math.floor(Math.random() * 9999);
    const username = `${baseUsername}${randomSuffix}`;

    // Generate 6-digit verification code
    const verificationCode = generateVerificationCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user (not verified yet)
    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        username,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        phone: phone || null,
        country: country || null,
        isVerified: false
      }
    });

    // Store verification code
    await db.verificationToken.create({
      data: {
        userId: user.id,
        token: verificationCode,
        type: 'email_verification',
        expiresAt: codeExpiresAt
      }
    });

    // Send verification email
    let emailSent = false;
    let emailError: string | undefined = undefined;
    
    if (isEmailConfigured()) {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Verify Your Email - Facebook Clone',
        html: getVerificationEmailHtml(verificationCode, firstName)
      });
      emailSent = emailResult.success;
      emailError = emailResult.error;
    }

    const { password: _, ...userWithoutPassword } = user;
    
    // Return response based on email configuration
    if (emailSent) {
      // Real email was sent
      return NextResponse.json({
        message: 'Registration successful. Please check your email for the verification code.',
        user: userWithoutPassword,
        requiresVerification: true,
        emailSent: true
      }, { status: 201 });
    } else {
      // Email service not configured or failed - return code in response for demo
      return NextResponse.json({
        message: 'Registration successful. Please verify your email.',
        user: userWithoutPassword,
        verificationCode: verificationCode, // Only shown if email failed
        requiresVerification: true,
        emailSent: false,
        emailError: emailError || 'Email service not configured. Please add RESEND_API_KEY to .env file.'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
