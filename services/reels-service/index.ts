// Reels Service - Main Entry Point

export * from './types';
export * from './create-reel';
export * from './get-reels';
export * from './reel-engagement';
export * from './audio-library';

import { Express, Request, Response } from 'express';
import {
  CreateReelRequest,
  GetReelsRequest,
  Reel,
  ReelError,
  ReelErrorCode,
  ReelComment,
  ReelLike,
  AudioLibraryItem,
} from './types';
import { createReelHandler, CreateReelUseCase, CreateReelDerivativeUseCase } from './create-reel';
import { getReelHandler, getReelsFeedHandler, GetReelsUseCase, ReelWithAuthor } from './get-reels';
import { ReelEngagementService, likeReelHandler, commentHandler, CommentWithAuthor } from './reel-engagement';
import { AudioLibraryService, searchAudioHandler, AudioSearchResult } from './audio-library';

// Service configuration
export interface ReelsServiceConfig {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  videoServiceUrl: string;
  storageServiceUrl: string;
}

export const defaultConfig: ReelsServiceConfig = {
  port: 3006,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/facebook',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  videoServiceUrl: process.env.VIDEO_SERVICE_URL || 'http://localhost:3009',
  storageServiceUrl: process.env.STORAGE_SERVICE_URL || 'http://localhost:3010',
};

// Service dependencies
export interface ReelsServiceDependencies {
  // Repositories
  reelRepo: ReelRepository;
  likeRepo: LikeRepository;
  commentRepo: CommentRepository;
  shareRepo: ShareRepository;
  saveRepo: SaveRepository;
  audioRepo: AudioRepository;
  userRepo: UserRepository;
  
  // Services
  videoService: VideoService;
  audioService: AudioService;
  moderationService: ModerationService;
  followService: FollowService;
  recommendationService: RecommendationService;
  notificationService: NotificationService;
  analyticsService: AnalyticsService;
  copyrightService: CopyrightService;
  storageService: StorageService;
  cacheService: CacheService;
  eventBus: EventBus;
}

// Repository interfaces
export interface ReelRepository {
  create(reel: Reel): Promise<Reel>;
  findById(reelId: string): Promise<Reel | null>;
  findByUserId(userId: string, limit: number, offset: number): Promise<Reel[]>;
  findTrending(limit: number): Promise<Reel[]>;
  findByHashtag(hashtag: string, limit: number, offset: number): Promise<Reel[]>;
  findByAudioId(audioId: string, limit: number, offset: number): Promise<Reel[]>;
  findForYouFeed(viewerId: string, limit: number): Promise<Reel[]>;
  findFollowingFeed(viewerId: string, limit: number): Promise<Reel[]>;
  countByUserId(userId: string): Promise<number>;
  countTodayReels(userId: string): Promise<number>;
  incrementMetric(reelId: string, metric: string, delta: number): Promise<void>;
  updateEngagementRate(reelId: string, rate: number): Promise<void>;
  delete(reelId: string): Promise<void>;
}

export interface LikeRepository {
  create(like: ReelLike): Promise<ReelLike>;
  delete(reelId: string, userId: string): Promise<void>;
  findByReel(reelId: string, limit: number, offset: number): Promise<ReelLike[]>;
  countByReel(reelId: string): Promise<number>;
  hasUserLiked(reelId: string, userId: string): Promise<boolean>;
}

export interface CommentRepository {
  create(comment: ReelComment): Promise<ReelComment>;
  findById(commentId: string): Promise<ReelComment | null>;
  findByReel(reelId: string, limit: number, offset: number): Promise<ReelComment[]>;
  countByReel(reelId: string): Promise<number>;
  delete(commentId: string): Promise<void>;
  like(commentId: string): Promise<void>;
  unlike(commentId: string): Promise<void>;
}

export interface ShareRepository {
  create(share: { id: string; reelId: string; userId: string; shareType: string; sharedTo?: string; createdAt: Date }): Promise<void>;
  countByReel(reelId: string): Promise<number>;
}

export interface SaveRepository {
  create(reelId: string, userId: string): Promise<void>;
  delete(reelId: string, userId: string): Promise<void>;
  hasUserSaved(reelId: string, userId: string): Promise<boolean>;
  getUserSaves(userId: string, limit: number, offset: number): Promise<string[]>;
}

export interface AudioRepository {
  create(audio: AudioLibraryItem): Promise<AudioLibraryItem>;
  findById(audioId: string): Promise<AudioLibraryItem | null>;
  search(query: string, limit: number, offset: number): Promise<AudioLibraryItem[]>;
  findByCategory(category: string, limit: number, offset: number): Promise<AudioLibraryItem[]>;
  findTrending(limit: number): Promise<AudioLibraryItem[]>;
  incrementUsage(audioId: string): Promise<void>;
  count(): Promise<number>;
}

