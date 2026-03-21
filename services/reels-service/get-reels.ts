// Reels Retrieval Module

import {
  Reel,
  GetReelsRequest,
  GetReelsResponse,
  ReelError,
  ReelErrorCode,
  REEL_CONSTANTS,
} from './types';

interface ReelRepository {
  findById(reelId: string): Promise<Reel | null>;
  findByUserId(userId: string, limit: number, offset: number): Promise<Reel[]>;
  findTrending(limit: number): Promise<Reel[]>;
  findByHashtag(hashtag: string, limit: number, offset: number): Promise<Reel[]>;
  findByAudioId(audioId: string, limit: number, offset: number): Promise<Reel[]>;
  findForYouFeed(viewerId: string, limit: number): Promise<Reel[]>;
  findFollowingFeed(viewerId: string, limit: number): Promise<Reel[]>;
  countByUserId(userId: string): Promise<number>;
}

interface UserRepository {
  findByIds(userIds: string[]): Promise<{
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  }[]>;
}

interface LikeRepository {
  hasUserLiked(reelId: string, userId: string): Promise<boolean>;
}

interface SaveRepository {
  hasUserSaved(reelId: string, userId: string): Promise<boolean>;
}

interface FollowService {
  getFollowing(userId: string): Promise<string[]>;
}

interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

interface RecommendationService {
  getRecommendedReels(userId: string, limit: number): Promise<string[]>;
}

export interface ReelWithAuthor extends Reel {
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  isLiked: boolean;
  isSaved: boolean;
}

export interface ReelFeedResponse extends GetReelsResponse {
  reels: ReelWithAuthor[];
}

export class GetReelsUseCase {
  constructor(
    private reelRepo: ReelRepository,
    private userRepo: UserRepository,
    private likeRepo: LikeRepository,
    private saveRepo: SaveRepository,
    private followService: FollowService,
    private cacheService: CacheService,
    private recommendationService: RecommendationService
  ) {}

  async getReelById(reelId: string, viewerId: string): Promise<ReelWithAuthor> {
    const reel = await this.reelRepo.findById(reelId);
    
    if (!reel) {
      throw new ReelError('Reel not found', ReelErrorCode.REEL_NOT_FOUND, 404);
    }

    return this.enrichReel(reel, viewerId);
  }

  async getReels(request: GetReelsRequest): Promise<ReelFeedResponse> {
    const limit = request.limit || 20;
    const offset = request.offset || 0;

    let reels: Reel[];

    // Determine feed type and fetch accordingly
    switch (request.feedType) {
      case 'for-you':
        reels = await this.getForYouFeed(request.viewerId, limit);
        break;
      case 'following':
        reels = await this.getFollowingFeed(request.viewerId, limit);
        break;
      case 'trending':
        reels = await this.getTrendingFeed(limit);
        break;
      default:
        if (request.userId) {
          reels = await this.getUserReels(request.userId, limit, offset);
        } else if (request.hashtag) {
          reels = await this.getHashtagReels(request.hashtag, limit, offset);
        } else if (request.audioId) {
          reels = await this.getAudioReels(request.audioId, limit, offset);
        } else {
          reels = await this.getForYouFeed(request.viewerId, limit);
        }
    }

    // Enrich reels with author info and user interaction state
    const enrichedReels = await Promise.all(
      reels.map(reel => this.enrichReel(reel, request.viewerId))
    );

    return {
      reels: enrichedReels,
      hasMore: reels.length === limit,
      nextCursor: reels.length > 0 ? reels[reels.length - 1].id : undefined,
    };
  }

