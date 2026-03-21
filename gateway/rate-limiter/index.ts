/**
 * Rate Limiter Middleware
 * Token bucket algorithm with Redis backend
 * Supports user-based, IP-based, and endpoint-specific limits
 */

import { Request, Response, NextFunction } from 'express';
import { RedisClient } from '../../services/cache-system/redis';

const redis = new RedisClient();

// Rate limit configurations
interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipCondition?: (req: Request) => boolean;
}

// Default rate limits
const DEFAULT_LIMITS: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
};

// Endpoint-specific rate limits
const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  '/api/v1/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 per 15 min
  '/api/v1/auth/register': { windowMs: 60 * 60 * 1000, maxRequests: 3 },   // 3 per hour
  '/api/v1/auth/forgot-password': { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  
  // Content creation endpoints
  '/api/v1/posts': { windowMs: 60 * 1000, maxRequests: 30 },
  '/api/v1/posts/[id]/comment': { windowMs: 60 * 1000, maxRequests: 60 },
  '/api/v1/stories': { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  
  // Chat endpoints
  '/api/v1/chat/messages': { windowMs: 60 * 1000, maxRequests: 100 },
  
  // Search endpoints
  '/api/v1/search': { windowMs: 60 * 1000, maxRequests: 60 },
  
  // Upload endpoints
  '/api/v1/upload': { windowMs: 60 * 60 * 1000, maxRequests: 50 },
  
  // Admin endpoints
  '/api/v1/admin': { windowMs: 60 * 1000, maxRequests: 200 },
};

// Rate limit response interface
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Generate rate limit key based on user ID or IP
 */
function generateKey(req: Request, prefix: string): string {
  const user = (req as any).user;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Use user ID if authenticated, otherwise IP
  const identifier = user?.id || ip;
  
  return `ratelimit:${prefix}:${identifier}`;
}

/**
 * Check rate limit using token bucket algorithm
 */
async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; info: RateLimitInfo }> {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const redisKey = `${key}:${window}`;
  
  // Get current count
  const current = await redis.incr(redisKey);
  
  // Set expiry on first request
  if (current === 1) {
    await redis.expire(redisKey, Math.ceil(windowMs / 1000));
  }
  
  const remaining = Math.max(0, limit - current);
  const reset = (window + 1) * windowMs;
  
  return {
    allowed: current <= limit,
    info: {
      limit,
      remaining,
      reset,
      retryAfter: current > limit ? Math.ceil(windowMs / 1000) : undefined,
    },
  };
}

/**
 * Main rate limiter middleware
 */
export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get endpoint-specific config or use default
    const endpoint = Object.keys(ENDPOINT_LIMITS).find(ep => 
      req.path.startsWith(ep.replace('[id]', '').replace('[...]', ''))
    );
    
    const config = endpoint ? ENDPOINT_LIMITS[endpoint] : DEFAULT_LIMITS;
    
    // Skip if condition met
    if (config.skipCondition?.(req)) {
      return next();
    }
    
    // Generate rate limit key
    const key = config.keyGenerator 
      ? config.keyGenerator(req) 
      : generateKey(req, req.path);
    
    // Check rate limit
    const { allowed, info } = await checkRateLimit(
      key,
      config.maxRequests,
      config.windowMs
    );
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', info.limit);
    res.setHeader('X-RateLimit-Remaining', info.remaining);
    res.setHeader('X-RateLimit-Reset', info.reset);
    
    if (!allowed) {
      res.setHeader('Retry-After', info.retryAfter || 60);
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: info.retryAfter,
          limit: info.limit,
          reset: new Date(info.reset).toISOString(),
        },
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow request through (fail open)
    next();
  }
}

/**
 * Create custom rate limiter
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = config.keyGenerator 
        ? config.keyGenerator(req) 
        : generateKey(req, 'custom');
      
      const { allowed, info } = await checkRateLimit(
        key,
        config.maxRequests,
        config.windowMs
      );
      
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', info.remaining);
      res.setHeader('X-RateLimit-Reset', info.reset);
      
      if (!allowed) {
        res.setHeader('Retry-After', info.retryAfter || 60);
        
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            retryAfter: info.retryAfter,
          },
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next();
    }
  };
}

/**
 * Sliding window rate limiter (more accurate)
 */
export async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; info: RateLimitInfo }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Use Redis sorted set for sliding window
  const redisKey = `sliding:${key}`;
  
  // Remove old entries
  await redis.zremrangebyscore(redisKey, 0, windowStart);
  
  // Count current entries
  const count = await redis.zcard(redisKey);
  
  if (count >= limit) {
    // Get oldest entry to calculate retry time
    const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
    const oldestTime = oldest[1] ? parseInt(oldest[1]) : now;
    const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);
    
    return {
      allowed: false,
      info: {
        limit,
        remaining: 0,
        reset: oldestTime + windowMs,
        retryAfter,
      },
    };
  }
  
  // Add current request
  await redis.zadd(redisKey, now, `${now}:${Math.random()}`);
  await redis.expire(redisKey, Math.ceil(windowMs / 1000));
  
  return {
    allowed: true,
    info: {
      limit,
      remaining: limit - count - 1,
      reset: now + windowMs,
    },
  };
}

export default rateLimiter;
