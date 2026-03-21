// Story Service - Main Entry Point

export * from './types';
export * from './create-story';
export * from './get-stories';
export * from './story-expiration';
export * from './story-views';

import { Express, Request, Response } from 'express';
import {
  CreateStoryRequest,
  GetStoriesRequest,
  Story,
  StoryFeedItem,
  StoryError,
  StoryViewsSummary,
} from './types';
import { createStoryHandler, CreateStoryUseCase } from './create-story';
import { getStoryHandler, getStoriesFeedHandler, GetStoriesUseCase } from './get-stories';
import { checkStoryExpirationHandler, StoryExpirationService, runExpirationCron } from './story-expiration';
import { recordViewHandler, getViewsHandler, StoryViewsService, StoryView } from './story-views';

// Service configuration
export interface StoryServiceConfig {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  mediaServiceUrl: string;
  enableExpirationCron: boolean;
  expirationCronInterval: number; // in milliseconds
}

// Default configuration
export const defaultConfig: StoryServiceConfig = {
  port: 3005,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/facebook',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  mediaServiceUrl: process.env.MEDIA_SERVICE_URL || 'http://localhost:3008',
  enableExpirationCron: true,
  expirationCronInterval: 60000, // 1 minute
};

// Service dependencies (to be injected)
export interface StoryServiceDependencies {
  storyRepo: StoryRepository;
  viewRepo: ViewRepository;
  userRepo: UserRepository;
  mediaService: MediaService;
  friendService: FriendService;
  cacheService: CacheService;
  eventBus: EventBus;
  notificationService: NotificationService;
  analyticsService: AnalyticsService;
  jobQueue: JobQueue;
}

// Repository interfaces
export interface StoryRepository {
  create(story: Story): Promise<Story>;
  findById(storyId: string): Promise<Story | null>;
  findByUserId(userId: string, includeExpired?: boolean): Promise<Story[]>;
  findFeedStories(viewerId: string): Promise<Story[]>;
  findActiveStories(userIds: string[]): Promise<Story[]>;
  findExpiredStories(): Promise<Story[]>;
  markAsExpired(storyId: string): Promise<void>;
  incrementViewCount(storyId: string): Promise<void>;
  countTodayStories(userId: string): Promise<number>;
  delete(storyId: string): Promise<void>;
}

export interface ViewRepository {
  create(view: StoryView): Promise<StoryView>;
  findByStory(storyId: string, limit?: number, offset?: number): Promise<StoryView[]>;
  countByStory(storyId: string): Promise<number>;
  hasUserViewed(storyId: string, userId: string): Promise<boolean>;
  getRecentViewers(storyId: string, limit: number): Promise<StoryView[]>;
}

export interface UserRepository {
  findByIds(userIds: string[]): Promise<{
    id: string;
    name: string;
    avatar: string;
  }[]>;
}

export interface MediaService {
  validateMediaUrl(url: string, type: 'image' | 'video'): Promise<boolean>;
  generateThumbnail(videoUrl: string): Promise<string>;
  deleteMedia(mediaUrl: string): Promise<void>;
}

