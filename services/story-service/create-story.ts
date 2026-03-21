// Story Creation Module

import { v4 as uuidv4 } from 'uuid';
import {
  Story,
  CreateStoryRequest,
  StoryError,
  StoryErrorCode,
} from './types';

const STORY_EXPIRATION_HOURS = 24;
const MAX_STORIES_PER_DAY = 20;
const MAX_CAPTION_LENGTH = 500;

interface StoryRepository {
  create(story: Story): Promise<Story>;
  findByUserId(userId: string, limit?: number): Promise<Story[]>;
  countTodayStories(userId: string): Promise<number>;
}

interface MediaService {
  validateMediaUrl(url: string, type: 'image' | 'video'): Promise<boolean>;
  generateThumbnail(videoUrl: string): Promise<string>;
}

interface CacheService {
  invalidate(pattern: string): Promise<void>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
}

interface EventBus {
  publish(event: string, data: unknown): Promise<void>;
}

export class CreateStoryUseCase {
  constructor(
    private storyRepo: StoryRepository,
    private mediaService: MediaService,
    private cacheService: CacheService,
    private eventBus: EventBus
  ) {}

  async execute(request: CreateStoryRequest): Promise<Story> {
    await this.validateRequest(request);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + STORY_EXPIRATION_HOURS * 60 * 60 * 1000);

    const story: Story = {
      id: uuidv4(),
      userId: request.userId,
      mediaType: request.mediaType,
      mediaUrl: request.mediaUrl,
      thumbnailUrl: request.thumbnailUrl || (request.mediaType === 'video' 
        ? await this.mediaService.generateThumbnail(request.mediaUrl) 
        : undefined),
      caption: request.caption?.slice(0, MAX_CAPTION_LENGTH),
      duration: request.duration,
      createdAt: now,
      expiresAt,
      viewCount: 0,
      isExpired: false,
      privacy: request.privacy || { type: 'public' },
      mentions: request.mentions || [],
      hashtags: this.extractHashtags(request.caption) || request.hashtags,
      location: request.location,
      music: request.music,
      stickers: request.stickers,
    };

    const createdStory = await this.storyRepo.create(story);

    // Invalidate cache for user's stories
    await this.cacheService.invalidate(`stories:feed:${request.userId}`);
    await this.cacheService.invalidate(`stories:user:${request.userId}`);

    // Publish story created event
    await this.eventBus.publish('story.created', {
      storyId: createdStory.id,
      userId: createdStory.userId,
      createdAt: createdStory.createdAt,
      expiresAt: createdStory.expiresAt,
    });

    // Schedule expiration job
    await this.scheduleExpiration(createdStory);

    return createdStory;
  }

  private async validateRequest(request: CreateStoryRequest): Promise<void> {
    // Check rate limit
    const todayStories = await this.storyRepo.countTodayStories(request.userId);
    if (todayStories >= MAX_STORIES_PER_DAY) {
      throw new StoryError(
        `Daily story limit exceeded (${MAX_STORIES_PER_DAY})`,
        StoryErrorCode.RATE_LIMIT_EXCEEDED,
        429
      );
    }

    // Validate media URL
    const isValidMedia = await this.mediaService.validateMediaUrl(
      request.mediaUrl,
      request.mediaType
    );
    if (!isValidMedia) {
      throw new StoryError(
        'Invalid media URL or media type',
        StoryErrorCode.INVALID_MEDIA_TYPE,
        400
      );
    }

    // Validate caption length
    if (request.caption && request.caption.length > MAX_CAPTION_LENGTH) {
      throw new StoryError(
        `Caption exceeds maximum length of ${MAX_CAPTION_LENGTH} characters`,
        StoryErrorCode.INVALID_MEDIA_TYPE,
        400
      );
    }

    // Validate stickers
    if (request.stickers) {
      await this.validateStickers(request.stickers);
    }
  }

  private async validateStickers(stickers: Story['stickers']): Promise<void> {
    for (const sticker of stickers || []) {
      if (!sticker.id || !sticker.type || !sticker.position) {
        throw new StoryError(
          'Invalid sticker format',
          StoryErrorCode.INVALID_STICKER,
          400
        );
      }

      // Validate position bounds
      if (
        sticker.position.x < 0 ||
        sticker.position.x > 1 ||
        sticker.position.y < 0 ||
        sticker.position.y > 1
      ) {
        throw new StoryError(
          'Sticker position out of bounds',
          StoryErrorCode.INVALID_STICKER,
          400
        );
      }
    }
  }

  private extractHashtags(caption?: string): string[] {
    if (!caption) return [];
    const hashtagRegex = /#[\w]+/g;
    const matches = caption.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  }

  private async scheduleExpiration(story: Story): Promise<void> {
    // This would integrate with a job queue system
    // For now, we'll publish an event that can be picked up by a scheduler
    await this.eventBus.publish('story.expiration.scheduled', {
      storyId: story.id,
      expiresAt: story.expiresAt,
    });
  }
}

// API Handler
export async function createStoryHandler(
  request: CreateStoryRequest,
  dependencies: {
    storyRepo: StoryRepository;
    mediaService: MediaService;
    cacheService: CacheService;
    eventBus: EventBus;
  }
): Promise<Story> {
  const useCase = new CreateStoryUseCase(
    dependencies.storyRepo,
    dependencies.mediaService,
    dependencies.cacheService,
    dependencies.eventBus
  );
  return useCase.execute(request);
}
