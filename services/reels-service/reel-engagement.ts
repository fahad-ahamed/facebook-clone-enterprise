// Reel Engagement Module - Likes, Comments, Shares

import { v4 as uuidv4 } from 'uuid';
import {
  Reel,
  ReelComment,
  ReelLike,
  ReelShare,
  EngagementAction,
  ReelError,
  ReelErrorCode,
  REEL_CONSTANTS,
} from './types';

interface ReelRepository {
  findById(reelId: string): Promise<Reel | null>;
  incrementMetric(reelId: string, metric: keyof Reel['metrics'], delta: number): Promise<void>;
  updateEngagementRate(reelId: string, rate: number): Promise<void>;
}

interface LikeRepository {
  create(like: ReelLike): Promise<ReelLike>;
  delete(reelId: string, userId: string): Promise<void>;
  findByReel(reelId: string, limit: number, offset: number): Promise<ReelLike[]>;
  countByReel(reelId: string): Promise<number>;
  hasUserLiked(reelId: string, userId: string): Promise<boolean>;
}

interface CommentRepository {
  create(comment: ReelComment): Promise<ReelComment>;
  findById(commentId: string): Promise<ReelComment | null>;
  findByReel(reelId: string, limit: number, offset: number): Promise<ReelComment[]>;
  countByReel(reelId: string): Promise<number>;
  delete(commentId: string): Promise<void>;
  like(commentId: string): Promise<void>;
  unlike(commentId: string): Promise<void>;
}

interface ShareRepository {
  create(share: ReelShare): Promise<ReelShare>;
  countByReel(reelId: string): Promise<number>;
}

interface SaveRepository {
  create(reelId: string, userId: string): Promise<void>;
  delete(reelId: string, userId: string): Promise<void>;
  hasUserSaved(reelId: string, userId: string): Promise<boolean>;
  getUserSaves(userId: string, limit: number, offset: number): Promise<string[]>;
}

interface UserRepository {
  findByIds(userIds: string[]): Promise<{
    id: string;
    name: string;
    avatar: string;
  }[]>;
}

interface NotificationService {
  notifyLike(recipientId: string, likerId: string, reelId: string): Promise<void>;
  notifyComment(recipientId: string, commenterId: string, reelId: string, commentId: string): Promise<void>;
  notifyShare(recipientId: string, sharerId: string, reelId: string): Promise<void>;
}

interface AnalyticsService {
  trackEngagement(action: EngagementAction): Promise<void>;
}

interface CacheService {
  invalidate(pattern: string): Promise<void>;
}

interface EventBus {
  publish(event: string, data: unknown): Promise<void>;
}

export interface CommentWithAuthor extends ReelComment {
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  replies?: CommentWithAuthor[];
}

export class ReelEngagementService {
  constructor(
    private reelRepo: ReelRepository,
    private likeRepo: LikeRepository,
    private commentRepo: CommentRepository,
    private shareRepo: ShareRepository,
    private saveRepo: SaveRepository,
    private userRepo: UserRepository,
    private notificationService: NotificationService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
    private eventBus: EventBus
  ) {}

  // Like Operations
  async likeReel(reelId: string, userId: string): Promise<ReelLike> {
    const reel = await this.getValidatedReel(reelId);

    // Check if already liked
    const alreadyLiked = await this.likeRepo.hasUserLiked(reelId, userId);
    if (alreadyLiked) {
      throw new ReelError('Already liked this reel', ReelErrorCode.ALREADY_LIKED, 400);
    }

    const like: ReelLike = {
      id: uuidv4(),
      reelId,
      userId,
      createdAt: new Date(),
    };

    await this.likeRepo.create(like);
    await this.reelRepo.incrementMetric(reelId, 'likes', 1);
    await this.updateEngagementRate(reelId);

    // Invalidate cache
    await this.cacheService.invalidate(`reel:${reelId}`);

    // Publish event
    await this.eventBus.publish('reel.liked', {
      reelId,
      userId,
      reelOwnerId: reel.userId,
    });

    // Notify reel owner
    if (reel.userId !== userId) {
      await this.notificationService.notifyLike(reel.userId, userId, reelId);
    }

    // Track analytics
    await this.analyticsService.trackEngagement({
      type: 'like',
      reelId,
      userId,
    });

    return like;
  }

  async unlikeReel(reelId: string, userId: string): Promise<void> {
    const hasLiked = await this.likeRepo.hasUserLiked(reelId, userId);
    if (!hasLiked) {
      throw new ReelError('Havent liked this reel', ReelErrorCode.NOT_LIKED, 400);
    }

    await this.likeRepo.delete(reelId, userId);
    await this.reelRepo.incrementMetric(reelId, 'likes', -1);
    await this.updateEngagementRate(reelId);

    await this.cacheService.invalidate(`reel:${reelId}`);

    await this.eventBus.publish('reel.unliked', { reelId, userId });
  }

