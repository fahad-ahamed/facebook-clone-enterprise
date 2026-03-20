/**
 * Authentication Middleware
 *
 * Provides authentication middleware for the REST API Gateway.
 * Validates JWT tokens, manages user sessions, and handles OAuth.
 *
 * @module gateway/rest/middlewares/auth
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import httpContext from 'express-http-context';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_ISSUER = process.env.JWT_ISSUER || 'facebook-clone';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'facebook-clone-users';

// User payload interface
export interface UserPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

// Extended request interface
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  token?: string;
}

// Token verification options
const verifyOptions: jwt.VerifyOptions = {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: ['HS256']
};

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verify and decode JWT token
 */
async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, verifyOptions) as UserPayload;

    // Additional validation
    if (!decoded.userId || !decoded.email) {
      return null;
    }

    // Check if token is expired (belt and suspenders)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.debug('Token expired:', error.expiredAt);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.debug('Invalid token:', error.message);
    } else if (error instanceof jwt.NotBeforeError) {
      console.debug('Token not active yet:', error.date);
    }
    return null;
  }
}

/**
 * Authentication middleware
 *
 * Validates JWT tokens from the Authorization header and attaches
 * the user payload to the request object.
 *
 * Usage:
 * - Protected routes: router.get('/protected', authMiddleware, handler)
 * - Optional auth: router.get('/optional', optionalAuthMiddleware, handler)
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from header
    const token = extractBearerToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required'
        }
      });
      return;
    }

    // Verify token
    const user = await verifyToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token'
        }
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    // Store in context for logging
    httpContext.set('userId', user.userId);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'An error occurred during authentication'
      }
    });
  }
};

/**
 * Optional authentication middleware
 *
 * Similar to authMiddleware but doesn't reject requests without tokens.
 * Useful for endpoints that work differently for authenticated/unauthenticated users.
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        req.user = user;
        req.token = token;
        httpContext.set('userId', user.userId);
      }
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Admin authentication middleware
 *
 * Requires the user to have admin privileges.
 * Must be used after authMiddleware.
 */
export const adminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    // TODO: Check admin role from database or token claims
    // For now, we'll check for an admin claim in the token
    // const isAdmin = await checkAdminRole(req.user.userId);
    // if (!isAdmin) { ... }

    // Placeholder - in production, verify admin role
    const adminUsers = (process.env.ADMIN_USER_IDS || '').split(',');
    if (!adminUsers.includes(req.user.userId)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'An error occurred during authorization'
      }
    });
  }
};

/**
 * Role-based access control middleware factory
 *
 * Creates a middleware that checks for specific roles.
 */
export const requireRoles = (...roles: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }

      // TODO: Get user roles from database or token
      // const userRoles = await getUserRoles(req.user.userId);
      // const hasRole = roles.some(role => userRoles.includes(role));

      // Placeholder implementation
      const userRoles = ['user']; // Default role
      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Required roles: ${roles.join(', ')}`
          }
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'An error occurred during authorization'
        }
      });
    }
  };
};

/**
 * Resource ownership middleware factory
 *
 * Creates a middleware that checks if the user owns the resource.
 */
export const requireOwnership = (getResourceOwnerId: (req: AuthenticatedRequest) => Promise<string | null>) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
        return;
      }

      const resourceOwnerId = await getResourceOwnerId(req);

      if (!resourceOwnerId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found'
          }
        });
        return;
      }

      if (resourceOwnerId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource'
          }
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'An error occurred during authorization'
        }
      });
    }
  };
};

/**
 * Token refresh middleware
 *
 * Checks if token is close to expiration and adds refresh header.
 */
export const tokenRefreshMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user && req.token) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = req.user.exp - now;

      // If token expires in less than 15 minutes, suggest refresh
      if (timeUntilExpiry > 0 && timeUntilExpiry < 900) {
        res.setHeader('X-Token-Refresh-Recommended', 'true');
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Export all middlewares
export default authMiddleware;
