/**
 * Service Proxy Configuration
 *
 * Configures proxy middleware for routing requests to backend microservices.
 * Supports load balancing, health checks, and request/response transformation.
 *
 * @module gateway/rest/proxy
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import httpContext from 'express-http-context';
import { URL } from 'url';

// Service configuration interface
interface ServiceConfig {
  name: string;
  url: string;
  healthPath: string;
  timeout: number;
  retries: number;
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    resetTimeout: number;
  };
}

// Service registry
const serviceRegistry: Map<string, ServiceConfig> = new Map();

// Default service configurations
const defaultServices: ServiceConfig[] = [
  {
    name: 'user-service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:4001',
    healthPath: '/health',
    timeout: 30000,
    retries: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  },
  {
    name: 'post-service',
    url: process.env.POST_SERVICE_URL || 'http://localhost:4002',
    healthPath: '/health',
    timeout: 30000,
    retries: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  },
  {
    name: 'feed-service',
    url: process.env.FEED_SERVICE_URL || 'http://localhost:4003',
    healthPath: '/health',
    timeout: 30000,
    retries: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  },
  {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:4004',
    healthPath: '/health',
    timeout: 30000,
    retries: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  },
  {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005',
    healthPath: '/health',
    timeout: 30000,
    retries: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  },
  {
    name: 'chat-service',
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:4006',
    healthPath: '/health',
    timeout: 30000,
    retries: 3,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  },
  {
    name: 'media-service',
    url: process.env.MEDIA_SERVICE_URL || 'http://localhost:4007',
    healthPath: '/health',
    timeout: 60000, // Higher timeout for media uploads
    retries: 2,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  },
  {
    name: 'search-service',
    url: process.env.SEARCH_SERVICE_URL || 'http://localhost:4008',
    healthPath: '/health',
    timeout: 15000,
    retries: 2,
    circuitBreaker: {
      enabled: true,
      threshold: 5,
      resetTimeout: 60000
    }
  }
];

// Initialize service registry
defaultServices.forEach(service => {
  serviceRegistry.set(service.name, service);
});

// Circuit breaker state
interface CircuitState {
  failures: number;
  lastFailure: Date | null;
  status: 'closed' | 'open' | 'half-open';
}

const circuitStates: Map<string, CircuitState> = new Map();

// Initialize circuit states
serviceRegistry.forEach((_, name) => {
  circuitStates.set(name, {
    failures: 0,
    lastFailure: null,
    status: 'closed'
  });
});

/**
 * Check if circuit breaker allows request
 */
