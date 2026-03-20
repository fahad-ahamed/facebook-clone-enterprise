// Reel Creation Module

import { v4 as uuidv4 } from 'uuid';
import {
  Reel,
  CreateReelRequest,
  ReelSettings,
  ReelError,
  ReelErrorCode,
  REEL_CONSTANTS,
} from './types';

interface ReelRepository {
  create(reel: Reel): Promise<Reel>;
  findById(reelId: string): Promise<Reel | null>;
  countTodayReels(userId: string): Promise<number>;
}

interface VideoService {
  validateVideo(url: string): Promise<{
    isValid: boolean;
    duration: number;
    resolution: { width: number; height: number };
    format: string;
  }>;
  generateThumbnail(videoUrl: string, time?: number): Promise<string>;
  transcodeForReels(videoUrl: string): Promise<string>;
}

interface AudioService {
  validateAudio(audioId: string): Promise<boolean>;
  checkCopyright(audioId: string, userId: string): Promise<{
    allowed: boolean;
    restrictions?: string[];
  }>;
}

interface ContentModerationService {
  checkContent(content: string, mediaUrl: string): Promise<{
    approved: boolean;
    flags?: string[];
    severity?: 'low' | 'medium' | 'high';
  }>;
}

interface CacheService {
  invalidate(pattern: string): Promise<void>;
}

interface EventBus {
  publish(event: string, data: unknown): Promise<void>;
}

const DEFAULT_SETTINGS: ReelSettings = {
  allowComments: true,
  allowDuets: true,
  allowRemix: true,
  allowStitch: true,
  hideViewCount: false,
  hideLikeCount: false,
  restrictDownloading: false,
};

export class CreateReelUseCase {
  constructor(
    private reelRepo: ReelRepository,
    private videoService: VideoService,
    private audioService: AudioService,
    private moderationService: ContentModerationService,
    private cacheService: CacheService,
    private eventBus: EventBus
  ) {}

  async execute(request: CreateReelRequest): Promise<Reel> {
    // Validate rate limits
    await this.validateRateLimit(request.userId);

    // Validate video
    const videoInfo = await this.validateVideo(request.videoUrl);

    // Generate thumbnail if not provided
    const thumbnailUrl = request.thumbnailUrl || 
      await this.videoService.generateThumbnail(request.videoUrl, 1);

    // Validate audio if provided
    if (request.audio) {
      await this.validateAudio(request.audio, request.userId);
    }

    // Content moderation
    await this.moderateContent(request);

    // Extract hashtags from caption
    const captionHashtags = this.extractHashtags(request.caption);
    const hashtags = [...new Set([...(request.hashtags || []), ...captionHashtags])];

    const now = new Date();
    const reel: Reel = {
      id: uuidv4(),
      userId: request.userId,
      videoUrl: request.videoUrl,
      thumbnailUrl,
      caption: request.caption?.slice(0, REEL_CONSTANTS.MAX_CAPTION_LENGTH),
      duration: videoInfo.duration,
      audio: request.audio,
      mentions: request.mentions?.slice(0, REEL_CONSTANTS.MAX_MENTIONS),
      hashtags: hashtags.slice(0, REEL_CONSTANTS.MAX_HASHTAGS),
      location: request.location,
      visibility: request.visibility || 'public',
      createdAt: now,
      updatedAt: now,
      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: 0,
      },
      settings: {
        ...DEFAULT_SETTINGS,
        ...request.settings,
      },
    };

    const createdReel = await this.reelRepo.create(reel);

    // Invalidate caches
    await this.cacheService.invalidate(`reels:user:${request.userId}`);
    await this.cacheService.invalidate(`reels:feed:*`);

    // Publish events
    await this.eventBus.publish('reel.created', {
      reelId: createdReel.id,
      userId: createdReel.userId,
      duration: createdReel.duration,
      hasAudio: !!createdReel.audio,
      createdAt: createdReel.createdAt,
    });

    // If audio used, track usage
    if (createdReel.audio) {
      await this.eventBus.publish('audio.used', {
        audioId: createdReel.audio.id,
        reelId: createdReel.id,
        userId: createdReel.userId,
      });
    }

