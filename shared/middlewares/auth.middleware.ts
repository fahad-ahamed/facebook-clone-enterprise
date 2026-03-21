/**
 * Authentication Middleware
 * Handles JWT verification, session validation, and user authentication
 * @module shared/middlewares/auth.middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_ALGORITHM = 'HS256';

/**
 * User payload extracted from JWT token
 */
export interface AuthPayload {
  userId: string;
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

/**
 * Extended request with authenticated user
 */
export interface AuthenticatedRequest extends NextRequest {
  user?: AuthPayload;
}

/**
 * Authentication options
 */
export interface AuthOptions {
  /** Whether authentication is required (default: true) */
  required?: boolean;
  /** Allowed roles for the route */
  roles?: string[];
  /** Custom error message */
  errorMessage?: string;
  /** Skip authentication for certain paths */
  skipPaths?: string[];
}

/**
 * Default authentication options
 */
const DEFAULT_OPTIONS: AuthOptions = {
  required: true,
  roles: [],
  errorMessage: 'Authentication required',
  skipPaths: ['/api/health', '/api/auth/login', '/api/auth/register'],
};

/**
 * Extract token from request headers or cookies
 */
export function extractToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies as fallback
  const tokenFromCookie = request.cookies.get('token')?.value;
  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  // Check custom header
  const customToken = request.headers.get('x-auth-token');
  if (customToken) {
    return customToken;
  }

  return null;
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as AuthPayload;

    // Check if token is expired (additional check)
    if (decoded.exp * 1000 < Date.now()) {
      return null;
    }

    return decoded;
  } catch (error) {
    // Token verification failed - invalid or expired
    if (error instanceof Error) {
      console.error(`[Auth] Token verification failed: ${error.message}`);
    }
    return null;
  }
}

/**
 * Authentication middleware factory
 * Creates middleware with specified options
 */
export function authMiddleware(options: AuthOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async function (
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip authentication for specified paths
    const pathname = request.nextUrl.pathname;
    if (opts.skipPaths?.some(path => pathname.startsWith(path))) {
      return handler(request as AuthenticatedRequest);
    }

    // Extract token from request
    const token = extractToken(request);

    if (!token) {
      if (!opts.required) {
        return handler(request as AuthenticatedRequest);
      }
      return NextResponse.json(
        {
          success: false,
          error: opts.errorMessage || 'Authentication required',
          code: 'AUTH_TOKEN_MISSING',
        },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
          code: 'AUTH_TOKEN_INVALID',
        },
        { status: 401 }
      );
    }

    // Check roles if specified
    if (opts.roles && opts.roles.length > 0) {
      const userRole = payload.role || 'user';
      if (!opts.roles.includes(userRole)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient permissions',
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          },
          { status: 403 }
        );
      }
    }

    // Attach user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = payload;

    // Continue to handler
    return handler(authenticatedRequest);
  };
}

/**
 * Require authentication - shorthand middleware
 */
export const requireAuth = authMiddleware({ required: true });

/**
 * Optional authentication - continues even if not authenticated
 */
export const optionalAuth = authMiddleware({ required: false });

/**
 * Require admin role
 */
export const requireAdmin = authMiddleware({
  required: true,
  roles: ['admin'],
  errorMessage: 'Admin access required',
});

/**
 * Require moderator or admin role
 */
export const requireModerator = authMiddleware({
  required: true,
  roles: ['admin', 'moderator'],
  errorMessage: 'Moderator access required',
});

/**
 * Create authenticated headers for internal API calls
 */
export function createAuthHeaders(payload: AuthPayload): Record<string, string> {
  return {
    'x-user-id': payload.userId,
    'x-user-email': payload.email,
    'x-user-role': payload.role || 'user',
  };
}

/**
 * Extract user info from internal headers (for service-to-service calls)
 */
export function extractUserFromHeaders(headers: Headers): Partial<AuthPayload> | null {
  const userId = headers.get('x-user-id');
  const email = headers.get('x-user-email');
  const role = headers.get('x-user-role');

  if (!userId) {
    return null;
  }

  return {
    userId,
    email: email || undefined,
    role: role || undefined,
  };
}

/**
 * Check if user owns a resource
 */
export function isResourceOwner(
  request: AuthenticatedRequest,
  resourceOwnerId: string
): boolean {
  return request.user?.userId === resourceOwnerId;
}

/**
 * Check if user can access resource (owner or admin)
 */
export function canAccessResource(
  request: AuthenticatedRequest,
  resourceOwnerId: string
): boolean {
  const user = request.user;
  if (!user) return false;

  // Admin can access everything
  if (user.role === 'admin') return true;

  // User can access their own resources
  return user.userId === resourceOwnerId;
}

export default {
  authMiddleware,
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireModerator,
  extractToken,
  verifyToken,
  createAuthHeaders,
  extractUserFromHeaders,
  isResourceOwner,
  canAccessResource,
};
