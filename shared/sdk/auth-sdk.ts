/**
 * Auth SDK
 * Authentication service client
 * @module shared/sdk/auth-sdk
 */

import { HttpClient } from './base-client';
import {
  AuthResponse,
  AuthTokens,
  AuthCredentials,
  RegistrationData,
  UserResponse,
  ApiResponse,
} from './types';

/**
 * Auth SDK configuration
 */
export interface AuthSdkConfig {
  /** Base URL for auth service */
  baseUrl: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Verification response
 */
export interface VerificationResponse {
  success: boolean;
  message: string;
  emailSent?: boolean;
  verificationCode?: string; // For demo purposes
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  email: string;
  code: string;
  newPassword: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Auth SDK client
 */
export class AuthSdk {
  private client: HttpClient;

  constructor(config: AuthSdkConfig) {
    this.client = new HttpClient({
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string | null): void {
    this.client.setAccessToken(token);
  }

  /**
   * Login with email and password
   */
  async login(credentials: AuthCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post<AuthResponse>('/api/auth/login', credentials, {
      authenticate: false,
    });

    if (response.success && response.data?.tokens?.accessToken) {
      this.setAccessToken(response.data.tokens.accessToken);
    }

    return response;
  }

  /**
   * Register new user
   */
  async register(data: RegistrationData): Promise<ApiResponse<AuthResponse | VerificationResponse>> {
    return this.client.post<AuthResponse | VerificationResponse>(
      '/api/auth/register',
      data,
      { authenticate: false }
    );
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.post<{ message: string }>('/api/auth/logout');
    this.setAccessToken(null);
    return response;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<UserResponse>> {
    return this.client.get<UserResponse>('/api/auth/me');
  }

  /**
   * Verify email with code
   */
  async verifyEmail(email: string, code: string): Promise<ApiResponse<VerificationResponse>> {
    return this.client.post<VerificationResponse>(
      '/api/auth/verify-email',
      { email, code },
      { authenticate: false }
    );
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<ApiResponse<VerificationResponse>> {
    return this.client.put<VerificationResponse>(
      '/api/auth/verify-email',
      { email },
      { authenticate: false }
    );
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse<VerificationResponse>> {
    return this.client.post<VerificationResponse>(
      '/api/auth/forgot-password',
      { email },
      { authenticate: false }
    );
  }

  /**
   * Verify reset code
   */
  async verifyResetCode(email: string, code: string): Promise<ApiResponse<{ valid: boolean }>> {
    return this.client.put<{ valid: boolean }>(
      '/api/auth/reset-password',
      { email, code },
      { authenticate: false }
    );
  }

  /**
   * Reset password with code
   */
  async resetPassword(data: PasswordResetConfirm): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(
      '/api/auth/reset-password',
      data,
      { authenticate: false }
    );
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(
      '/api/auth/change-password',
      data
    );
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return this.client.post<AuthTokens>(
      '/api/auth/refresh',
      { refreshToken },
      { authenticate: false }
    );
  }

  /**
   * Check if email exists
   */
  async checkEmail(email: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.client.get<{ exists: boolean }>(
      '/api/auth/check-email',
      { email }
    );
  }

  /**
   * Check if username is available
   */
  async checkUsername(username: string): Promise<ApiResponse<{ available: boolean }>> {
    return this.client.get<{ available: boolean }>(
      '/api/users/check-username',
      { username }
    );
  }
}

/**
 * Create Auth SDK instance
 */
export function createAuthSdk(config: AuthSdkConfig): AuthSdk {
  return new AuthSdk(config);
}

/**
 * Default Auth SDK instance
 */
export const authSdk = createAuthSdk({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
});

export default {
  AuthSdk,
  createAuthSdk,
  authSdk,
};