export interface UserRepository {
  findByIds(userIds: string[]): Promise<{
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  }[]>;
}

// Service interfaces
export interface VideoService {
  validateVideo(url: string): Promise<{
    isValid: boolean;
    duration: number;
    resolution: { width: number; height: number };
    format: string;
  }>;
  generateThumbnail(videoUrl: string, time?: number): Promise<string>;
  transcodeForReels(videoUrl: string): Promise<string>;
  combineVideos(url1: string, url2: string, layout: string): Promise<string>;
  stitchVideos(originalUrl: string, newUrl: string, start: number, duration: number): Promise<string>;
}

export interface AudioService {
  validateAudio(audioId: string): Promise<boolean>;
  checkCopyright(audioId: string, userId: string): Promise<{
    allowed: boolean;
    restrictions?: string[];
  }>;
}

export interface ModerationService {
  checkContent(content: string, mediaUrl: string): Promise<{
    approved: boolean;
    flags?: string[];
    severity?: 'low' | 'medium' | 'high';
  }>;
}

export interface FollowService {
  getFollowing(userId: string): Promise<string[]>;
}

export interface RecommendationService {
  getRecommendedReels(userId: string, limit: number): Promise<string[]>;
}

export interface NotificationService {
  notifyLike(recipientId: string, likerId: string, reelId: string): Promise<void>;
  notifyComment(recipientId: string, commenterId: string, reelId: string, commentId: string): Promise<void>;
  notifyShare(recipientId: string, sharerId: string, reelId: string): Promise<void>;
}

export interface AnalyticsService {
  trackEngagement(action: { type: string; reelId: string; userId: string; data?: Record<string, unknown> }): Promise<void>;
  trackAudioUsage(audioId: string, reelId: string, userId: string): Promise<void>;
}

export interface CopyrightService {
  checkCopyright(isrc: string): Promise<{
    isAllowed: boolean;
    restrictions?: Record<string, unknown>;
  }>;
}

