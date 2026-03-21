import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Email sender function using Resend
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'Facebook Clone <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Email sending exception:', error);
    return { success: false, error: String(error) };
  }
}

// Generate verification email HTML
export function getVerificationEmailHtml(code: string, firstName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #1877F2; padding: 20px; text-align: center;">
          <div style="display: inline-block; width: 40px; height: 40px; background-color: white; border-radius: 50%; line-height: 40px;">
            <span style="color: #1877F2; font-size: 24px; font-weight: bold;">f</span>
          </div>
          <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px;">Facebook Clone</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${firstName},</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for registering! Please verify your email address by entering the following code:
          </p>
          
          <!-- Code Box -->
          <div style="background: linear-gradient(135deg, #1877F2, #42b883); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
            <div style="background-color: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
          </p>
          
          <!-- Footer Note -->
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #666; font-size: 13px; margin: 0;">
              <strong>Need help?</strong> If you're having trouble, please contact our support team.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Facebook Clone. All rights reserved.<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate password reset email HTML
export function getPasswordResetEmailHtml(code: string, firstName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #1877F2; padding: 20px; text-align: center;">
          <div style="display: inline-block; width: 40px; height: 40px; background-color: white; border-radius: 50%; line-height: 40px;">
            <span style="color: #1877F2; font-size: 24px; font-weight: bold;">f</span>
          </div>
          <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px;">Facebook Clone</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Hi ${firstName},</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password. Use the following code to proceed:
          </p>
          
          <!-- Code Box -->
          <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Your password reset code is:</p>
            <div style="background-color: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: white; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This code will expire in 10 minutes. If you didn't request this password reset, you can safely ignore this email.
          </p>
          
          <!-- Security Note -->
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
            <p style="color: #856404; font-size: 13px; margin: 0;">
              <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your password or verification codes.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Facebook Clone. All rights reserved.<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Check if email service is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
