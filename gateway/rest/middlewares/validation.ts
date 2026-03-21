/**
 * Validation Middleware
 *
 * Provides request validation middleware using Joi/Zod schemas.
 * Validates request body, query parameters, and route params.
 *
 * @module gateway/rest/middlewares/validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Validation error interface
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Validation result
interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
  data?: any;
}

/**
 * Format Zod errors into a consistent structure
 */
function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
}

/**
 * Create validation middleware from Zod schema
 */
export function validateSchema(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = formatZodErrors(result.error);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors
          }
        });
        return;
      }

      // Replace the validated data with parsed result
      req[source] = result.data;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during validation'
        }
      });
    }
  };
}

/**
 * Validation middleware with multiple schemas
 */
export function validationMiddleware(options: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: ValidationError[] = [];

      // Validate body
      if (options.body) {
        const result = options.body.safeParse(req.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error));
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (options.query) {
        const result = options.query.safeParse(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error));
        } else {
          req.query = result.data as any;
        }
      }

      // Validate params
      if (options.params) {
        const result = options.params.safeParse(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error));
        } else {
          req.params = result.data as any;
        }
      }

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors
          }
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'An error occurred during validation'
        }
      });
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  // ID validation
  objectId: z.string().min(1).max(100),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }),

  // Email validation
  email: z.string().email().max(255),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // Username validation
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  // Display name validation
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must not exceed 100 characters')
    .trim(),

  // URL validation
  url: z.string().url().max(2048),

  // Date validation
  date: z.string().datetime().or(z.date()),

  // Phone validation
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),

  // Post content validation
  postContent: z.string()
    .max(50000, 'Post content must not exceed 50000 characters')
    .optional()
    .nullable(),

  // Comment validation
  commentContent: z.string()
    .min(1, 'Comment cannot be empty')
    .max(10000, 'Comment must not exceed 10000 characters'),

  // Bio validation
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),

  // Location validation
  location: z.string().max(100, 'Location must not exceed 100 characters').optional(),

  // Gender validation
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),

  // Post visibility
  visibility: z.enum(['public', 'friends', 'friends_except', 'specific_friends', 'only_me']),

  // Reaction type
  reactionType: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry']),

  // Sort order
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Search query
  searchQuery: z.string().min(1).max(255).trim()
};

// Pre-built validation middleware for common use cases
export const validatePagination = validateSchema(commonSchemas.pagination, 'query');

export const validateId = validateSchema(
  z.object({ id: commonSchemas.objectId }),
  'params'
);

// Sanitize HTML content
export function sanitizeContent(content: string): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// XSS prevention middleware
export const xssPreventionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize body strings
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeContent(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body);
  }

  next();
};

// Content type validation middleware
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];

    if (!contentType) {
      res.status(415).json({
        success: false,
        error: {
          code: 'MISSING_CONTENT_TYPE',
          message: 'Content-Type header is required'
        }
      });
      return;
    }

    const isAllowed = allowedTypes.some(type =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
        }
      });
      return;
    }

    next();
  };
};

// Request size validation
export const validateRequestSize = (maxSize: string) => {
  const maxBytes = parseSize(maxSize);

  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds maximum size of ${maxSize}`
        }
      });
      return;
    }

    next();
  };
};

// Helper function to parse size string
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'b';

  return value * (units[unit] || 1);
}

export default validationMiddleware;
