/**
 * JWT Service
 * Handles JWT token generation, verification, and management
 */

import { SignJWT, jwtVerify, decodeJwt } from 'jose';

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  subject?: string;
}

export class JWTService {
  private secret: Uint8Array;
  private algorithm: string = 'HS256';
  private defaultExpiresIn: string = '7d';
  private refreshExpiresIn: string = '30d';

  constructor(secret: string = process.env.JWT_SECRET || 'default-secret-change-in-production') {
    this.secret = new TextEncoder().encode(secret);
  }

  /**
   * Generate access token
   */
  async generateAccessToken(
    payload: Omit<JWTPayload, 'iat' | 'exp'>,
    options: TokenOptions = {}
  ): Promise<string> {
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setExpirationTime(options.expiresIn || this.defaultExpiresIn)
      .sign(this.secret);
    
    return token;
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(
    payload: { userId: string; sessionId: string },
    options: TokenOptions = {}
  ): Promise<string> {
    const token = await new SignJWT({ ...payload, type: 'refresh' })
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setExpirationTime(this.refreshExpiresIn)
      .sign(this.secret);
    
    return token;
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(
    payload: Omit<JWTPayload, 'iat' | 'exp'>,
    sessionId: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken({
      userId: payload.userId,
      sessionId,
    });
    
    const decoded = decodeJwt(accessToken);
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Verify and decode token
   */
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as JWTPayload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return decodeJwt(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    return new Date(decoded.exp * 1000);
  }

  /**
   * Extract user ID from token
   */
  extractUserId(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.userId || null;
  }

  /**
   * Validate token structure
   */
  validateTokenStructure(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3;
  }
}

export const jwtService = new JWTService();
