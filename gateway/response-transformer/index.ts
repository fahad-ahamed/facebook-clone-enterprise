/**
 * Response Transformer Middleware
 * Transforms and standardizes API responses
 * Supports pagination, field selection, and enrichment
 */

import { Request, Response, NextFunction } from 'express';

// Response metadata interface
interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// Standard response wrapper
interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string | number;
    message: string;
    details?: any;
  };
  meta: ResponseMeta;
}

/**
 * Pagination helper
 */
interface PaginationOptions {
  page?: number;
  limit?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

function parsePagination(req: Request, options: PaginationOptions = {}) {
  const {
    defaultLimit = 20,
    maxLimit = 100,
  } = options;
  
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(req.query.limit as string) || defaultLimit)
  );
  
  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Field selection helper
 */
function selectFields(data: any, fields: string[]): any {
  if (!data || !fields.length) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => selectFields(item, fields));
  }
  
  const selected: any = {};
  for (const field of fields) {
    const parts = field.split('.');
    let value = data;
    let target = selected;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!target[part]) target[part] = {};
      target = target[part];
      value = value?.[part];
    }
    
    const lastPart = parts[parts.length - 1];
    target[lastPart] = value?.[lastPart];
  }
  
  return selected;
}

/**
 * Transform response data based on query parameters
 */
function transformData(data: any, req: Request): any {
  // Field selection
  const fields = req.query.fields as string;
  if (fields && typeof data === 'object') {
    const fieldList = fields.split(',').map(f => f.trim());
    data = selectFields(data, fieldList);
  }
  
  // Enrich with computed fields
  if (data && typeof data === 'object') {
    data = enrichData(data, req);
  }
  
  return data;
}

/**
 * Enrich response data with computed fields
 */
function enrichData(data: any, req: Request): any {
  const userId = (req as any).user?.id;
  
  if (Array.isArray(data)) {
    return data.map(item => enrichItem(item, userId));
  }
  
  return enrichItem(data, userId);
}

/**
 * Enrich single item
 */
function enrichItem(item: any, userId?: string): any {
  if (!item || typeof item !== 'object') return item;
  
  // Add computed fields for posts
  if (item.type === 'post' || item.content) {
    return {
      ...item,
      isLiked: userId ? item.likedBy?.includes(userId) : false,
      isSaved: userId ? item.savedBy?.includes(userId) : false,
      likeCount: item.likeCount ?? item.likedBy?.length ?? 0,
      commentCount: item.commentCount ?? 0,
      shareCount: item.shareCount ?? 0,
    };
  }
  
  // Add computed fields for users
  if (item.username && item.email) {
    return {
      ...item,
      isFollowing: userId ? item.followers?.includes(userId) : false,
      isFriend: userId ? item.friends?.includes(userId) : false,
      followerCount: item.followerCount ?? item.followers?.length ?? 0,
      followingCount: item.followingCount ?? item.following?.length ?? 0,
    };
  }
  
  return item;
}

/**
 * Build response metadata
 */
function buildMeta(req: Request, res: Response): ResponseMeta {
  const meta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] as string,
  };
  
  // Add rate limit info if present
  if (res.getHeader('X-RateLimit-Limit')) {
    meta.rateLimit = {
      limit: parseInt(res.getHeader('X-RateLimit-Limit') as string),
      remaining: parseInt(res.getHeader('X-RateLimit-Remaining') as string),
      reset: parseInt(res.getHeader('X-RateLimit-Reset') as string),
    };
  }
  
  return meta;
}

/**
 * Store original res.json
 */
const originalJson = Response.prototype.json;

/**
 * Override res.json to transform responses
 */
Response.prototype.json = function<T>(this: Response, data: T): Response {
  const req = this.req;
  
  // Skip transformation if already wrapped
  if (data && typeof data === 'object' && 'success' in data && 'meta' in data) {
    return originalJson.call(this, data);
  }
  
  // Skip for errors (already formatted)
  if (this.statusCode >= 400) {
    return originalJson.call(this, data);
  }
  
  // Build standard response
  const response: StandardResponse<T> = {
    success: true,
    data: transformData(data, req),
    meta: buildMeta(req, this),
  };
  
  // Add pagination if present
  if (data && typeof data === 'object' && 'pagination' in data) {
    response.meta.pagination = (data as any).pagination;
    response.data = (data as any).data || (data as any).items;
  }
  
  return originalJson.call(this, response);
};

/**
 * Pagination response wrapper
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  options: { page: number; limit: number }
): { data: T[]; pagination: ResponseMeta['pagination'] } {
  const totalPages = Math.ceil(total / options.limit);
  
  return {
    data: items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasMore: options.page < totalPages,
    },
  };
}

/**
 * Response transformer middleware
 */
export function responseTransformer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Attach pagination helper to request
  (req as any).pagination = parsePagination(req);
  
  // Attach pagination response helper to response
  (res as any).paginated = <T>(items: T[], total: number) => {
    const { page, limit } = (req as any).pagination;
    const result = paginatedResponse(items, total, { page, limit });
    res.json(result);
  };
  
  next();
}

/**
 * Error response helper
 */
export function errorResponse(
  code: string | number,
  message: string,
  details?: any
) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

export default responseTransformer;