  async getUserReels(
    userId: string,
    limit: number,
    offset: number
  ): Promise<Reel[]> {
    const cacheKey = `reels:user:${userId}:${offset}:${limit}`;
    const cached = await this.cacheService.get<Reel[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const reels = await this.reelRepo.findByUserId(userId, limit, offset);
    await this.cacheService.set(cacheKey, reels, 60); // 1 minute cache
    
    return reels;
  }

  async getTrendingFeed(limit: number): Promise<Reel[]> {
    const cacheKey = `reels:trending:${limit}`;
    const cached = await this.cacheService.get<Reel[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const reels = await this.reelRepo.findTrending(limit);
    await this.cacheService.set(cacheKey, reels, 300); // 5 minute cache
    
    return reels;
  }

  async getForYouFeed(viewerId: string, limit: number): Promise<Reel[]> {
    // Get recommendations
    const recommendedIds = await this.recommendationService.getRecommendedReels(
      viewerId,
      limit * 2 // Get more for diversity
    );

    if (recommendedIds.length > 0) {
      const reels = await Promise.all(
        recommendedIds.slice(0, limit).map(id => this.reelRepo.findById(id))
      );
      return reels.filter((r): r is Reel => r !== null);
    }

    // Fallback to trending if no recommendations
    return this.getTrendingFeed(limit);
  }

  async getFollowingFeed(viewerId: string, limit: number): Promise<Reel[]> {
    return this.reelRepo.findFollowingFeed(viewerId, limit);
  }

  async getHashtagReels(
    hashtag: string,
    limit: number,
    offset: number
  ): Promise<Reel[]> {
    const normalizedHashtag = hashtag.toLowerCase().replace('#', '');
    return this.reelRepo.findByHashtag(normalizedHashtag, limit, offset);
  }

  async getAudioReels(
    audioId: string,
    limit: number,
    offset: number
  ): Promise<Reel[]> {
    return this.reelRepo.findByAudioId(audioId, limit, offset);
  }

  async searchReels(
    query: string,
    viewerId: string,
    limit: number,
    offset: number
  ): Promise<ReelFeedResponse> {
    // This would integrate with a search service
    // For now, return empty
    return {
      reels: [],
      hasMore: false,
    };
  }

  private async enrichReel(reel: Reel, viewerId: string): Promise<ReelWithAuthor> {
    // Get author info
    const authors = await this.userRepo.findByIds([reel.userId]);
    const author = authors[0] || {
      id: reel.userId,
      name: 'Unknown User',
      username: 'unknown',
      avatar: '',
      isVerified: false,
    };

    // Check if user has liked/saved
    const [isLiked, isSaved] = await Promise.all([
      this.likeRepo.hasUserLiked(reel.id, viewerId),
      this.saveRepo.hasUserSaved(reel.id, viewerId),
    ]);

    return {
      ...reel,
      author,
      isLiked,
      isSaved,
    };
  }
}

// Reel Discovery
export class ReelDiscoveryUseCase {
  constructor(
    private reelRepo: ReelRepository,
    private cacheService: CacheService
  ) {}

  async getTrendingHashtags(limit: number = 20): Promise<{
    hashtag: string;
    count: number;
    growth: number;
  }[]> {
    const cacheKey = `reels:trending-hashtags:${limit}`;
    const cached = await this.cacheService.get<{
      hashtag: string;
      count: number;
      growth: number;
    }[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // This would query analytics for trending hashtags
    const trending = [];
    await this.cacheService.set(cacheKey, trending, 300);
    
    return trending;
  }

  async getTrendingAudio(limit: number = 20): Promise<{
    audioId: string;
    title: string;
    artist: string;
    usageCount: number;
  }[]> {
    const cacheKey = `reels:trending-audio:${limit}`;
    const cached = await this.cacheService.get<{
      audioId: string;
      title: string;
      artist: string;
      usageCount: number;
    }[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // This would query analytics for trending audio
    const trending = [];
    await this.cacheService.set(cacheKey, trending, 300);
    
    return trending;
  }

  async getDiscoverCategories(): Promise<{
    id: string;
    name: string;
    thumbnail: string;
    reelCount: number;
  }[]> {
    const cacheKey = 'reels:discover-categories';
    const cached = await this.cacheService.get<{
      id: string;
      name: string;
      thumbnail: string;
      reelCount: number;
    }[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const categories = [
      { id: 'comedy', name: 'Comedy', thumbnail: '', reelCount: 0 },
      { id: 'dance', name: 'Dance', thumbnail: '', reelCount: 0 },
      { id: 'music', name: 'Music', thumbnail: '', reelCount: 0 },
      { id: 'sports', name: 'Sports', thumbnail: '', reelCount: 0 },
      { id: 'gaming', name: 'Gaming', thumbnail: '', reelCount: 0 },
      { id: 'food', name: 'Food', thumbnail: '', reelCount: 0 },
      { id: 'beauty', name: 'Beauty', thumbnail: '', reelCount: 0 },
      { id: 'fashion', name: 'Fashion', thumbnail: '', reelCount: 0 },
    ];

    await this.cacheService.set(cacheKey, categories, 3600); // 1 hour
    
    return categories;
  }
}

// API Handlers
export async function getReelHandler(
  reelId: string,
  viewerId: string,
  dependencies: {
    reelRepo: ReelRepository;
    userRepo: UserRepository;
    likeRepo: LikeRepository;
    saveRepo: SaveRepository;
    followService: FollowService;
    cacheService: CacheService;
    recommendationService: RecommendationService;
  }
): Promise<ReelWithAuthor> {
  const useCase = new GetReelsUseCase(
    dependencies.reelRepo,
    dependencies.userRepo,
    dependencies.likeRepo,
    dependencies.saveRepo,
    dependencies.followService,
    dependencies.cacheService,
    dependencies.recommendationService
  );
  return useCase.getReelById(reelId, viewerId);
}

export async function getReelsFeedHandler(
  request: GetReelsRequest,
  dependencies: {
    reelRepo: ReelRepository;
    userRepo: UserRepository;
    likeRepo: LikeRepository;
    saveRepo: SaveRepository;
    followService: FollowService;
    cacheService: CacheService;
    recommendationService: RecommendationService;
  }
): Promise<ReelFeedResponse> {
  const useCase = new GetReelsUseCase(
    dependencies.reelRepo,
    dependencies.userRepo,
    dependencies.likeRepo,
    dependencies.saveRepo,
    dependencies.followService,
    dependencies.cacheService,
    dependencies.recommendationService
  );
  return useCase.getReels(request);
}