  async getReelLikes(
    reelId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ likes: (ReelLike & { user: { id: string; name: string; avatar: string } })[]; total: number }> {
    const likes = await this.likeRepo.findByReel(reelId, limit, offset);
    const total = await this.likeRepo.countByReel(reelId);

    const userIds = likes.map(l => l.userId);
    const users = await this.userRepo.findByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    const likesWithUsers = likes.map(like => ({
      ...like,
      user: userMap.get(like.userId) || { id: like.userId, name: 'Unknown', avatar: '' },
    }));

    return { likes: likesWithUsers, total };
  }

  // Comment Operations
  async addComment(
    reelId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<ReelComment> {
    const reel = await this.getValidatedReel(reelId);

    if (!reel.settings.allowComments) {
      throw new ReelError('Comments are disabled for this reel', ReelErrorCode.COMMENT_DISABLED, 403);
    }

    // Validate parent comment if replying
    if (parentId) {
      const parentComment = await this.commentRepo.findById(parentId);
      if (!parentComment || parentComment.reelId !== reelId) {
        throw new ReelError('Parent comment not found', ReelErrorCode.COMMENT_NOT_FOUND, 404);
      }
    }

    const comment: ReelComment = {
      id: uuidv4(),
      reelId,
      userId,
      parentId,
      content: content.slice(0, 2200), // Max comment length
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
    };

    const created = await this.commentRepo.create(comment);
    await this.reelRepo.incrementMetric(reelId, 'comments', 1);
    await this.updateEngagementRate(reelId);

    await this.cacheService.invalidate(`reel:${reelId}:comments`);

    await this.eventBus.publish('reel.commented', {
      commentId: created.id,
      reelId,
      userId,
      parentId,
    });

    // Notify
    if (reel.userId !== userId) {
      await this.notificationService.notifyComment(reel.userId, userId, reelId, created.id);
    }

    await this.analyticsService.trackEngagement({
      type: 'comment',
      reelId,
      userId,
      data: { commentId: created.id, content: content.slice(0, 100) },
    });

    return created;
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) {
      throw new ReelError('Comment not found', ReelErrorCode.COMMENT_NOT_FOUND, 404);
    }

    // Check if user owns the comment or the reel
    const reel = await this.reelRepo.findById(comment.reelId);
    const isCommentOwner = comment.userId === userId;
    const isReelOwner = reel?.userId === userId;

    if (!isCommentOwner && !isReelOwner) {
      throw new ReelError('Unauthorized to delete this comment', ReelErrorCode.UNAUTHORIZED_ACCESS, 403);
    }

    await this.commentRepo.delete(commentId);
    await this.reelRepo.incrementMetric(comment.reelId, 'comments', -1);
    await this.updateEngagementRate(comment.reelId);

    await this.cacheService.invalidate(`reel:${comment.reelId}:comments`);
  }