    return createdReel;
  }

  private async validateRateLimit(userId: string): Promise<void> {
    const todayReels = await this.reelRepo.countTodayReels(userId);
    if (todayReels >= REEL_CONSTANTS.MAX_REELS_PER_DAY) {
      throw new ReelError(
        `Daily reel limit exceeded (${REEL_CONSTANTS.MAX_REELS_PER_DAY})`,
        ReelErrorCode.RATE_LIMIT_EXCEEDED,
        429
      );
    }
  }

  private async validateVideo(videoUrl: string): Promise<{
    isValid: boolean;
    duration: number;
    resolution: { width: number; height: number };
    format: string;
  }> {
    const videoInfo = await this.videoService.validateVideo(videoUrl);

    if (!videoInfo.isValid) {
      throw new ReelError('Invalid video format', ReelErrorCode.INVALID_VIDEO, 400);
    }

    if (videoInfo.duration < REEL_CONSTANTS.MIN_DURATION_SECONDS) {
      throw new ReelError(
        `Video must be at least ${REEL_CONSTANTS.MIN_DURATION_SECONDS} seconds`,
        ReelErrorCode.VIDEO_TOO_SHORT,
        400
      );
    }

    if (videoInfo.duration > REEL_CONSTANTS.MAX_DURATION_SECONDS) {
      throw new ReelError(
        `Video must not exceed ${REEL_CONSTANTS.MAX_DURATION_SECONDS} seconds`,
        ReelErrorCode.VIDEO_TOO_LONG,
        400
      );
    }

    return videoInfo;
  }

  private async validateAudio(
    audio: { id: string; source: string },
    userId: string
  ): Promise<void> {
    const isValid = await this.audioService.validateAudio(audio.id);
    if (!isValid) {
      throw new ReelError('Audio track not found', ReelErrorCode.AUDIO_NOT_FOUND, 404);
    }

    // Check copyright restrictions
    const copyrightCheck = await this.audioService.checkCopyright(audio.id, userId);
    if (!copyrightCheck.allowed) {
      throw new ReelError(
        `Audio has copyright restrictions: ${copyrightCheck.restrictions?.join(', ')}`,
        ReelErrorCode.AUDIO_COPYRIGHT,
        403
      );
    }
  }

  private async moderateContent(request: CreateReelRequest): Promise<void> {
    const moderationResult = await this.moderationService.checkContent(
      request.caption || '',
      request.videoUrl
    );

    if (!moderationResult.approved) {
      throw new ReelError(
        `Content flagged: ${moderationResult.flags?.join(', ')}`,
        ReelErrorCode.CONTENT_VIOLATION,
        moderationResult.severity === 'high' ? 403 : 400
      );
    }
  }

  private extractHashtags(caption?: string): string[] {
    if (!caption) return [];
    const hashtagRegex = /#[\w]+/g;
    const matches = caption.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  }
}

// Duet/Remix/Stitch creation
export class CreateReelDerivativeUseCase {
  constructor(
    private reelRepo: ReelRepository,
    private videoService: VideoService,
    private eventBus: EventBus
  ) {}

  async createDuet(
    originalReelId: string,
    userId: string,
    newVideoUrl: string,
    layout: 'side-by-side' | 'top-bottom' | 'reaction'
  ): Promise<Reel> {
    const originalReel = await this.reelRepo.findById(originalReelId);
    if (!originalReel) {
      throw new ReelError('Original reel not found', ReelErrorCode.REEL_NOT_FOUND, 404);
    }

    if (!originalReel.settings.allowDuets) {
      throw new ReelError('Duets are disabled for this reel', ReelErrorCode.DUET_DISABLED, 403);
    }

    // Create duet video
    const combinedVideoUrl = await this.videoService.combineVideos(
      originalReel.videoUrl,
      newVideoUrl,
      layout
    );

    const duetReel: Reel = {
      id: uuidv4(),
      userId,
      videoUrl: combinedVideoUrl,
      thumbnailUrl: await this.videoService.generateThumbnail(combinedVideoUrl),
      duration: originalReel.duration,
      audio: originalReel.audio,
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: 0,
      },
      settings: {
        allowComments: true,
        allowDuets: true,
        allowRemix: true,
        allowStitch: true,
        hideViewCount: false,
        hideLikeCount: false,
        restrictDownloading: false,
      },
    };

    const created = await this.reelRepo.create(duetReel);

    await this.eventBus.publish('reel.duet_created', {
      originalReelId,
      newReelId: created.id,
      userId,
    });

    return created;
  }

  async createStitch(
    originalReelId: string,
    userId: string,
    newVideoUrl: string,
    originalClipStart: number,
    originalClipDuration: number
  ): Promise<Reel> {
    const originalReel = await this.reelRepo.findById(originalReelId);
    if (!originalReel) {
      throw new ReelError('Original reel not found', ReelErrorCode.REEL_NOT_FOUND, 404);
    }

    if (!originalReel.settings.allowStitch) {
      throw new ReelError('Stitch is disabled for this reel', ReelErrorCode.REEL_DISABLED, 403);
    }

    // Create stitch video
    const combinedVideoUrl = await this.videoService.stitchVideos(
      originalReel.videoUrl,
      newVideoUrl,
      originalClipStart,
      originalClipDuration
    );

    const stitchReel: Reel = {
      id: uuidv4(),
      userId,
      videoUrl: combinedVideoUrl,
      thumbnailUrl: await this.videoService.generateThumbnail(combinedVideoUrl),
      duration: originalClipDuration + (await this.videoService.validateVideo(newVideoUrl)).duration,
      audio: originalReel.audio,
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        engagementRate: 0,
      },
      settings: {
        allowComments: true,
        allowDuets: true,
        allowRemix: true,
        allowStitch: true,
        hideViewCount: false,
        hideLikeCount: false,
        restrictDownloading: false,
      },
    };

    const created = await this.reelRepo.create(stitchReel);

    await this.eventBus.publish('reel.stitch_created', {
      originalReelId,
      newReelId: created.id,
      userId,
    });

    return created;
  }
}

// API Handler
export async function createReelHandler(
  request: CreateReelRequest,
  dependencies: {
    reelRepo: ReelRepository;
    videoService: VideoService;
    audioService: AudioService;
    moderationService: ContentModerationService;
    cacheService: CacheService;
    eventBus: EventBus;
  }
): Promise<Reel> {
  const useCase = new CreateReelUseCase(
    dependencies.reelRepo,
    dependencies.videoService,
    dependencies.audioService,
    dependencies.moderationService,
    dependencies.cacheService,
    dependencies.eventBus
  );
  return useCase.execute(request);
}
