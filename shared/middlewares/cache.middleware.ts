/**
 * Cache Middleware
 * Response caching with multiple strategies and storage backends
 * @module shared/middlewares/cache.middleware
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Time to live in seconds */
  ttl: number;
  /** Cache key generator */
  keyGenerator?: (request: NextRequest) => string;
  /** Whether to cache only specific status codes */
  statusCodes?: number[];
  /** Whether to cache only specific methods */
  methods?: string[];
  /** Whether to use stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** Custom cache control header */
  cacheControl?: string;
  /** Whether to skip caching for certain requests */
  skip?: (request: NextRequest) => boolean;
  /** Prefix for cache keys */
  prefix?: string;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  /** Cached response body */
  body: unknown;
  /** Response status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Cache timestamp */
  cachedAt: number;
  /** TTL in seconds */
  ttl: number;
  /** ETag for conditional requests */
  etag?: string;
}

/**
 * Cache store interface
 */
export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory cache store
 */
export class MemoryCacheStore implements CacheStore {
  private cache: Map<string, CacheEntry> = new Map();
  private timer?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries periodically
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.cachedAt + entry.ttl * 1000 < now) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000); // Clean every minute
  }

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.cachedAt + entry.ttl * 1000 < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Global cache store instance
 */
let globalCacheStore: MemoryCacheStore | null = null;

/**
 * Get or create cache store
 */
function getCacheStore(): MemoryCacheStore {
  if (!globalCacheStore) {
    globalCacheStore = new MemoryCacheStore();
  }
  return globalCacheStore;
}

/**
 * Generate ETag from response body
 */
function generateETag(body: unknown): string {
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `W/"${Math.abs(hash).toString(16)}"`;
}

/**
 * Default key generator - uses method + path + query
 */
function defaultKeyGenerator(request: NextRequest): string {
  const method = request.method;
  const path = request.nextUrl.pathname;
  const query = request.nextUrl.search;
  const userId = request.headers.get('x-user-id') || 'anonymous';

  return `${method}:${path}:${query}:${userId}`;
}

/**
 * Cache middleware factory
 */
export function cacheMiddleware(config: CacheConfig) {
  const {
    ttl,
    keyGenerator = defaultKeyGenerator,
    statusCodes = [200, 203, 204, 206, 300, 301, 404, 405, 410, 414, 501],
    methods = ['GET', 'HEAD'],
    staleWhileRevalidate = false,
    cacheControl,
    skip,
    prefix = 'cache:',
  } = config;

  const store = getCacheStore();

  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip caching if skip function returns true
    if (skip?.(request)) {
      return handler(request);
    }

    // Only cache specified methods
    if (!methods.includes(request.method)) {
      return handler(request);
    }

    const cacheKey = prefix + keyGenerator(request);

    // Check for If-None-Match header (conditional request)
    const ifNoneMatch = request.headers.get('if-none-match');

    // Try to get cached response
    const cached = await store.get(cacheKey);

    if (cached) {
      // Check ETag for conditional request
      if (ifNoneMatch && cached.etag && ifNoneMatch.includes(cached.etag)) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: cached.etag,
            'Cache-Control': cacheControl || `max-age=${ttl}`,
          },
        });
      }

      // Return cached response
      const response = NextResponse.json(cached.body, {
        status: cached.status,
        headers: {
          ...cached.headers,
          'X-Cache': 'HIT',
          'X-Cache-TTL': ttl.toString(),
          'X-Cache-Age': Math.floor(
            (Date.now() - cached.cachedAt) / 1000
          ).toString(),
          ...(cached.etag && { ETag: cached.etag }),
          ...(cacheControl && { 'Cache-Control': cacheControl }),
        },
      });

      // If stale-while-revalidate, revalidate in background
      if (staleWhileRevalidate) {
        // Don't await - run in background
        handler(request).then(async (freshResponse) => {
          if (statusCodes.includes(freshResponse.status)) {
            const body = await freshResponse.clone().json().catch(() => null);
            if (body) {
              const headers: Record<string, string> = {};
              freshResponse.headers.forEach((value, key) => {
                headers[key] = value;
              });

              await store.set(cacheKey, {
                body,
                status: freshResponse.status,
                headers,
                cachedAt: Date.now(),
                ttl,
                etag: generateETag(body),
              });
            }
          }
        }).catch(() => {
          // Ignore background revalidation errors
        });
      }

      return response;
    }

    // No cache - execute handler
    const response = await handler(request);

    // Check if response should be cached
    if (statusCodes.includes(response.status)) {
      try {
        const body = await response.clone().json().catch(() => null);

        if (body) {
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });

          await store.set(cacheKey, {
            body,
            status: response.status,
            headers,
            cachedAt: Date.now(),
            ttl,
            etag: generateETag(body),
          });
        }
      } catch {
        // If we can't cache the response, just return it
      }
    }

    // Add cache headers
    const newResponse = response.clone();
    newResponse.headers.set('X-Cache', 'MISS');
    newResponse.headers.set('X-Cache-TTL', ttl.toString());

    if (cacheControl) {
      newResponse.headers.set('Cache-Control', cacheControl);
    } else if (staleWhileRevalidate) {
      newResponse.headers.set(
        'Cache-Control',
        `max-age=${ttl}, stale-while-revalidate=${ttl * 2}`
      );
    } else {
      newResponse.headers.set('Cache-Control', `max-age=${ttl}`);
    }

    return newResponse;
  };
}

