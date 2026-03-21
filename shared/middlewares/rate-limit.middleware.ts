/**
 * Rate Limiting Middleware
 * Request rate limiting with multiple storage backends
 * @module shared/middlewares/rate-limit.middleware
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Key generator function */
  keyGenerator?: (request: NextRequest) => string;
  /** Custom error message */
  message?: string;
  /** Custom status code */
  statusCode?: number;
  /** Whether to skip rate limiting for certain requests */
  skip?: (request: NextRequest) => boolean;
  /** Headers to include in response */
  headers?: boolean;
  /** Prefix for rate limit keys */
  prefix?: string;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  /** Total hits in current window */
  totalHits: number;
  /** Time remaining in current window */
  timeRemaining: number;
  /** Whether limit is exceeded */
  isExceeded: boolean;
  /** Reset time as Unix timestamp */
  resetTime: number;
}

/**
 * Storage interface for rate limit tracking
 */
export interface RateLimitStore {
  increment(key: string): Promise<RateLimitInfo>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  get(key: string): Promise<RateLimitInfo | undefined>;
}

/**
 * In-memory rate limit store
 * Suitable for single-instance deployments
 */
export class MemoryStore implements RateLimitStore {
  private hits: Map<string, { count: number; resetTime: number }> = new Map();
  private timer?: NodeJS.Timeout;

  constructor(private windowMs: number) {
    // Clean up expired entries periodically
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.hits.entries()) {
        if (value.resetTime < now) {
          this.hits.delete(key);
        }
      }
    }, windowMs);
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    let record = this.hits.get(key);

    if (!record || record.resetTime < now) {
      record = {
        count: 1,
        resetTime: now + this.windowMs,
      };
    } else {
      record.count++;
    }

    this.hits.set(key, record);

    return {
      totalHits: record.count,
      timeRemaining: Math.max(0, record.resetTime - now),
      isExceeded: record.count > Math.floor(this.windowMs / 1000), // Will be set by middleware
      resetTime: record.resetTime,
    };
  }

  async decrement(key: string): Promise<void> {
    const record = this.hits.get(key);
    if (record) {
      record.count = Math.max(0, record.count - 1);
      if (record.count === 0) {
        this.hits.delete(key);
      }
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  async get(key: string): Promise<RateLimitInfo | undefined> {
    const record = this.hits.get(key);
    if (!record || record.resetTime < Date.now()) {
      return undefined;
    }

    return {
      totalHits: record.count,
      timeRemaining: Math.max(0, record.resetTime - Date.now()),
      isExceeded: false,
      resetTime: record.resetTime,
    };
  }

  cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.hits.clear();
  }
}

/**
 * Global store instance
 */
let globalStore: MemoryStore | null = null;

/**
 * Get or create store instance
 */
function getStore(windowMs: number): MemoryStore {
  if (!globalStore) {
    globalStore = new MemoryStore(windowMs);
  }
  return globalStore;
}

/**
 * Default key generator - uses IP + User ID + Path
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userId = request.headers.get('x-user-id') || 'anonymous';
  const path = request.nextUrl.pathname;

  return `${ip}:${userId}:${path}`;
}

/**
 * Rate limit middleware factory
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skip,
    headers = true,
    prefix = 'rl:',
  } = config;

  const store = getStore(windowMs);

  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip rate limiting if skip function returns true
    if (skip?.(request)) {
      return handler(request);
    }

    const key = prefix + keyGenerator(request);
    const info = await store.increment(key);
    const isExceeded = info.totalHits > max;

    // Update exceeded status
    const limitInfo: RateLimitInfo = {
      ...info,
      isExceeded,
    };

    if (isExceeded) {
      const response = NextResponse.json(
        {
          success: false,
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(limitInfo.timeRemaining / 1000),
        },
        { status: statusCode }
      );

      if (headers) {
        response.headers.set('X-RateLimit-Limit', max.toString());
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set(
          'X-RateLimit-Reset',
          new Date(limitInfo.resetTime).toISOString()
        );
        response.headers.set(
          'Retry-After',
          Math.ceil(limitInfo.timeRemaining / 1000).toString()
        );
      }

      return response;
    }

    // Process request
    const response = await handler(request);

    // Add rate limit headers to response
    if (headers) {
      response.headers.set('X-RateLimit-Limit', max.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        Math.max(0, max - limitInfo.totalHits).toString()
      );
      response.headers.set(
        'X-RateLimit-Reset',
        new Date(limitInfo.resetTime).toISOString()
      );
    }

    return response;
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Login rate limit: 10 requests per 15 minutes
export const loginRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many login attempts, please try again in 15 minutes.',
  prefix: 'login:',
  keyGenerator: (request) => {
    // Rate limit by IP only for login
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    return ip;
  },
});

// Registration rate limit: 5 requests per hour
export const registerRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many registration attempts, please try again in an hour.',
  prefix: 'register:',
  keyGenerator: (request) => {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    return ip;
  },
});

// Post creation rate limit: 10 posts per minute
export const createPostRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'You are posting too quickly. Please wait before posting again.',
  prefix: 'post:',
});

// Comment rate limit: 30 comments per minute
export const createCommentRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'You are commenting too quickly. Please wait before commenting again.',
  prefix: 'comment:',
});

// Message rate limit: 60 messages per minute
export const sendMessageRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'You are sending messages too quickly.',
  prefix: 'message:',
});

// Search rate limit: 30 searches per minute
export const searchRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many search requests. Please wait before searching again.',
  prefix: 'search:',
});

// API rate limit: 100 requests per minute (general)
export const apiRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'API rate limit exceeded.',
  prefix: 'api:',
});

// Upload rate limit: 20 uploads per hour
export const uploadRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many uploads. Please try again later.',
  prefix: 'upload:',
});

/**
 * Create custom rate limiter
 */
export function createRateLimiter(options: Partial<RateLimitConfig>) {
  return rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute default
    max: 60, // 60 requests default
    ...options,
  });
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<void> {
  if (globalStore) {
    await globalStore.resetKey(key);
  }
}

export default {
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
};