function isCircuitAllowed(serviceName: string): boolean {
  const state = circuitStates.get(serviceName);
  const config = serviceRegistry.get(serviceName);

  if (!state || !config?.circuitBreaker.enabled) {
    return true;
  }

  if (state.status === 'closed') {
    return true;
  }

  if (state.status === 'open') {
    // Check if we should transition to half-open
    const resetTimeout = config.circuitBreaker.resetTimeout;
    const timeSinceLastFailure = state.lastFailure
      ? Date.now() - state.lastFailure.getTime()
      : resetTimeout + 1;

    if (timeSinceLastFailure >= resetTimeout) {
      state.status = 'half-open';
      return true;
    }
    return false;
  }

  // Half-open - allow one request to test
  return true;
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(serviceName: string): void {
  const state = circuitStates.get(serviceName);
  const config = serviceRegistry.get(serviceName);

  if (!state || !config?.circuitBreaker.enabled) {
    return;
  }

  state.failures++;
  state.lastFailure = new Date();

  if (state.failures >= config.circuitBreaker.threshold) {
    state.status = 'open';
    console.warn(`[Circuit Breaker] ${serviceName} circuit opened`);
  }
}

/**
 * Record a success for circuit breaker
 */
function recordSuccess(serviceName: string): void {
  const state = circuitStates.get(serviceName);

  if (!state) {
    return;
  }

  state.failures = 0;
  state.status = 'closed';
}

/**
 * Forward request to backend service
 */
async function forwardRequest(
  req: Request,
  res: Response,
  serviceName: string,
  pathRewrite?: (path: string) => string
): Promise<void> {
  const config = serviceRegistry.get(serviceName);

  if (!config) {
    res.status(502).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_FOUND',
        message: `Service '${serviceName}' not configured`
      }
    });
    return;
  }

  // Check circuit breaker
  if (!isCircuitAllowed(serviceName)) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: `Service '${serviceName}' is temporarily unavailable`
      }
    });
    return;
  }

  const requestId = httpContext.get('requestId');
  const targetUrl = new URL(config.url);

  // Apply path rewrite if provided
  const requestPath = pathRewrite ? pathRewrite(req.path) : req.path;

  try {
    // Build headers to forward
    const forwardHeaders: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'X-Request-ID': requestId,
      'X-Forwarded-For': req.ip || '',
      'X-Forwarded-Host': req.headers.host || '',
      'X-Forwarded-Proto': req.protocol
    };

    // Forward authorization header if present
    if (req.headers.authorization) {
      forwardHeaders['Authorization'] = req.headers.authorization;
    }

    // Forward user context if available
    const userId = httpContext.get('userId');
    if (userId) {
      forwardHeaders['X-User-ID'] = userId;
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      signal: AbortSignal.timeout(config.timeout)
    };

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Make the request
    const response = await fetch(`${targetUrl.origin}${requestPath}`, fetchOptions);

    // Record success
    recordSuccess(serviceName);

    // Forward response headers
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Set request ID in response
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Service', serviceName);

    // Stream response body
    const responseBody = await response.text();
    res.status(response.status).send(responseBody);
  } catch (error: any) {
    // Record failure for circuit breaker
    recordFailure(serviceName);

    console.error(`[Proxy Error] ${serviceName}:`, error.message);

    // Handle specific error types
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      res.status(504).json({
        success: false,
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: `Request to ${serviceName} timed out`
        }
      });
      return;
    }

    if (error.cause?.code === 'ECONNREFUSED') {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Service ${serviceName} is not available`
        }
      });
      return;
    }

    res.status(502).json({
      success: false,
      error: {
        code: 'BAD_GATEWAY',
        message: `Failed to connect to ${serviceName}`
      }
    });
  }
}

/**
 * Create proxy middleware for a service
 */
export function createProxyMiddleware(options: {
  target: string;
  changeOrigin?: boolean;
  pathRewrite?: { [key: string]: string };
  onProxyReq?: (proxyReq: any, req: Request) => void;
  onProxyRes?: (proxyRes: any, req: Request, res: Response) => void;
  onError?: (error: Error, req: Request, res: Response) => void;
}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const serviceName = options.target.split('/').pop() || 'unknown-service';

    // Parse path rewrite rules
    const pathRewriteFn = (path: string): string => {
      if (!options.pathRewrite) return path;

      let rewrittenPath = path;
      for (const [pattern, replacement] of Object.entries(options.pathRewrite)) {
        rewrittenPath = rewrittenPath.replace(new RegExp(pattern), replacement);
      }
      return rewrittenPath;
    };

    try {
      await forwardRequest(req, res, serviceName, pathRewriteFn);
    } catch (error) {
      if (options.onError) {
        options.onError(error as Error, req, res);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Service health check
 */
export async function checkServiceHealth(serviceName: string): Promise<{
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  error?: string;
}> {
  const config = serviceRegistry.get(serviceName);

  if (!config) {
    return {
      name: serviceName,
      status: 'unknown',
      error: 'Service not configured'
    };
  }

  const startTime = Date.now();

  try {
    const response = await fetch(`${config.url}${config.healthPath}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        name: serviceName,
        status: 'healthy',
        latency
      };
    }

    return {
      name: serviceName,
      status: 'unhealthy',
      latency,
      error: `HTTP ${response.status}`
    };
  } catch (error: any) {
    return {
      name: serviceName,
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Check all services health
 */
export async function checkAllServicesHealth(): Promise<Array<{
  name: string;
  status: string;
  latency?: number;
  error?: string;
}>> {
  const results = [];

  for (const [name] of serviceRegistry) {
    results.push(await checkServiceHealth(name));
  }

  return results;
}

/**
 * Get service registry (for admin/debug endpoints)
 */
export function getServiceRegistry(): Map<string, ServiceConfig> {
  return new Map(serviceRegistry);
}

/**
 * Get circuit breaker states (for admin/debug endpoints)
 */
export function getCircuitStates(): Map<string, CircuitState> {
  return new Map(circuitStates);
}

/**
 * Manually reset circuit breaker
 */
export function resetCircuitBreaker(serviceName: string): boolean {
  const state = circuitStates.get(serviceName);

  if (!state) {
    return false;
  }

  state.failures = 0;
  state.lastFailure = null;
  state.status = 'closed';

  console.log(`[Circuit Breaker] ${serviceName} manually reset`);
  return true;
}

// Export proxy utilities
export {
  serviceRegistry,
  forwardRequest,
  isCircuitAllowed,
  recordFailure,
  recordSuccess
};

export default createProxyMiddleware;
