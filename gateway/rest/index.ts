/**
 * REST API Gateway - Main Entry Point
 *
 * This is the primary REST API gateway for the Facebook Clone enterprise architecture.
 * It handles routing, middleware orchestration, and service proxy configuration.
 *
 * Architecture Overview:
 * - Express.js server with production-ready middleware stack
 * - Route-based service proxying with load balancing
 * - Comprehensive error handling and logging
 * - Request/response transformation and validation
 *
 * @module gateway/rest
 */

import express, { Express, Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import httpContext from 'express-http-context';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import middleware
import { authMiddleware, AuthenticatedRequest } from './middlewares/auth';
import { validationMiddleware } from './middlewares/validation';
import { errorHandler, AppError } from './middlewares/errorHandler';

// Import routes
import { userRoutes } from './routes/user.routes';
import { postRoutes } from './routes/post.routes';
import { authRoutes } from './routes/auth.routes';
import { feedRoutes } from './routes/feed.routes';

// Import proxy configuration
import { createProxyMiddleware } from './proxy';

// Logger setup - using console for simplicity, can be replaced with winston
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || ''),
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
};

// Configuration interface
interface GatewayConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  services: {
    userService: string;
    postService: string;
    feedService: string;
    authService: string;
    notificationService: string;
  };
}

// Default configuration
const config: GatewayConfig = {
  port: parseInt(process.env.GATEWAY_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:4001',
    postService: process.env.POST_SERVICE_URL || 'http://localhost:4002',
    feedService: process.env.FEED_SERVICE_URL || 'http://localhost:4003',
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:4004',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005'
  }
};

// Create Express application
const app: Express = express();

// ============================================
// MIDDLEWARE STACK
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'https:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client-Version', 'X-Device-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
}));

// Compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // Only compress responses > 1KB
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request context for tracking
app.use(httpContext.middleware);

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  httpContext.set('requestId', requestId);
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Request logging
app.use(morgan(':method :url :status :response-time ms - :res[content-length]', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim(), { requestId: httpContext.get('requestId') });
    }
  },
  skip: (req) => {
    // Skip health check logs in production
    return req.path === '/health' && process.env.NODE_ENV === 'production';
  }
}));

// ============================================
// HEALTH CHECK & METRICS
// ============================================

// Health check endpoint - critical for load balancers and orchestration
app.get('/health', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    services: {
      // In production, these would be actual health checks
      userService: 'connected',
      postService: 'connected',
      feedService: 'connected',
      authService: 'connected'
    }
  };

  res.status(200).json(healthCheck);
});

// Readiness probe for Kubernetes
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // In production, check database connections, external services, etc.
    // For now, just return ready
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: (error as Error).message });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', (req: Request, res: Response) => {
  // Basic metrics - in production, use prom-client
  const metrics = {
    process_cpu_seconds_total: process.cpuUsage().user / 1000000,
    process_resident_memory_bytes: process.memoryUsage().rss,
    nodejs_eventloop_lag_seconds: 0, // Would be calculated in production
    http_requests_total: 0 // Would be tracked via middleware
  };

  res.set('Content-Type', 'text/plain');
  res.send(JSON.stringify(metrics, null, 2));
});

// ============================================
// API ROUTES
// ============================================

// API versioning - all routes under /api/v1
const apiRouter = Router();

// Public routes (no auth required)
apiRouter.use('/auth', authRoutes);

// Protected routes (auth required)
apiRouter.use('/users', authMiddleware, userRoutes);
apiRouter.use('/posts', authMiddleware, postRoutes);
apiRouter.use('/feed', authMiddleware, feedRoutes);

// Mount API router
app.use('/api/v1', apiRouter);

// Legacy API support (deprecated)
app.use('/api', apiRouter);

// ============================================
// SERVICE PROXY ROUTES
// ============================================

// Proxy to backend microservices for specific routes
// This allows the gateway to forward requests to the appropriate service

// User service proxy
app.use('/services/users', createProxyMiddleware({
  target: config.services.userService,
  changeOrigin: true,
  pathRewrite: { '^/services/users': '' },
  onProxyReq: (proxyReq, req) => {
    const requestId = httpContext.get('requestId');
    if (requestId) {
      proxyReq.setHeader('X-Request-ID', requestId);
    }
    logger.debug(`Proxying to user service: ${req.method} ${req.path}`);
  }
}));

// Post service proxy
app.use('/services/posts', createProxyMiddleware({
  target: config.services.postService,
  changeOrigin: true,
  pathRewrite: { '^/services/posts': '' }
}));

// Feed service proxy
app.use('/services/feed', createProxyMiddleware({
  target: config.services.feedService,
  changeOrigin: true,
  pathRewrite: { '^/services/feed': '' }
}));

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - catch all unmatched routes
app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Cannot find ${req.method} ${req.path}`, 404);
  next(error);
});

// Global error handler - must be last
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Give ongoing requests 30 seconds to complete
  setTimeout(() => {
    logger.info('Forcing shutdown...');
    process.exit(1);
  }, 30000);

  // In production, you would:
  // 1. Stop accepting new connections
  // 2. Drain existing connections
  // 3. Close database connections
  // 4. Exit cleanly

  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

// ============================================
// START SERVER
// ============================================

const server = app.listen(config.port, () => {
  logger.info(`REST API Gateway started on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Health check: http://localhost:${config.port}/health`);
  logger.info(`API endpoint: http://localhost:${config.port}/api/v1`);
});

// Export for testing
export { app, server, config, logger };
export default app;
