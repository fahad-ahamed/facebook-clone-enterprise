/**
 * CORS Middleware
 * Cross-Origin Resource Sharing configuration and handling
 * @module shared/middlewares/cors.middleware
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS configuration options
 */
export interface CorsOptions {
  /** Allowed origins (use '*' for all origins, or array of specific origins) */
  allowedOrigins: string[] | '*';
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Allowed request headers */
  allowedHeaders: string[];
  /** Headers exposed to the client */
  exposedHeaders: string[];
  /** Whether credentials (cookies, auth headers) are allowed */
  credentials: boolean;
  /** Max age for preflight cache in seconds */
  maxAge: number;
  /** Whether to handle OPTIONS preflight requests automatically */
  handlePreflight: boolean;
}

/**
 * Default CORS configuration
 * Suitable for development and can be overridden for production
 */
const defaultOptions: CorsOptions = {
  allowedOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Auth-Token',
    'X-Request-Id',
    'X-User-Id',
    'X-User-Email',
    'X-User-Role',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'X-Request-Id',
    'X-Response-Time',
    'X-Total-Count',
    'X-Page-Count',
    'Link',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  handlePreflight: true,
};

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string, allowedOrigins: string[] | '*'): boolean {
  if (allowedOrigins === '*') {
    return true;
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns
  for (const allowed of allowedOrigins) {
    if (allowed.includes('*')) {
      // Convert wildcard pattern to regex
      const pattern = allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get allowed origin for response
 */
function getAllowedOrigin(
  requestOrigin: string | null,
  options: CorsOptions
): string | null {
  if (options.allowedOrigins === '*') {
    return '*';
  }

  if (!requestOrigin) {
    return null;
  }

  if (isOriginAllowed(requestOrigin, options.allowedOrigins)) {
    return requestOrigin;
  }

  return null;
}

/**
 * Create CORS headers
 */
function createCorsHeaders(
  origin: string | null,
  options: CorsOptions
): Headers {
  const headers = new Headers();

  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  if (options.credentials && origin !== '*') {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  headers.set(
    'Access-Control-Allow-Methods',
    options.allowedMethods.join(', ')
  );

  headers.set(
    'Access-Control-Allow-Headers',
    options.allowedHeaders.join(', ')
  );

  headers.set(
    'Access-Control-Expose-Headers',
    options.exposedHeaders.join(', ')
  );

  headers.set('Access-Control-Max-Age', options.maxAge.toString());

  return headers;
}

/**
 * CORS middleware
 */
export function corsMiddleware(options: Partial<CorsOptions> = {}) {
  const mergedOptions: CorsOptions = { ...defaultOptions, ...options };

  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const requestOrigin = request.headers.get('origin');

    // Handle preflight (OPTIONS) requests
    if (request.method === 'OPTIONS' && mergedOptions.handlePreflight) {
      const allowedOrigin = getAllowedOrigin(requestOrigin, mergedOptions);

      if (!allowedOrigin) {
        return new NextResponse(null, {
          status: 403,
          statusText: 'Forbidden - Origin not allowed',
        });
      }

      const corsHeaders = createCorsHeaders(allowedOrigin, mergedOptions);

      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Process actual request
    const response = await handler(request);

    // Add CORS headers to response
    const allowedOrigin = getAllowedOrigin(requestOrigin, mergedOptions);

    if (allowedOrigin) {
      const corsHeaders = createCorsHeaders(allowedOrigin, mergedOptions);
      corsHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
    }

    // Add Vary header for caching
    response.headers.append('Vary', 'Origin');

    return response;
  };
}

/**
 * Simple CORS headers for quick usage
 */
export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  options: Partial<CorsOptions> = {}
): NextResponse {
  const mergedOptions: CorsOptions = { ...defaultOptions, ...options };
  const requestOrigin = request.headers.get('origin');
  const allowedOrigin = getAllowedOrigin(requestOrigin, mergedOptions);

  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);

    if (mergedOptions.credentials && allowedOrigin !== '*') {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      mergedOptions.allowedMethods.join(', ')
    );

    response.headers.set(
      'Access-Control-Allow-Headers',
      mergedOptions.allowedHeaders.join(', ')
    );

    response.headers.set(
      'Access-Control-Expose-Headers',
      mergedOptions.exposedHeaders.join(', ')
    );
  }

  response.headers.append('Vary', 'Origin');

  return response;
}

/**
 * CORS preflight handler
 */
export function handlePreflight(
  request: NextRequest,
  options: Partial<CorsOptions> = {}
): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const mergedOptions: CorsOptions = { ...defaultOptions, ...options };
  const requestOrigin = request.headers.get('origin');
  const allowedOrigin = getAllowedOrigin(requestOrigin, mergedOptions);

  if (!allowedOrigin) {
    return new NextResponse(null, {
      status: 403,
      statusText: 'Forbidden - Origin not allowed',
    });
  }

  const corsHeaders = createCorsHeaders(allowedOrigin, mergedOptions);

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Production CORS configuration
 */
export const productionCorsOptions: Partial<CorsOptions> = {
  allowedOrigins: process.env.CORS_ORIGINS?.split(',') || [],
  credentials: true,
  maxAge: 3600, // 1 hour
};

/**
 * Development CORS configuration
 * More permissive for local development
 */
export const developmentCorsOptions: Partial<CorsOptions> = {
  allowedOrigins: '*',
  credentials: false,
  maxAge: 86400, // 24 hours
};

/**
 * Get CORS options based on environment
 */
export function getCorsOptions(): Partial<CorsOptions> {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? productionCorsOptions : developmentCorsOptions;
}

/**
 * Validate origin against allowed list
 */
export function validateOrigin(
  origin: string,
  allowedOrigins: string[] | '*'
): boolean {
  return isOriginAllowed(origin, allowedOrigins);
}

export default {
  corsMiddleware,
  addCorsHeaders,
  handlePreflight,
  getCorsOptions,
  validateOrigin,
  productionCorsOptions,
  developmentCorsOptions,
};
