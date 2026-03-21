// Story Views Module

import { v4 as uuidv4 } from 'uuid';
import {
  Story,
  StoryView,
  StoryError,
  StoryErrorCode,
} from './types';

interface ViewRepository {
  create(view: StoryView): Promise<StoryView>;
  findByStory(storyId: string, limit?: number, offset?: number): Promise<StoryView[]>;
  countByStory(storyId: string): Promise<number>;
  hasUserViewed(storyId: string, userId: string): Promise<boolean>;
  getRecentViewers(storyId: string, limit: number): Promise<StoryView[]>;
}

interface StoryRepository {
  findById(storyId: string): Promise<Story | null>;
  incrementViewCount(storyId: string): Promise<void>;
}

interface UserRepository {
  findByIds(userIds: string[]): Promise<{
    id: string;
    name: string;
    avatar: string;
  }[]>;
}

interface FriendService {
  getFriends(userId: string): Promise<string[]>;
  getCloseFriends(userId: string): Promise<string[]>;
}

interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

interface EventBus {
  publish(event: string, data: unknown): Promise<void>;
}

interface NotificationService {
  notifyStoryViewed(storyOwnerId: string, viewerId: string, storyId: string): Promise<void>;
}

interface AnalyticsService {
  trackStoryView(storyId: string, viewerId: string): Promise<void>;
}

export interface StoryViewDetails {
  view: StoryView;
  viewer: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface StoryViewsSummary {
  totalViews: number;
  uniqueViewers: number;
  recentViewers: StoryViewDetails[];
  reactions: { reaction: string; count: number }[];
}

export class StoryViewsService {
  constructor(
    private viewRepo: ViewRepository,
    private storyRepo: StoryRepository,
    private userRepo: UserRepository,
    private friendService: FriendService,
    private cacheService: CacheService,
    private eventBus: EventBus,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService
  ) {}

  /**
   * Record a story view
   */
  async recordView(
    storyId: string,
    viewerId: string,
    reaction?: string
  ): Promise<StoryView> {
    // Get story
    const story = await this.storyRepo.findById(storyId);
    if (!story) {
      throw new StoryError('Story not found', StoryErrorCode.STORY_NOT_FOUND, 404);
    }

    // Check if expired
    if (story.isExpired || new Date() > story.expiresAt) {
      throw new StoryError('Story has expired', StoryErrorCode.STORY_EXPIRED, 410);
    }

    // Check access
    await this.checkViewAccess(story, viewerId);

    // Check if already viewed (idempotency within a time window)
    const alreadyViewed = await this.viewRepo.hasUserViewed(storyId, viewerId);
    
    const view: StoryView = {
      id: uuidv4(),
      storyId,
      viewerId,
      viewedAt: new Date(),
      reaction,
    };

    const createdView = await this.viewRepo.create(view);

    // Only increment view count for new views
    if (!alreadyViewed) {
      await this.storyRepo.incrementViewCount(storyId);
      
      // Invalidate cache
      await this.cacheService.invalidate(`story:${storyId}:views`);
      await this.cacheService.invalidate(`stories:user:${story.userId}`);
    }

    // Track analytics
    await this.analyticsService.trackStoryView(storyId, viewerId);

    // Publish view event
    await this.eventBus.publish('story.viewed', {
      storyId,
      viewerId,
      viewedAt: view.viewedAt,
      reaction,
      isNewView: !alreadyViewed,
    });

    // Notify story owner (for new views only, and not own story)
    if (!alreadyViewed && viewerId !== story.userId) {
      await this.notificationService.notifyStoryViewed(
        story.userId,
        viewerId,
        storyId
      );
    }

    return createdView;
  }

  /**
   * Get all views for a story
   */
  async getViews(
    storyId: string,
    requesterId: string,
    limit = 50,
    offset = 0
  ): Promise<StoryViewsSummary> {
    // Get story
    const story = await this.storyRepo.findById(storyId);
    if (!story) {
      throw new StoryError('Story not found', StoryErrorCode.STORY_NOT_FOUND, 404);
    }

    // Only story owner can see all views
    if (story.userId !== requesterId) {
      throw new StoryError(
        'Only story owner can view all viewers',
        StoryErrorCode.UNAUTHORIZED_ACCESS,
        403
      );
    }

    // Check cache
    const cacheKey = `story:${storyId}:views:summary`;
    const cached = await this.cacheService.get<StoryViewsSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get views
    const views = await this.viewRepo.findByStory(storyId, limit, offset);
    const totalViews = await this.viewRepo.countByStory(storyId);

    // Get viewer details
    const viewerIds = [...new Set(views.map(v => v.viewerId))];
    const viewers = await this.userRepo.findByIds(viewerIds);
    const viewerMap = new Map(viewers.map(v => [v.id, v]));

    // Build view details
    const viewDetails: StoryViewDetails[] = views.map(view => ({
      view,
      viewer: viewerMap.get(view.viewerId) || {
        id: view.viewerId,
        name: 'Unknown User',
        avatar: '',
      },
    }));

    // Count reactions
    const reactionCounts = new Map<string, number>();
    for (const view of views) {
      if (view.reaction) {
        reactionCounts.set(
          view.reaction,
          (reactionCounts.get(view.reaction) || 0) + 1
        );
      }
    }

    const reactions = Array.from(reactionCounts.entries())
      .map(([reaction, count]) => ({ reaction, count }))
      .sort((a, b) => b.count - a.count);

    const summary: StoryViewsSummary = {
      totalViews,
      uniqueViewers: totalViews, // Same as total views for now
      recentViewers: viewDetails,
      reactions,
    };

    // Cache for 30 seconds
    await this.cacheService.set(cacheKey, summary, 30);

    return summary;
  }