export interface FriendService {
  getFriends(userId: string): Promise<string[]>;
  getCloseFriends(userId: string): Promise<string[]>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

export interface EventBus {
  publish(event: string, data: unknown): Promise<void>;
}

export interface NotificationService {
  notifyStoryExpired(userId: string, storyId: string): Promise<void>;
  notifyStoryViewed(storyOwnerId: string, viewerId: string, storyId: string): Promise<void>;
}

export interface AnalyticsService {
  trackStoryView(storyId: string, viewerId: string): Promise<void>;
  trackStoryExpiration(story: Story): Promise<void>;
}

export interface JobQueue {
  schedule(job: { storyId: string; expiresAt: Date }): Promise<void>;
  process(handler: (job: { storyId: string; expiresAt: Date }) => Promise<void>): void;
}

// API Routes
export function setupStoryRoutes(
  app: Express,
  deps: StoryServiceDependencies
): void {
  // Create a new story
  app.post('/api/stories', async (req: Request, res: Response) => {
    try {
      const request: CreateStoryRequest = req.body;
      const story = await createStoryHandler(request, {
        storyRepo: deps.storyRepo,
        mediaService: deps.mediaService,
        cacheService: deps.cacheService,
        eventBus: deps.eventBus,
      });
      res.status(201).json(story);
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Get a specific story
  app.get('/api/stories/:storyId', async (req: Request, res: Response) => {
    try {
      const { storyId } = req.params;
      const viewerId = req.headers['x-user-id'] as string;
      
      const story = await getStoryHandler(storyId, viewerId, {
        storyRepo: deps.storyRepo,
        viewRepo: deps.viewRepo,
        userRepo: deps.userRepo,
        friendService: deps.friendService,
        cacheService: deps.cacheService,
      });
      
      res.json(story);
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Get stories feed
  app.get('/api/stories/feed', async (req: Request, res: Response) => {
    try {
      const viewerId = req.headers['x-user-id'] as string;
      
      const feed = await getStoriesFeedHandler(viewerId, {
        storyRepo: deps.storyRepo,
        viewRepo: deps.viewRepo,
        userRepo: deps.userRepo,
        friendService: deps.friendService,
        cacheService: deps.cacheService,
      });
      
      res.json(feed);
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Get stories by user
  app.get('/api/stories/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const viewerId = req.headers['x-user-id'] as string;
      const includeExpired = req.query.includeExpired === 'true';
      
      const useCase = new GetStoriesUseCase(
        deps.storyRepo,
        deps.viewRepo,
        deps.userRepo,
        deps.friendService,
        deps.cacheService
      );
      
      const stories = await useCase.getUserStories(userId, viewerId, includeExpired);
      res.json(stories);
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Record a story view
  app.post('/api/stories/:storyId/view', async (req: Request, res: Response) => {
    try {
      const { storyId } = req.params;
      const viewerId = req.headers['x-user-id'] as string;
      const { reaction } = req.body;
      
      const view = await recordViewHandler(storyId, viewerId, reaction, {
        viewRepo: deps.viewRepo,
        storyRepo: deps.storyRepo,
        userRepo: deps.userRepo,
        friendService: deps.friendService,
        cacheService: deps.cacheService,
        eventBus: deps.eventBus,
        notificationService: deps.notificationService,
        analyticsService: deps.analyticsService,
      });
      
      res.status(201).json(view);
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Get story views (owner only)
  app.get('/api/stories/:storyId/views', async (req: Request, res: Response) => {
    try {
      const { storyId } = req.params;
      const requesterId = req.headers['x-user-id'] as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const views = await getViewsHandler(storyId, requesterId, limit, offset, {
        viewRepo: deps.viewRepo,
        storyRepo: deps.storyRepo,
        userRepo: deps.userRepo,
        friendService: deps.friendService,
        cacheService: deps.cacheService,
        eventBus: deps.eventBus,
        notificationService: deps.notificationService,
        analyticsService: deps.analyticsService,
      });
      
      res.json(views);
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Check story expiration
  app.get('/api/stories/:storyId/expiration', async (req: Request, res: Response) => {
    try {
      const { storyId } = req.params;
      
      const result = await checkStoryExpirationHandler(storyId, {
        storyRepo: deps.storyRepo,
      });
      
      res.json(result);
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Delete a story
  app.delete('/api/stories/:storyId', async (req: Request, res: Response) => {
    try {
      const { storyId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      
      const story = await deps.storyRepo.findById(storyId);
      if (!story) {
        res.status(404).json({ error: 'Story not found' });
        return;
      }
      
      if (story.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to delete this story' });
        return;
      }
      
      await deps.storyRepo.delete(storyId);
      await deps.cacheService.invalidate(`stories:user:${userId}`);
      await deps.mediaService.deleteMedia(story.mediaUrl);
      
      await deps.eventBus.publish('story.deleted', {
        storyId,
        userId,
      });
      
      res.status(204).send();
    } catch (error) {
      handleStoryError(res, error);
    }
  });

  // Admin: Process expired stories
  app.post('/api/admin/stories/process-expired', async (req: Request, res: Response) => {
    try {
      const expirationService = new StoryExpirationService(
        deps.storyRepo,
        deps.mediaService,
        deps.notificationService,
        deps.eventBus,
        deps.cacheService,
        deps.analyticsService,
        deps.jobQueue
      );
      
      const result = await runExpirationCron(expirationService);
      res.json(result);
    } catch (error) {
      handleStoryError(res, error);
    }
  });
}

// Error handler
function handleStoryError(res: Response, error: unknown): void {
  if (error instanceof StoryError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  console.error('Story service error:', error);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// Service initialization
export async function createStoryService(
  config: StoryServiceConfig = defaultConfig,
  deps: StoryServiceDependencies
): Promise<{ app: Express; start: () => void }> {
  const express = await import('express');
  const app = express.default();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', service: 'story-service' });
  });

  // Setup routes
  setupStoryRoutes(app, deps);

  // Start expiration cron if enabled
  if (config.enableExpirationCron) {
    const expirationService = new StoryExpirationService(
      deps.storyRepo,
      deps.mediaService,
      deps.notificationService,
      deps.eventBus,
      deps.cacheService,
      deps.analyticsService,
      deps.jobQueue
    );

    setInterval(
      () => runExpirationCron(expirationService),
      config.expirationCronInterval
    );
  }

  return {
    app,
    start: () => {
      app.listen(config.port, () => {
        console.log(`Story service running on port ${config.port}`);
      });
    },
  };
}

export default createStoryService;
