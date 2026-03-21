/**
 * Two-Factor Authentication Service
 * Handles 2FA setup, verification, and management
 */

import * as crypto from 'crypto';

export type TwoFactorMethod = 'totp' | 'sms' | 'email' | 'backup_codes';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  method: TwoFactorMethod;
}

export interface TwoFactorConfig {
  issuer: string;
  digits: number;
  period: number;
  window: number;
  backupCodeCount: number;
}

export class TwoFactorService {
  private config: TwoFactorConfig;

  constructor(config: Partial<TwoFactorConfig> = {}) {
    this.config = {
      issuer: 'Facebook Clone',
      digits: 6,
      period: 30,
      window: 1,
      backupCodeCount: 10,
      ...config,
    };
  }

  /**
   * Generate TOTP secret
   */
  generateSecret(userId: string, email: string): string {
    const secret = crypto.randomBytes(20).toString('base64').replace(/[=+\/]/g, '');
    return secret;
  }

  /**
   * Generate QR Code URL for authenticator apps
   */
  generateQRCodeUrl(secret: string, email: string): string {
    const issuer = encodeURIComponent(this.config.issuer);
    const accountName = encodeURIComponent(email);
    return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&digits=${this.config.digits}&period=${this.config.period}`;
  }

  /**
   * Setup 2FA for user
   */
  async setupTwoFactor(userId: string, email: string): Promise<TwoFactorSetup> {
    const secret = this.generateSecret(userId, email);
    const qrCodeUrl = this.generateQRCodeUrl(secret, email);
    const backupCodes = this.generateBackupCodes();

    return {
      secret,
      qrCodeUrl,
      backupCodes,
      method: 'totp',
    };
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(secret: string, code: string): boolean {
    const time = Math.floor(Date.now() / 1000 / this.config.period);
    
    // Check current time and window
    for (let i = -this.config.window; i <= this.config.window; i++) {
      const expectedCode = this.generateTOTP(secret, time + i);
      if (this.constantTimeCompare(code, expectedCode)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate TOTP code
   */
  private generateTOTP(secret: string, time: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(time), 0);
    
    const secretBuffer = Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(buffer);
    const hmacResult = hmac.digest();
    
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const code = (
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff)
    ) % Math.pow(10, this.config.digits);
    
    return code.toString().padStart(this.config.digits, '0');
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodeCount; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Hash backup codes for storage
   */
  hashBackupCodes(codes: string[]): string[] {
    return codes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(hashedCodes: string[], code: string): { valid: boolean; remainingCodes: string[] } {
    const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
    const index = hashedCodes.indexOf(hashedInput);
    
    if (index === -1) {
      return { valid: false, remainingCodes: hashedCodes };
    }
    
    const remainingCodes = hashedCodes.filter((_, i) => i !== index);
    return { valid: true, remainingCodes };
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(phoneNumber: string): Promise<{ success: boolean; code?: string }> {
    const code = this.generateNumericCode(6);
    // In production, integrate with SMS provider (Twilio, etc.)
    console.log(`[2FA SMS] Sending code ${code} to ${phoneNumber}`);
    return { success: true, code }; // Return code for testing
  }

  /**
   * Send Email verification code
   */
  async sendEmailCode(email: string): Promise<{ success: boolean; code?: string }> {
    const code = this.generateNumericCode(6);
    // In production, integrate with email service
    console.log(`[2FA Email] Sending code ${code} to ${email}`);
    return { success: true, code }; // Return code for testing
  }

  /**
   * Generate numeric code
   */
  private generateNumericCode(digits: number): string {
    return Array.from({ length: digits }, () => 
      Math.floor(Math.random() * 10)
    ).join('');
  }

  /**
   * Constant time comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

export const twoFactorService = new TwoFactorService();
