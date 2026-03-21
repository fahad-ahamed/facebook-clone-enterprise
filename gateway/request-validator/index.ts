/**
 * Request Validator Middleware
 * Validates incoming requests against defined schemas
 * Uses Joi/Yup for schema validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Validation schemas for different endpoints
const schemas: Record<string, z.ZodSchema> = {
  // Auth schemas
  'POST:/api/v1/auth/register': z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  }),
  
  'POST:/api/v1/auth/login': z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    twoFactorCode: z.string().length(6).optional(),
  }),
  
  'POST:/api/v1/auth/forgot-password': z.object({
    email: z.string().email('Invalid email address'),
  }),
  
  'POST:/api/v1/auth/reset-password': z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
  
  // Post schemas
  'POST:/api/v1/posts': z.object({
    content: z.string().max(63206, 'Post is too long').optional(),
    mediaIds: z.array(z.string()).max(10).optional(),
    visibility: z.enum(['public', 'friends', 'private']).default('public'),
    tags: z.array(z.string()).max(10).optional(),
    location: z.string().max(100).optional(),
    feeling: z.string().optional(),
    groupId: z.string().optional(),
  }).refine(data => data.content || data.mediaIds?.length, {
    message: 'Post must have content or media',
  }),
  
  'PUT:/api/v1/posts/:id': z.object({
    content: z.string().max(63206).optional(),
    visibility: z.enum(['public', 'friends', 'private']).optional(),
    tags: z.array(z.string()).max(10).optional(),
  }),
  
  // Comment schemas
  'POST:/api/v1/posts/:id/comment': z.object({
    content: z.string().max(8000, 'Comment is too long'),
    parentId: z.string().optional(),
    mediaIds: z.array(z.string()).max(4).optional(),
  }),
  
  // User schemas
  'PUT:/api/v1/users/:id': z.object({
    fullName: z.string().min(2).max(100).optional(),
    username: z.string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    bio: z.string().max(150).optional(),
    website: z.string().url().optional().or(z.literal('')),
    location: z.string().max(100).optional(),
  }),
  
  // Group schemas
  'POST:/api/v1/groups': z.object({
    name: z.string().min(3, 'Group name must be at least 3 characters').max(100),
    description: z.string().max(5000).optional(),
    privacy: z.enum(['public', 'private', 'secret']),
    coverImageId: z.string().optional(),
  }),
  
  // Event schemas
  'POST:/api/v1/events': z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(5000).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    location: z.string().max(200).optional(),
    isOnline: z.boolean().default(false),
    onlineUrl: z.string().url().optional(),
    privacy: z.enum(['public', 'private', 'group']),
    coverImageId: z.string().optional(),
  }).refine(data => !data.isOnline || data.onlineUrl, {
    message: 'Online events require a URL',
  }),
  
  // Marketplace schemas
  'POST:/api/v1/marketplace': z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(5000),
    price: z.number().min(0),
    currency: z.string().length(3).default('USD'),
    category: z.string(),
    condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
    location: z.string().max(200),
    mediaIds: z.array(z.string()).min(1, 'At least one image is required').max(10),
  }),
  
  // Message schemas
  'POST:/api/v1/chat/messages': z.object({
    conversationId: z.string(),
    content: z.string().max(20000).optional(),
    mediaIds: z.array(z.string()).max(10).optional(),
    replyToId: z.string().optional(),
  }).refine(data => data.content || data.mediaIds?.length, {
    message: 'Message must have content or media',
  }),
  
  // Story schemas
  'POST:/api/v1/stories': z.object({
    mediaId: z.string(),
    caption: z.string().max(500).optional(),
    mentions: z.array(z.object({
      userId: z.string(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
    })).max(10).optional(),
    stickers: z.array(z.any()).optional(),
    duration: z.number().min(3).max(60).default(5),
  }),
};

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Find matching schema key
 */
function findSchemaKey(method: string, path: string): string | null {
  // Exact match
  const exactKey = `${method}:${path}`;
  if (schemas[exactKey]) {
    return exactKey;
  }
  
  // Pattern match (replace params with wildcards)
  const pathParts = path.split('/');
  for (const key of Object.keys(schemas)) {
    const [keyMethod, keyPath] = key.split(':');
    if (keyMethod !== method) continue;
    
    const keyParts = keyPath.split('/');
    if (keyParts.length !== pathParts.length) continue;
    
    let matches = true;
    for (let i = 0; i < pathParts.length; i++) {
      if (keyParts[i].startsWith(':') || keyParts[i] === pathParts[i]) {
        continue;
      }
      matches = false;
      break;
    }
    
    if (matches) return key;
  }
  
  return null;
}

/**
 * Request validator middleware
 */
export function requestValidator(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const schemaKey = findSchemaKey(req.method, req.path);
  
  if (!schemaKey) {
    // No schema defined for this endpoint
    // Sanitize body and continue
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    return next();
  }
  
  const schema = schemas[schemaKey];
  
  try {
    // Validate request body
    const validated = schema.parse(req.body);
    
    // Sanitize and attach validated data
    req.body = sanitizeInput(validated);
    
    // Add validated data to request for type safety
    (req as any).validated = validated;
    
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
      return;
    }
    
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Internal validation error',
      },
    });
  }
}

/**
 * Create custom validator
 */
export function createValidator(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = sanitizeInput(validated);
      (req as any).validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            details: errors,
          },
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Query parameter validator
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      (req as any).validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'QUERY_VALIDATION_ERROR',
            details: error.errors,
          },
        });
        return;
      }
      next(error);
    }
  };
}

export default requestValidator;
