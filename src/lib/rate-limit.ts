/**
 * Rate Limiting Middleware for Facebook Clone
 * Uses in-memory store for simplicity (should use Redis in production)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string; // Custom error message
  keyGenerator?: (identifier: string) => string; // Custom key generator
}

export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.'
};

// Different rate limits for different endpoints
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Auth endpoints - stricter limits
  login: { windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please try again in 15 minutes.' },
  register: { windowMs: 60 * 60 * 1000, max: 5, message: 'Too many registration attempts. Please try again in an hour.' },
  
  // Content creation
  post: { windowMs: 60 * 1000, max: 10, message: 'You are posting too quickly. Please slow down.' },
  comment: { windowMs: 60 * 1000, max: 30, message: 'You are commenting too quickly. Please slow down.' },
  message: { windowMs: 60 * 1000, max: 60, message: 'You are sending messages too quickly.' },
  
  // Reactions
  reaction: { windowMs: 60 * 1000, max: 100, message: 'Slow down with reactions.' },
  
  // Search
  search: { windowMs: 60 * 1000, max: 30, message: 'Too many search requests.' },
  
  // Friend requests
  friendRequest: { windowMs: 60 * 60 * 1000, max: 50, message: 'You have sent too many friend requests.' },
  
  // Default
  default: defaultRateLimitConfig
};

/**
 * Check rate limit for a given identifier and endpoint
 * Returns null if allowed, or an object with error details if rate limited
 */
export function checkRateLimit(
  identifier: string, 
  endpoint: string = 'default'
): { limited: true; retryAfter: number; message: string } | { limited: false } {
  const config = rateLimitConfigs[endpoint] || rateLimitConfigs.default;
  const key = config.keyGenerator ? config.keyGenerator(identifier) : `${endpoint}:${identifier}`;
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return { limited: false };
  }
  
  if (entry.count >= config.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      limited: true,
      retryAfter,
      message: config.message || defaultRateLimitConfig.message!
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return { limited: false };
}

/**
 * Get remaining requests for an identifier
 */
export function getRemainingRequests(identifier: string, endpoint: string = 'default'): number {
  const config = rateLimitConfigs[endpoint] || rateLimitConfigs.default;
  const key = `${endpoint}:${identifier}`;
  
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!entry || entry.resetAt < now) {
    return config.max;
  }
  
  return Math.max(0, config.max - entry.count);
}

/**
 * Reset rate limit for an identifier (useful for testing)
 */
export function resetRateLimit(identifier: string, endpoint: string = 'default'): void {
  const key = `${endpoint}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Middleware wrapper for API routes
 */
import { NextRequest, NextResponse } from 'next/server';

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  endpoint: string = 'default'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Get identifier (IP address or user ID)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const identifier = forwardedFor?.split(',')[0]?.trim() || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
    
    const rateLimitResult = checkRateLimit(identifier, endpoint);
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { 
          error: rateLimitResult.message,
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(rateLimitConfigs[endpoint]?.max || defaultRateLimitConfig.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((Date.now() + rateLimitResult.retryAfter * 1000) / 1000))
          }
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to response
    const remaining = getRemainingRequests(identifier, endpoint);
    response.headers.set('X-RateLimit-Limit', String(rateLimitConfigs[endpoint]?.max || defaultRateLimitConfig.max));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    
    return response;
  };
}
