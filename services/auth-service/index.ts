/**
 * Authentication Service
 * Handles user authentication, authorization, and session management
 */

export * from './oauth';
export * from './jwt';
export * from './session-management';
export * from './2fa';
export * from './device-tracking';

// Auth Service Configuration
export interface AuthServiceConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptSaltRounds: number;
  sessionTimeout: number;
  maxDevices: number;
  twoFactorRequired: boolean;
}

// Default configuration
export const defaultAuthConfig: AuthServiceConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: '7d',
  refreshTokenExpiresIn: '30d',
  bcryptSaltRounds: 12,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxDevices: 5,
  twoFactorRequired: false,
};

// Auth Service Main Class
export class AuthService {
  private config: AuthServiceConfig;

  constructor(config: Partial<AuthServiceConfig> = {}) {
    this.config = { ...defaultAuthConfig, ...config };
  }

  // Main authentication methods
  async signup(data: SignupData): Promise<AuthResult> {
    // Implementation in ./routes/signup.ts
    throw new Error('Use specific route handlers');
  }

  async login(email: string, password: string): Promise<AuthResult> {
    // Implementation in ./routes/login.ts
    throw new Error('Use specific route handlers');
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    // Implementation in ./routes/logout.ts
    throw new Error('Use specific route handlers');
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Implementation in ./routes/refresh.ts
    throw new Error('Use specific route handlers');
  }
}

// Type definitions
export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  phone?: string;
  country?: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
  };
  tokens?: TokenPair;
  error?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
