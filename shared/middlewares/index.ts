/**
 * Shared Middlewares
 * Export all middleware components
 * @module shared/middlewares
 */

// Authentication middleware
export {
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
  type AuthPayload,
  type AuthenticatedRequest,
  type AuthOptions,
} from './auth.middleware';

// Error handling middleware
export {
  AppError,
  ErrorCode,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  successResponse,
  errorResponse,
  withErrorHandler,
  asyncHandler,
  isOperationalError,
  formatValidationErrors,
  type ErrorResponse,
  type SuccessResponse,
  type ApiResponse,
} from './error.middleware';

// Validation middleware
export {
  validate,
  commonSchemas,
  sanitizeString,
  sanitizeObject,
  parseBody,
  parseQuery,
  parseParams,
  parseHeaders,
  type ValidationSchema,
  type ValidatedRequest,
  type ValidationTarget,
} from './validation.middleware';

// Logging middleware
export {
  loggingMiddleware,
  logRequest,
  logError,
  LogLevel,
  type RequestLogEntry,
  type LoggingConfig,
} from './logging.middleware';

// CORS middleware
export {
  corsMiddleware,
  addCorsHeaders,
  handlePreflight,
  getCorsOptions,
  validateOrigin,
  productionCorsOptions,
  developmentCorsOptions,
  type CorsOptions,
} from './cors.middleware';

// Rate limiting middleware
export {
  rateLimitMiddleware,
  loginRateLimit,
  registerRateLimit,
  createPostRateLimit,
  createCommentRateLimit,
  sendMessageRateLimit,
  searchRateLimit,
  apiRateLimit,
  uploadRateLimit,
  createRateLimiter,
  resetRateLimit,
  MemoryStore,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimitStore,
} from './rate-limit.middleware';

// Cache middleware
export {
  cacheMiddleware,
  shortCache,
  mediumCache,
  longCache,
  feedCache,
  profileCache,
  postCache,
  searchCache,
  invalidateCache,
  invalidateCacheByPattern,
  clearCache,
  createCacheMiddleware,
  getCacheStats,
  MemoryCacheStore,
  type CacheConfig,
  type CacheEntry,
  type CacheStore,
} from './cache.middleware';

/**
 * Compose multiple middlewares into a single middleware
 */
import { NextRequest, NextResponse } from 'next/server';

type Middleware = (
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
) => Promise<NextResponse>;

export function composeMiddleware(
  ...middlewares: Middleware[]
): Middleware {
  return async (request, handler) => {
    // Build middleware chain from right to left
    let currentHandler = handler;

    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i];
      const nextHandler = currentHandler;
      currentHandler = (req) => middleware(req, nextHandler);
    }

    return currentHandler(request);
  };
}

/**
 * Common middleware chain for API routes
 */
import { corsMiddleware } from './cors.middleware';
import { loggingMiddleware } from './logging.middleware';
import { apiRateLimit } from './rate-limit.middleware';

export const commonApiMiddleware = composeMiddleware(
  corsMiddleware(),
  loggingMiddleware(),
  apiRateLimit
);

/**
 * Protected API middleware chain (requires authentication)
 */
import { requireAuth } from './auth.middleware';

export const protectedApiMiddleware = composeMiddleware(
  corsMiddleware(),
  loggingMiddleware(),
  requireAuth,
  apiRateLimit
);