/**
 * Pre-configured cache middlewares
 */

// Short cache (30 seconds) - for frequently changing data
export const shortCache = cacheMiddleware({
  ttl: 30,
  prefix: 'short:',
});

// Medium cache (5 minutes) - for semi-static data
export const mediumCache = cacheMiddleware({
  ttl: 300,
  prefix: 'medium:',
});

// Long cache (1 hour) - for static data
export const longCache = cacheMiddleware({
  ttl: 3600,
  prefix: 'long:',
});

// User feed cache (1 minute, user-specific)
export const feedCache = cacheMiddleware({
  ttl: 60,
  prefix: 'feed:',
  keyGenerator: (request) => {
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const cursor = request.nextUrl.searchParams.get('cursor') || '0';
    return `feed:${userId}:${cursor}`;
  },
});

// User profile cache (5 minutes)
export const profileCache = cacheMiddleware({
  ttl: 300,
  prefix: 'profile:',
  keyGenerator: (request) => {
    const path = request.nextUrl.pathname;
    const match = path.match(/\/api\/users\/([^/]+)/);
    const userId = match ? match[1] : 'me';
    return `profile:${userId}`;
  },
});

// Post cache (2 minutes)
export const postCache = cacheMiddleware({
  ttl: 120,
  prefix: 'post:',
});

// Search results cache (10 minutes)
export const searchCache = cacheMiddleware({
  ttl: 600,
  prefix: 'search:',
  keyGenerator: (request) => {
    const query = request.nextUrl.searchParams.get('q') || '';
    const type = request.nextUrl.searchParams.get('type') || 'all';
    return `search:${type}:${query}`;
  },
});

/**
 * Invalidate cache for a key
 */
export async function invalidateCache(key: string): Promise<void> {
  const store = getCacheStore();
  await store.delete(key);
}

/**
 * Invalidate cache by pattern (prefix)
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  const store = getCacheStore();
  const stats = store.getStats();
  
  for (const key of stats.keys) {
    if (key.startsWith(pattern)) {
      await store.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  const store = getCacheStore();
  await store.clear();
}

/**
 * Create custom cache middleware
 */
export function createCacheMiddleware(options: Partial<CacheConfig>) {
  return cacheMiddleware({
    ttl: 60, // 1 minute default
    ...options,
  });
}

/**
 * Cache stats for monitoring
 */
export function getCacheStats(): { size: number; keys: string[] } {
  const store = getCacheStore();
  return store.getStats();
}

export default {
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
};
