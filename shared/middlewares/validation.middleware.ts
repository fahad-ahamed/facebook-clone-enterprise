/**
 * Validation Middleware
 * Request validation using Zod schemas
 * @module shared/middlewares/validation.middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ValidationError, formatValidationErrors } from './error.middleware';

/**
 * Validation target
 */
export type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

/**
 * Validation schema configuration
 */
export interface ValidationSchema {
  body?: z.ZodType<unknown>;
  query?: z.ZodType<unknown>;
  params?: z.ZodType<unknown>;
  headers?: z.ZodType<unknown>;
}

/**
 * Validated request with parsed data
 */
export interface ValidatedRequest<T = Record<string, unknown>> extends NextRequest {
  validated?: {
    body?: T;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  };
}

/**
 * Parse JSON body from request
 */
async function parseBody(request: NextRequest): Promise<unknown> {
  try {
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await request.json();
    }

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const data: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        // Handle multiple values for same key
        if (data[key]) {
          if (Array.isArray(data[key])) {
            (data[key] as unknown[]).push(value);
          } else {
            data[key] = [data[key], value];
          }
        } else {
          data[key] = value;
        }
      });
      return data;
    }

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      const data: Record<string, unknown> = {};
      params.forEach((value, key) => {
        if (data[key]) {
          if (Array.isArray(data[key])) {
            (data[key] as unknown[]).push(value);
          } else {
            data[key] = [data[key], value];
          }
        } else {
          data[key] = value;
        }
      });
      return data;
    }

    // Default: try to parse as JSON
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Parse query parameters from request
 */
function parseQuery(request: NextRequest): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  const searchParams = request.nextUrl.searchParams;

  searchParams.forEach((value, key) => {
    // Handle multiple values for same key
    if (query[key]) {
      if (Array.isArray(query[key])) {
        (query[key] as unknown[]).push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  });

  return query;
}

/**
 * Parse route params from request
 */
function parseParams(request: NextRequest): Record<string, unknown> {
  // In Next.js App Router, params are passed separately
  // This is a helper for extracting them from the URL pattern
  const params: Record<string, unknown> = {};
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);

  // Common patterns - adjust based on your routing
  const patterns: Array<{ pattern: RegExp; extractor: (matches: RegExpMatchArray) => Record<string, string> }> = [
    {
      pattern: /\/api\/posts\/([^/]+)/,
      extractor: (m) => ({ postId: m[1] }),
    },
    {
      pattern: /\/api\/users\/([^/]+)/,
      extractor: (m) => ({ userId: m[1] }),
    },
    {
      pattern: /\/api\/groups\/([^/]+)/,
      extractor: (m) => ({ groupId: m[1] }),
    },
    {
      pattern: /\/api\/conversations\/([^/]+)/,
      extractor: (m) => ({ conversationId: m[1] }),
    },
    {
      pattern: /\/api\/events\/([^/]+)/,
      extractor: (m) => ({ eventId: m[1] }),
    },
  ];

  for (const { pattern, extractor } of patterns) {
    const matches = pathname.match(pattern);
    if (matches) {
      Object.assign(params, extractor(matches));
      break;
    }
  }

  return params;
}

/**
 * Parse headers from request
 */
function parseHeaders(request: NextRequest): Record<string, unknown> {
  const headers: Record<string, unknown> = {};

  request.headers.forEach((value, key) => {
    // Convert header keys to camelCase for consistency
    const normalizedKey = key
      .toLowerCase()
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    headers[normalizedKey] = value;
  });

  return headers;
}

/**
 * Validation middleware factory
 */
export function validate(schema: ValidationSchema) {
  return async function (
    request: NextRequest,
    handler: (req: ValidatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const validatedRequest = request as ValidatedRequest;
    validatedRequest.validated = {};

    try {
      // Validate body
      if (schema.body) {
        const body = await parseBody(request);
        const result = schema.body.safeParse(body);

        if (!result.success) {
          const errors = formatValidationErrors(
            result.error.errors.map((e) => ({
              path: e.path.map(String),
              message: e.message,
            }))
          );
          throw new ValidationError('Validation failed', errors);
        }

        validatedRequest.validated.body = result.data;
      }

      // Validate query
      if (schema.query) {
        const query = parseQuery(request);
        const result = schema.query.safeParse(query);

        if (!result.success) {
          const errors = formatValidationErrors(
            result.error.errors.map((e) => ({
              path: e.path.map(String),
              message: e.message,
            }))
          );
          throw new ValidationError('Invalid query parameters', errors);
        }

        validatedRequest.validated.query = result.data;
      }

      // Validate params
      if (schema.params) {
        const params = parseParams(request);
        const result = schema.params.safeParse(params);

        if (!result.success) {
          const errors = formatValidationErrors(
            result.error.errors.map((e) => ({
              path: e.path.map(String),
              message: e.message,
            }))
          );
          throw new ValidationError('Invalid route parameters', errors);
        }

        validatedRequest.validated.params = result.data;
      }

      // Validate headers
      if (schema.headers) {
        const headers = parseHeaders(request);
        const result = schema.headers.safeParse(headers);

        if (!result.success) {
          const errors = formatValidationErrors(
            result.error.errors.map((e) => ({
              path: e.path.map(String),
              message: e.message,
            }))
          );
          throw new ValidationError('Invalid headers', errors);
        }

        validatedRequest.validated.headers = result.data;
      }

      return handler(validatedRequest);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'VAL_2001',
            details: error.details,
          },
          { status: 400 }
        );
      }

      throw error;
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),

  // ID validation
  id: z.object({
    id: z.string().min(1, 'ID is required'),
  }),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Email validation
  email: z.string().email('Invalid email format'),

  // Password validation
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // Username validation
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  // User ID param
  userIdParam: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),

  // Post ID param
  postIdParam: z.object({
    postId: z.string().min(1, 'Post ID is required'),
  }),

  // Group ID param
  groupIdParam: z.object({
    groupId: z.string().min(1, 'Group ID is required'),
  }),

  // Content validation
  postContent: z.string().max(5000, 'Post content must be at most 5000 characters'),

  commentContent: z.string().max(1000, 'Comment content must be at most 1000 characters'),

  // Message validation
  messageContent: z.string().max(5000, 'Message content must be at most 5000 characters'),

  // Bio validation
  bio: z.string().max(150, 'Bio must be at most 150 characters').optional(),

  // Name validation
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),

  // Date validation
  dateString: z.string().datetime('Invalid date format'),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // File validation
  fileUpload: z.object({
    name: z.string(),
    size: z.number().max(100 * 1024 * 1024, 'File size must be less than 100MB'),
    type: z.string(),
  }),
};

/**
 * Sanitize input string
 * Removes potentially harmful characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

export default {
  validate,
  commonSchemas,
  sanitizeString,
  sanitizeObject,
  parseBody,
  parseQuery,
  parseParams,
  parseHeaders,
};
