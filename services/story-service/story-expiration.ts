// Story Expiration Module - 24 Hour Expiration Logic

import {
  Story,
  StoryExpirationJob,
  StoryError,
  StoryErrorCode,
} from './types';

interface StoryRepository {
  findById(storyId: string): Promise<Story | null>;
  markAsExpired(storyId: string): Promise<void>;
  findExpiredStories(): Promise<Story[]>;
  delete(storyId: string): Promise<void>;
}

interface MediaService {
  deleteMedia(mediaUrl: string): Promise<void>;
}

interface NotificationService {
  notifyStoryExpired(userId: string, storyId: string): Promise<void>;
}

interface EventBus {
  publish(event: string, data: unknown): Promise<void>;
}

interface JobQueue {
  schedule(job: StoryExpirationJob): Promise<void>;
  process(handler: (job: StoryExpirationJob) => Promise<void>): void;
}

interface CacheService {
  invalidate(pattern: string): Promise<void>;
}

interface AnalyticsService {
  trackStoryExpiration(story: Story): Promise<void>;
}

export class StoryExpirationService {
  private readonly EXPIRATION_HOURS = 24;
  private readonly CLEANUP_DELAY_MS = 24 * 60 * 60 * 1000; // Keep expired for 24h more for analytics

  constructor(
    private storyRepo: StoryRepository,
    private mediaService: MediaService,
    private notificationService: NotificationService,
    private eventBus: EventBus,
    private cacheService: CacheService,
    private analyticsService: AnalyticsService,
    private jobQueue: JobQueue
  ) {}

  /**
   * Schedule expiration for a newly created story
   */
  async scheduleExpiration(story: Story): Promise<void> {
    const job: StoryExpirationJob = {
      storyId: story.id,
      expiresAt: story.expiresAt,
    };

    await this.jobQueue.schedule(job);

    await this.eventBus.publish('story.expiration.scheduled', {
      storyId: story.id,
      userId: story.userId,
      expiresAt: story.expiresAt,
    });
  }

  /**
   * Process story expiration when the time comes
   */
  async processExpiration(storyId: string): Promise<void> {
    const story = await this.storyRepo.findById(storyId);

    if (!story) {
      console.warn(`Story ${storyId} not found for expiration`);
      return;
    }

    // Check if already expired
    if (story.isExpired) {
      return;
    }

    // Mark as expired
    await this.storyRepo.markAsExpired(storyId);

    // Invalidate caches
    await this.cacheService.invalidate(`stories:user:${story.userId}`);
    await this.cacheService.invalidate(`stories:feed:*`);

    // Track analytics
    await this.analyticsService.trackStoryExpiration(story);

    // Notify user (optional - for story insights)
    await this.notificationService.notifyStoryExpired(story.userId, storyId);

    // Publish expiration event
    await this.eventBus.publish('story.expired', {
      storyId: story.id,
      userId: story.userId,
      viewCount: story.viewCount,
      createdAt: story.createdAt,
      expiredAt: new Date(),
    });

    // Schedule cleanup (delete media after delay)
    await this.scheduleCleanup(story);
  }

  /**
   * Clean up expired stories (delete media files)
   */
  private async scheduleCleanup(story: Story): Promise<void> {
    const cleanupTime = new Date(
      story.expiresAt.getTime() + this.CLEANUP_DELAY_MS
    );

    await this.jobQueue.schedule({
      storyId: story.id,
      expiresAt: cleanupTime,
    });
  }

  /**
   * Perform actual cleanup - delete media files
   */
  async performCleanup(storyId: string): Promise<void> {
    const story = await this.storyRepo.findById(storyId);

    if (!story) {
      return;
    }

    // Delete media files
    try {
      await this.mediaService.deleteMedia(story.mediaUrl);
      if (story.thumbnailUrl) {
        await this.mediaService.deleteMedia(story.thumbnailUrl);
      }
    } catch (error) {
      console.error(`Failed to delete media for story ${storyId}:`, error);
    }

    // Delete story record
    await this.storyRepo.delete(storyId);

    await this.eventBus.publish('story.deleted', {
      storyId: story.id,
      userId: story.userId,
    });
  }

  /**
   * Batch process all expired stories
   * Should be run as a cron job
   */
  async processExpiredStories(): Promise<{
    processed: number;
    errors: string[];
  }> {
    const expiredStories = await this.storyRepo.findExpiredStories();
    const errors: string[] = [];
    let processed = 0;

    for (const story of expiredStories) {
      try {
        await this.processExpiration(story.id);
        processed++;
      } catch (error) {
        errors.push(`Failed to expire story ${story.id}: ${error}`);
      }
    }

    return { processed, errors };
  }

  /**
   * Check if a story is expired
   */
  isExpired(story: Story): boolean {
    return story.isExpired || new Date() > story.expiresAt;
  }

  /**
   * Get remaining time until expiration
   */
  getTimeUntilExpiration(story: Story): number {
    const now = new Date();
    const diff = story.expiresAt.getTime() - now.getTime();
    return Math.max(0, diff);
  }

  /**
   * Format remaining time for display
   */
  formatTimeRemaining(story: Story): string {
    const msRemaining = this.getTimeUntilExpiration(story);
    
    if (msRemaining === 0) {
      return 'Expired';
    }

    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  }
}

// Background job processor
export function startExpirationProcessor(
  service: StoryExpirationService,
  jobQueue: JobQueue
): void {
  jobQueue.process(async (job: StoryExpirationJob) => {
    const story = await service['storyRepo'].findById(job.storyId);
    
    if (!story) {
      return; // Story already deleted
    }

    const now = new Date();
    
    if (now >= job.expiresAt) {
      if (story.isExpired) {
        // Time for cleanup
        await service.performCleanup(job.storyId);
      } else {
        // Time for expiration
        await service.processExpiration(job.storyId);
      }
    }
  });
}

// Cron job handler for batch processing
export async function runExpirationCron(
  service: StoryExpirationService
): Promise<void> {
  console.log('Running story expiration cron job...');
  const result = await service.processExpiredStories();
  console.log(`Processed ${result.processed} expired stories`);
  if (result.errors.length > 0) {
    console.error('Errors during expiration processing:', result.errors);
  }
}

// API Handler for checking expiration
export async function checkStoryExpirationHandler(
  storyId: string,
  dependencies: {
    storyRepo: StoryRepository;
  }
): Promise<{ isExpired: boolean; timeRemaining?: number }> {
  const story = await dependencies.storyRepo.findById(storyId);
  
  if (!story) {
    throw new StoryError('Story not found', StoryErrorCode.STORY_NOT_FOUND, 404);
  }

  const service = new StoryExpirationService(
    dependencies.storyRepo,
    {} as MediaService,
    {} as NotificationService,
    {} as EventBus,
    {} as CacheService,
    {} as AnalyticsService,
    {} as JobQueue
  );

  const isExpired = service.isExpired(story);
  
  return {
    isExpired,
    timeRemaining: isExpired ? 0 : service.getTimeUntilExpiration(story),
  };
}
