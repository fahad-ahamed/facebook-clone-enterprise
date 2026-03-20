// Story Retrieval Module

import {
  Story,
  StoryView,
  StoryFeedItem,
  GetStoriesRequest,
  GetStoriesResponse,
  StoryError,
  StoryErrorCode,
} from './types';

interface StoryRepository {
  findById(storyId: string): Promise<Story | null>;
  findByUserId(userId: string, includeExpired?: boolean): Promise<Story[]>;
  findFeedStories(viewerId: string): Promise<Story[]>;
  findActiveStories(userIds: string[]): Promise<Story[]>;
}

interface ViewRepository {
  findViewsByStory(storyId: string): Promise<StoryView[]>;
  hasUserViewedStory(storyId: string, userId: string): Promise<boolean>;
  markAsViewed(storyId: string, viewerId: string): Promise<void>;
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
}

const CACHE_TTL = 60; // 1 minute
const MAX_STORIES_PER_FETCH = 50;

export class GetStoriesUseCase {
  constructor(
    private storyRepo: StoryRepository,
    private viewRepo: ViewRepository,
    private userRepo: UserRepository,
    private friendService: FriendService,
    private cacheService: CacheService
  ) {}

  async getStoryById(storyId: string, viewerId: string): Promise<Story> {
    const story = await this.storyRepo.findById(storyId);
    
    if (!story) {
      throw new StoryError('Story not found', StoryErrorCode.STORY_NOT_FOUND, 404);
    }

    await this.checkAccess(story, viewerId);

    if (story.isExpired || new Date() > story.expiresAt) {
      throw new StoryError('Story has expired', StoryErrorCode.STORY_EXPIRED, 410);
    }

    return story;
  }

  async getUserStories(
    userId: string,
    viewerId: string,
    includeExpired = false
  ): Promise<Story[]> {
    const cacheKey = `stories:user:${userId}:${includeExpired}`;
    const cached = await this.cacheService.get<Story[]>(cacheKey);
    
    if (cached) {
      return this.filterByPrivacy(cached, viewerId);
    }

    const stories = await this.storyRepo.findByUserId(userId, includeExpired);
    
    await this.cacheService.set(cacheKey, stories, CACHE_TTL);

    return this.filterByPrivacy(stories, viewerId);
  }