export interface StorageService {
  uploadAudio(file: Buffer, filename: string): Promise<string>;
  getAudioUrl(key: string): Promise<string>;
  deleteAudio(key: string): Promise<void>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

export interface EventBus {
  publish(event: string, data: unknown): Promise<void>;
}

// API Routes
export function setupReelsRoutes(
  app: Express,
  deps: ReelsServiceDependencies
): void {
  const engagementService = new ReelEngagementService(
    deps.reelRepo,
    deps.likeRepo,
    deps.commentRepo,
    deps.shareRepo,
    deps.saveRepo,
    deps.userRepo,
    deps.notificationService,
    deps.analyticsService,
    deps.cacheService,
    deps.eventBus
  );

  const audioService = new AudioLibraryService(
    deps.audioRepo,
    deps.cacheService,
    deps.storageService,
    deps.copyrightService,
    deps.analyticsService
  );

  // Create a new reel
  app.post('/api/reels', async (req: Request, res: Response) => {
    try {
      const request: CreateReelRequest = req.body;
      const reel = await createReelHandler(request, {
        reelRepo: deps.reelRepo,
        videoService: deps.videoService,
        audioService: deps.audioService,
        moderationService: deps.moderationService,
        cacheService: deps.cacheService,
        eventBus: deps.eventBus,
      });
      res.status(201).json(reel);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get a specific reel
  app.get('/api/reels/:reelId', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const viewerId = req.headers['x-user-id'] as string;
      const reel = await getReelHandler(reelId, viewerId, {
        reelRepo: deps.reelRepo,
        userRepo: deps.userRepo,
        likeRepo: deps.likeRepo,
        saveRepo: deps.saveRepo,
        followService: deps.followService,
        cacheService: deps.cacheService,
        recommendationService: deps.recommendationService,
      });
      res.json(reel);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get reels feed
  app.get('/api/reels/feed', async (req: Request, res: Response) => {
    try {
      const viewerId = req.headers['x-user-id'] as string;
      const feedType = (req.query.feedType as 'for-you' | 'following' | 'trending') || 'for-you';
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await getReelsFeedHandler({
        viewerId,
        feedType,
        limit,
      }, {
        reelRepo: deps.reelRepo,
        userRepo: deps.userRepo,
        likeRepo: deps.likeRepo,
        saveRepo: deps.saveRepo,
        followService: deps.followService,
        cacheService: deps.cacheService,
        recommendationService: deps.recommendationService,
      });
      res.json(result);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get user's reels
  app.get('/api/reels/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const viewerId = req.headers['x-user-id'] as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const useCase = new GetReelsUseCase(
        deps.reelRepo,
        deps.userRepo,
        deps.likeRepo,
        deps.saveRepo,
        deps.followService,
        deps.cacheService,
        deps.recommendationService
      );

      const result = await useCase.getReels({
        viewerId,
        userId,
        limit,
        offset,
      });
      res.json(result);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Like a reel
  app.post('/api/reels/:reelId/like', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const like = await engagementService.likeReel(reelId, userId);
      res.status(201).json(like);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Unlike a reel
  app.delete('/api/reels/:reelId/like', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      await engagementService.unlikeReel(reelId, userId);
      res.status(204).send();
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get reel likes
  app.get('/api/reels/:reelId/likes', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await engagementService.getReelLikes(reelId, limit, offset);
      res.json(result);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Comment on a reel
  app.post('/api/reels/:reelId/comments', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { content, parentId } = req.body;
      const comment = await engagementService.addComment(reelId, userId, content, parentId);
      res.status(201).json(comment);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get reel comments
  app.get('/api/reels/:reelId/comments', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await engagementService.getComments(reelId, limit, offset);
      res.json(result);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Delete a comment
  app.delete('/api/reels/comments/:commentId', async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      await engagementService.deleteComment(commentId, userId);
      res.status(204).send();
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Share a reel
  app.post('/api/reels/:reelId/share', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { shareType, sharedTo } = req.body;
      const share = await engagementService.shareReel(reelId, userId, shareType, sharedTo);
      res.status(201).json(share);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Save a reel
  app.post('/api/reels/:reelId/save', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      await engagementService.saveReel(reelId, userId);
      res.status(204).send();
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Unsave a reel
  app.delete('/api/reels/:reelId/save', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      await engagementService.unsaveReel(reelId, userId);
      res.status(204).send();
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get saved reels
  app.get('/api/reels/saved', async (req: Request, res: Response) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const savedReelIds = await engagementService.getSavedReels(userId, limit, offset);
      res.json({ reelIds: savedReelIds });
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Create duet
  app.post('/api/reels/:reelId/duet', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { videoUrl, layout } = req.body;

      const derivativeUseCase = new CreateReelDerivativeUseCase(
        deps.reelRepo,
        deps.videoService,
        deps.eventBus
      );

      const reel = await derivativeUseCase.createDuet(reelId, userId, videoUrl, layout);
      res.status(201).json(reel);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Create stitch
  app.post('/api/reels/:reelId/stitch', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { videoUrl, clipStart, clipDuration } = req.body;

      const derivativeUseCase = new CreateReelDerivativeUseCase(
        deps.reelRepo,
        deps.videoService,
        deps.eventBus
      );

      const reel = await derivativeUseCase.createStitch(reelId, userId, videoUrl, clipStart, clipDuration);
      res.status(201).json(reel);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Delete a reel
  app.delete('/api/reels/:reelId', async (req: Request, res: Response) => {
    try {
      const { reelId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const reel = await deps.reelRepo.findById(reelId);
      if (!reel) {
        res.status(404).json({ error: 'Reel not found' });
        return;
      }

      if (reel.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to delete this reel' });
        return;
      }

      await deps.reelRepo.delete(reelId);
      await deps.cacheService.invalidate(`reels:user:${userId}`);
      await deps.eventBus.publish('reel.deleted', { reelId, userId });
      res.status(204).send();
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Audio Library Routes
  // Search audio
  app.get('/api/audio/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const category = req.query.category as string;
      const trending = req.query.trending === 'true';
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await audioService.searchAudio({
        query,
        category,
        trending,
        limit,
        offset,
      });
      res.json(result);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get audio by ID
  app.get('/api/audio/:audioId', async (req: Request, res: Response) => {
    try {
      const { audioId } = req.params;
      const audio = await audioService.getAudio(audioId);
      res.json(audio);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get trending audio
  app.get('/api/audio/trending', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const audio = await audioService.getTrending(limit);
      res.json(audio);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Get audio categories
  app.get('/api/audio/categories', async (_req: Request, res: Response) => {
    try {
      const categories = await audioService.getCategories();
      res.json(categories);
    } catch (error) {
      handleReelError(res, error);
    }
  });

  // Check audio usage rights
  app.get('/api/audio/:audioId/rights', async (req: Request, res: Response) => {
    try {
      const { audioId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const rights = await audioService.checkUsageRights(audioId, userId);
      res.json(rights);
    } catch (error) {
      handleReelError(res, error);
    }
  });
}

// Error handler
function handleReelError(res: Response, error: unknown): void {
  if (error instanceof ReelError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  console.error('Reels service error:', error);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// Service initialization
export async function createReelsService(
  config: ReelsServiceConfig = defaultConfig,
  deps: ReelsServiceDependencies
): Promise<{ app: Express; start: () => void }> {
  const express = await import('express');
  const app = express.default();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', service: 'reels-service' });
  });

  // Setup routes
  setupReelsRoutes(app, deps);

  return {
    app,
    start: () => {
      app.listen(config.port, () => {
        console.log(`Reels service running on port ${config.port}`);
      });
    },
  };
}

export default createReelsService;