  async getComments(
    reelId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ comments: CommentWithAuthor[]; total: number }> {
    const comments = await this.commentRepo.findByReel(reelId, limit, offset);
    const total = await this.commentRepo.countByReel(reelId);

    const userIds = [...new Set(comments.map(c => c.userId))];
    const users = await this.userRepo.findByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    // Build nested structure for replies
    const commentMap = new Map<string, CommentWithAuthor>();
    const rootComments: CommentWithAuthor[] = [];

    const commentsWithAuthors: CommentWithAuthor[] = comments.map(comment => ({
      ...comment,
      author: userMap.get(comment.userId) || { id: comment.userId, name: 'Unknown', avatar: '' },
    }));

    for (const comment of commentsWithAuthors) {
      commentMap.set(comment.id, comment);
      if (!comment.parentId) {
        rootComments.push(comment);
      }
    }

    // Attach replies to their parents
    for (const comment of commentsWithAuthors) {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(comment);
        }
      }
    }

    return { comments: rootComments, total };
  }

  async likeComment(commentId: string): Promise<void> {
    await this.commentRepo.like(commentId);
  }

  // Share Operations
  async shareReel(
    reelId: string,
    userId: string,
    shareType: 'direct' | 'story' | 'external',
    sharedTo?: string
  ): Promise<ReelShare> {
    const reel = await this.getValidatedReel(reelId);

    const share: ReelShare = {
      id: uuidv4(),
      reelId,
      userId,
      shareType,
      sharedTo,
      createdAt: new Date(),
    };

    await this.shareRepo.create(share);
    await this.reelRepo.incrementMetric(reelId, 'shares', 1);
    await this.updateEngagementRate(reelId);

    await this.eventBus.publish('reel.shared', {
      shareId: share.id,
      reelId,
      userId,
      shareType,
    });

    if (reel.userId !== userId) {
      await this.notificationService.notifyShare(reel.userId, userId, reelId);
    }

    await this.analyticsService.trackEngagement({
      type: 'share',
      reelId,
      userId,
      data: { shareType, sharedTo },
    });

    return share;
  }

  // Save Operations
  async saveReel(reelId: string, userId: string): Promise<void> {
    await this.getValidatedReel(reelId);

    const alreadySaved = await this.saveRepo.hasUserSaved(reelId, userId);
    if (alreadySaved) {
      throw new ReelError('Already saved this reel', ReelErrorCode.ALREADY_SAVED, 400);
    }

    await this.saveRepo.create(reelId, userId);
    await this.reelRepo.incrementMetric(reelId, 'saves', 1);
    await this.updateEngagementRate(reelId);

    await this.eventBus.publish('reel.saved', { reelId, userId });

    await this.analyticsService.trackEngagement({
      type: 'save',
      reelId,
      userId,
    });
  }

  async unsaveReel(reelId: string, userId: string): Promise<void> {
    const hasSaved = await this.saveRepo.hasUserSaved(reelId, userId);
    if (!hasSaved) {
      throw new ReelError('Havent saved this reel', ReelErrorCode.NOT_SAVED, 400);
    }

    await this.saveRepo.delete(reelId, userId);
    await this.reelRepo.incrementMetric(reelId, 'saves', -1);
    await this.updateEngagementRate(reelId);

    await this.eventBus.publish('reel.unsaved', { reelId, userId });
  }

  async getSavedReels(userId: string, limit: number = 20, offset: number = 0): Promise<string[]> {
    return this.saveRepo.getUserSaves(userId, limit, offset);
  }

  // Helper methods
  private async getValidatedReel(reelId: string): Promise<Reel> {
    const reel = await this.reelRepo.findById(reelId);
    if (!reel) {
      throw new ReelError('Reel not found', ReelErrorCode.REEL_NOT_FOUND, 404);
    }
    return reel;
  }

  private async updateEngagementRate(reelId: string): Promise<void> {
    const reel = await this.reelRepo.findById(reelId);
    if (!reel) return;

    const totalEngagements = 
      reel.metrics.likes + 
      reel.metrics.comments + 
      reel.metrics.shares + 
      reel.metrics.saves;
    
    const engagementRate = reel.metrics.views > 0 
      ? totalEngagements / reel.metrics.views 
      : 0;

    await this.reelRepo.updateEngagementRate(reelId, engagementRate);
  }
}

// API Handlers
export async function likeReelHandler(
  reelId: string,
  userId: string,
  dependencies: {
    reelRepo: ReelRepository;
    likeRepo: LikeRepository;
    commentRepo: CommentRepository;
    shareRepo: ShareRepository;
    saveRepo: SaveRepository;
    userRepo: UserRepository;
    notificationService: NotificationService;
    analyticsService: AnalyticsService;
    cacheService: CacheService;
    eventBus: EventBus;
  }
): Promise<ReelLike> {
  const service = new ReelEngagementService(
    dependencies.reelRepo,
    dependencies.likeRepo,
    dependencies.commentRepo,
    dependencies.shareRepo,
    dependencies.saveRepo,
    dependencies.userRepo,
    dependencies.notificationService,
    dependencies.analyticsService,
    dependencies.cacheService,
    dependencies.eventBus
  );
  return service.likeReel(reelId, userId);
}

export async function commentHandler(
  reelId: string,
  userId: string,
  content: string,
  parentId: string | undefined,
  dependencies: {
    reelRepo: ReelRepository;
    likeRepo: LikeRepository;
    commentRepo: CommentRepository;
    shareRepo: ShareRepository;
    saveRepo: SaveRepository;
    userRepo: UserRepository;
    notificationService: NotificationService;
    analyticsService: AnalyticsService;
    cacheService: CacheService;
    eventBus: EventBus;
  }
): Promise<ReelComment> {
  const service = new ReelEngagementService(
    dependencies.reelRepo,
    dependencies.likeRepo,
    dependencies.commentRepo,
    dependencies.shareRepo,
    dependencies.saveRepo,
    dependencies.userRepo,
    dependencies.notificationService,
    dependencies.analyticsService,
    dependencies.cacheService,
    dependencies.eventBus
  );
  return service.addComment(reelId, userId, content, parentId);
}