  /**
   * Get recent viewers for display
   */
  async getRecentViewers(
    storyId: string,
    requesterId: string,
    limit = 5
  ): Promise<StoryViewDetails[]> {
    const story = await this.storyRepo.findById(storyId);
    if (!story) {
      throw new StoryError('Story not found', StoryErrorCode.STORY_NOT_FOUND, 404);
    }

    if (story.userId !== requesterId) {
      throw new StoryError(
        'Only story owner can view viewers',
        StoryErrorCode.UNAUTHORIZED_ACCESS,
        403
      );
    }

    const views = await this.viewRepo.getRecentViewers(storyId, limit);
    const viewerIds = views.map(v => v.viewerId);
    const viewers = await this.userRepo.findByIds(viewerIds);
    const viewerMap = new Map(viewers.map(v => [v.id, v]));

    return views.map(view => ({
      view,
      viewer: viewerMap.get(view.viewerId) || {
        id: view.viewerId,
        name: 'Unknown User',
        avatar: '',
      },
    }));
  }

  /**
   * Check if a user has viewed a story
   */
  async hasUserViewed(storyId: string, userId: string): Promise<boolean> {
    return this.viewRepo.hasUserViewed(storyId, userId);
  }

  /**
   * Get unviewed stories count for a user
   */
  async getUnviewedCount(
    storyOwnerIds: string[],
    viewerId: string
  ): Promise<Map<string, number>> {
    const unviewedCounts = new Map<string, number>();

    for (const ownerId of storyOwnerIds) {
      // This would need to be optimized in production with a batch query
      // For now, we'll return a placeholder
      unviewedCounts.set(ownerId, 0);
    }

    return unviewedCounts;
  }

  /**
   * Add a reaction to a viewed story
   */
  async addReaction(
    storyId: string,
    viewerId: string,
    reaction: string
  ): Promise<StoryView> {
    return this.recordView(storyId, viewerId, reaction);
  }

  /**
   * Check view access based on story privacy
   */
  private async checkViewAccess(story: Story, viewerId: string): Promise<void> {
    // Owner can always view
    if (story.userId === viewerId) {
      return;
    }

    const { privacy } = story;

    switch (privacy.type) {
      case 'public':
        if (privacy.blockedUsers?.includes(viewerId)) {
          throw new StoryError(
            'Cannot view this story',
            StoryErrorCode.VIEW_NOT_ALLOWED,
            403
          );
        }
        break;

      case 'friends':
        const friends = await this.friendService.getFriends(story.userId);
        if (!friends.includes(viewerId)) {
          throw new StoryError(
            'Story only visible to friends',
            StoryErrorCode.VIEW_NOT_ALLOWED,
            403
          );
        }
        break;

      case 'close_friends':
        const closeFriends = await this.friendService.getCloseFriends(story.userId);
        if (!closeFriends.includes(viewerId)) {
          throw new StoryError(
            'Story only visible to close friends',
            StoryErrorCode.VIEW_NOT_ALLOWED,
            403
          );
        }
        break;

      case 'custom':
        if (!privacy.allowedUsers?.includes(viewerId)) {
          throw new StoryError(
            'Not allowed to view this story',
            StoryErrorCode.VIEW_NOT_ALLOWED,
            403
          );
        }
        break;
    }
  }
}

// API Handlers
export async function recordViewHandler(
  storyId: string,
  viewerId: string,
  reaction: string | undefined,
  dependencies: {
    viewRepo: ViewRepository;
    storyRepo: StoryRepository;
    userRepo: UserRepository;
    friendService: FriendService;
    cacheService: CacheService;
    eventBus: EventBus;
    notificationService: NotificationService;
    analyticsService: AnalyticsService;
  }
): Promise<StoryView> {
  const service = new StoryViewsService(
    dependencies.viewRepo,
    dependencies.storyRepo,
    dependencies.userRepo,
    dependencies.friendService,
    dependencies.cacheService,
    dependencies.eventBus,
    dependencies.notificationService,
    dependencies.analyticsService
  );
  return service.recordView(storyId, viewerId, reaction);
}

export async function getViewsHandler(
  storyId: string,
  requesterId: string,
  limit: number,
  offset: number,
  dependencies: {
    viewRepo: ViewRepository;
    storyRepo: StoryRepository;
    userRepo: UserRepository;
    friendService: FriendService;
    cacheService: CacheService;
    eventBus: EventBus;
    notificationService: NotificationService;
    analyticsService: AnalyticsService;
  }
): Promise<StoryViewsSummary> {
  const service = new StoryViewsService(
    dependencies.viewRepo,
    dependencies.storyRepo,
    dependencies.userRepo,
    dependencies.friendService,
    dependencies.cacheService,
    dependencies.eventBus,
    dependencies.notificationService,
    dependencies.analyticsService
  );
  return service.getViews(storyId, requesterId, limit, offset);
}
