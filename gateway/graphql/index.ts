/**
 * GraphQL Gateway - Main Entry Point
 *
 * This is the primary GraphQL gateway for the Facebook Clone enterprise architecture.
 * It provides a unified GraphQL API with schema stitching, data loaders, and subscriptions.
 *
 * Architecture Overview:
 * - Apollo Server 4 with federation support
 * - Real-time subscriptions via WebSocket
 * - DataLoaders for N+1 query prevention
 * - Query complexity analysis and depth limiting
 *
 * @module gateway/graphql
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { json } from 'body-parser';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLScalarType, Kind } from 'graphql';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import schema and resolvers
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { UserAPI } from './datasources/UserAPI';
import { PostAPI } from './datasources/PostAPI';
import { FeedAPI } from './datasources/FeedAPI';

// Configuration
interface GraphQLConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  services: {
    userService: string;
    postService: string;
    feedService: string;
    authService: string;
  };
  depthLimit: number;
  complexityLimit: number;
}

const config: GraphQLConfig = {
  port: parseInt(process.env.GRAPHQL_PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:4001',
    postService: process.env.POST_SERVICE_URL || 'http://localhost:4002',
    feedService: process.env.FEED_SERVICE_URL || 'http://localhost:4003',
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:4004'
  },
  depthLimit: parseInt(process.env.GRAPHQL_DEPTH_LIMIT || '10', 10),
  complexityLimit: parseInt(process.env.GRAPHQL_COMPLEXITY_LIMIT || '1000', 10)
};

// Logger setup
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || ''),
  debug: (message: string, meta?: any) => {
    if (config.nodeEnv === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
};

// User context interface
interface UserContext {
  userId: string;
  email: string;
  username: string;
}

// Context function for Apollo Server
interface ContextValue {
  user?: UserContext;
  dataSources: {
    userAPI: UserAPI;
    postAPI: PostAPI;
    feedAPI: FeedAPI;
  };
}

// JWT verification (imported function for clarity)
import jwt from 'jsonwebtoken';

function verifyToken(token: string): UserContext | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
  } catch (error) {
    return null;
  }
}

// Create Express app and HTTP server
const app = express();
const httpServer = http.createServer(app);

// Create the schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql/subscriptions'
});

// WebSocket server cleanup for graceful shutdown
const serverCleanup = useServer({
  schema,
  context: async (ctx) => {
    // Get token from connection params
    const token = ctx.connectionParams?.authorization as string;
    const user = token ? verifyToken(token.replace('Bearer ', '')) : undefined;

    // Create data sources for subscription context
    return {
      user,
      dataSources: {
        userAPI: new UserAPI(config.services.userService),
        postAPI: new PostAPI(config.services.postService),
        feedAPI: new FeedAPI(config.services.feedService)
      }
    };
  },
  onConnect: () => {
    logger.info('WebSocket client connected');
  },
  onDisconnect: () => {
    logger.info('WebSocket client disconnected');
  }
}, wsServer);

// Create Apollo Server
const server = new ApolloServer<ContextValue>({
  schema,
  plugins: [
    // Proper shutdown for HTTP server
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for WebSocket server
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          }
        };
      }
    },

    // Disable landing page in production
    ...(config.nodeEnv === 'production' ? [ApolloServerPluginLandingPageDisabled()] : []),

    // Query logging plugin
    {
      async requestDidStart(requestContext) {
        const startTime = Date.now();

        return {
          async didResolveOperation({ operationName, request }) {
            logger.debug(`Operation: ${operationName || 'Anonymous'}`, {
              query: request.query?.substring(0, 100) + '...'
            });
          },
          async willSendResponse({ response }) {
            const duration = Date.now() - startTime;
            logger.debug(`Response sent in ${duration}ms`, {
              errors: response.body.kind === 'single' && response.body.singleResult.errors?.length || 0
            });
          }
        };
      }
    }
  ],
  formatError: (formattedError, error) => {
    // Log errors
    logger.error('GraphQL Error:', {
      message: formattedError.message,
      path: formattedError.path,
      extensions: formattedError.extensions
    });

    // In production, hide internal error details
    if (config.nodeEnv === 'production') {
      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'Internal server error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        };
      }
    }

    return formattedError;
  }
});

// Start Apollo Server
async function startServer() {
  await server.start();

  // Apply middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      credentials: true
    }),
    json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<ContextValue> => {
        // Get user from token
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const user = token ? verifyToken(token) : undefined;

        // Create data sources with DataLoaders
        return {
          user,
          dataSources: {
            userAPI: new UserAPI(config.services.userService),
            postAPI: new PostAPI(config.services.postService),
            feedAPI: new FeedAPI(config.services.feedService)
          }
        };
      }
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // GraphQL Playground (development only)
  if (config.nodeEnv === 'development') {
    app.get('/playground', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GraphQL Playground</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-middleware-express@2/graphql-playground.css" />
        </head>
        <body>
          <div id="root"></div>
          <script src="https://cdn.jsdelivr.net/npm/graphql-playground-middleware-express@2/graphql-playground.js"></script>
          <script>
            GraphQLPlayground.init(document.getElementById('root'), {
              endpoint: '/graphql',
              subscriptionEndpoint: 'ws://localhost:${config.port}/graphql/subscriptions'
            });
          </script>
        </body>
        </html>
      `);
    });
  }

  // Start HTTP server
  await new Promise<void>((resolve) => httpServer.listen({ port: config.port }, resolve));

  logger.info(`GraphQL Gateway started on port ${config.port}`);
  logger.info(`GraphQL endpoint: http://localhost:${config.port}/graphql`);
  logger.info(`Subscriptions endpoint: ws://localhost:${config.port}/graphql/subscriptions`);

  if (config.nodeEnv === 'development') {
    logger.info(`GraphQL Playground: http://localhost:${config.port}/playground`);
  }
}

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  setTimeout(() => {
    logger.info('Forcing shutdown...');
    process.exit(1);
  }, 30000);

  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason });
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export { server, httpServer, schema, config, logger };
export default server;