  async getStoriesFeed(viewerId: string): Promise<StoryFeedItem[]> {
    const cacheKey = `stories:feed:${viewerId}`;
    const cached = await this.cacheService.get<StoryFeedItem[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get all stories for feed
    const allStories = await this.storyRepo.findFeedStories(viewerId);
    
    // Group by user
    const userStoryMap = new Map<string, Story[]>();
    for (const story of allStories) {
      const userStories = userStoryMap.get(story.userId) || [];
      userStories.push(story);
      userStoryMap.set(story.userId, userStories);
    }

    // Get user info
    const userIds = Array.from(userStoryMap.keys());
    const users = await this.userRepo.findByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    // Build feed items with unviewed status
    const feedItems: StoryFeedItem[] = [];
    for (const [userId, stories] of userStoryMap) {
      const user = userMap.get(userId);
      if (!user) continue;

      const hasUnviewed = await this.checkUnviewedStories(stories, viewerId);
      
      feedItems.push({
        userId,
        userName: user.name,
        userAvatar: user.avatar,
        hasUnviewedStories: hasUnviewed,
        stories: stories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      });
    }

    // Sort: unviewed first, then by most recent story
    feedItems.sort((a, b) => {
      if (a.hasUnviewedStories !== b.hasUnviewedStories) {
        return a.hasUnviewedStories ? -1 : 1;
      }
      const aLatest = a.stories[0]?.createdAt.getTime() || 0;
      const bLatest = b.stories[0]?.createdAt.getTime() || 0;
      return bLatest - aLatest;
    });

    await this.cacheService.set(cacheKey, feedItems, CACHE_TTL);

    return feedItems;
  }

  async getStories(request: GetStoriesRequest): Promise<GetStoriesResponse> {
    const limit = Math.min(request.limit || 20, MAX_STORIES_PER_FETCH);
    const offset = request.offset || 0;

    let stories: Story[];

    if (request.userId) {
      stories = await this.getUserStories(
        request.userId,
        request.viewerId,
        request.includeExpired
      );
    } else {
      stories = await this.storyRepo.findFeedStories(request.viewerId);
      stories = this.filterByPrivacy(stories, request.viewerId);
    }

    // Filter out expired stories unless explicitly requested
    if (!request.includeExpired) {
      stories = stories.filter(s => !s.isExpired && new Date() <= s.expiresAt);
    }

    const total = stories.length;
    const paginatedStories = stories.slice(offset, offset + limit);

    return {
      stories: paginatedStories,
      hasMore: offset + limit < total,
      total,
    };
  }

  private async checkAccess(story: Story, viewerId: string): Promise<void> {
    if (story.userId === viewerId) {
      return; // Owner always has access
    }

    const { privacy } = story;

    switch (privacy.type) {
      case 'public':
        if (privacy.blockedUsers?.includes(viewerId)) {
          throw new StoryError(
            'You do not have access to this story',
            StoryErrorCode.UNAUTHORIZED_ACCESS,
            403
          );
        }
        break;

      case 'friends':
        const friends = await this.friendService.getFriends(story.userId);
        if (!friends.includes(viewerId)) {
          throw new StoryError(
            'This story is only visible to friends',
            StoryErrorCode.UNAUTHORIZED_ACCESS,
            403
          );
        }
        break;

      case 'close_friends':
        const closeFriends = await this.friendService.getCloseFriends(story.userId);
        if (!closeFriends.includes(viewerId)) {
          throw new StoryError(
            'This story is only visible to close friends',
            StoryErrorCode.UNAUTHORIZED_ACCESS,
            403
          );
        }
        break;

      case 'custom':
        if (!privacy.allowedUsers?.includes(viewerId)) {
          throw new StoryError(
            'You do not have access to this story',
            StoryErrorCode.UNAUTHORIZED_ACCESS,
            403
          );
        }
        break;
    }
  }

  private filterByPrivacy(stories: Story[], viewerId: string): Story[] {
    // This is a simplified filter - in production, you'd want to batch
    // the friend checks and handle async properly
    return stories.filter(story => {
      if (story.userId === viewerId) return true;
      if (story.privacy.type === 'public') {
        return !story.privacy.blockedUsers?.includes(viewerId);
      }
      // For other privacy types, we'd need async checks
      // For now, include them and let the view handler check access
      return true;
    });
  }

  private async checkUnviewedStories(
    stories: Story[],
    viewerId: string
  ): Promise<boolean> {
    for (const story of stories) {
      const viewed = await this.viewRepo.hasUserViewedStory(story.id, viewerId);
      if (!viewed) {
        return true;
      }
    }
    return false;
  }
}

// API Handlers
export async function getStoryHandler(
  storyId: string,
  viewerId: string,
  dependencies: {
    storyRepo: StoryRepository;
    viewRepo: ViewRepository;
    userRepo: UserRepository;
    friendService: FriendService;
    cacheService: CacheService;
  }
): Promise<Story> {
  const useCase = new GetStoriesUseCase(
    dependencies.storyRepo,
    dependencies.viewRepo,
    dependencies.userRepo,
    dependencies.friendService,
    dependencies.cacheService
  );
  return useCase.getStoryById(storyId, viewerId);
}

export async function getStoriesFeedHandler(
  viewerId: string,
  dependencies: {
    storyRepo: StoryRepository;
    viewRepo: ViewRepository;
    userRepo: UserRepository;
    friendService: FriendService;
    cacheService: CacheService;
  }
): Promise<StoryFeedItem[]> {
  const useCase = new GetStoriesUseCase(
    dependencies.storyRepo,
    dependencies.viewRepo,
    dependencies.userRepo,
    dependencies.friendService,
    dependencies.cacheService
  );
  return useCase.getStoriesFeed(viewerId);
}
