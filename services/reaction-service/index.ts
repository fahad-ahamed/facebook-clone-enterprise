/**
 * Reaction Service
 * Manages reactions (like, love, haha, wow, sad, angry, care) on content
 */

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care';

export interface Reaction {
  id: string;
  userId: string;
  type: ReactionType;
  
  // Polymorphic - can react to different content types
  postId?: string;
  commentId?: string;
  storyId?: string;
  reelId?: string;
  
  createdAt: Date;
}

export interface ReactionSummary {
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
  care: number;
  total: number;
}

export interface ReactionUsers {
  type: ReactionType;
  users: { id: string; name: string; avatar?: string }[];
}

export class ReactionService {
  /**
   * Add or update reaction
   */
  async react(
    userId: string,
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetId: string,
    type: ReactionType
  ): Promise<Reaction> {
    throw new Error('Implement with database');
  }

  /**
   * Remove reaction
   */
  async removeReaction(
    userId: string,
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetId: string
  ): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get user's reaction
   */
  async getUserReaction(
    userId: string,
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetId: string
  ): Promise<ReactionType | null> {
    throw new Error('Implement with database');
  }

  /**
   * Get reaction summary for content
   */
  async getReactionSummary(
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetId: string
  ): Promise<ReactionSummary> {
    throw new Error('Implement with database');
  }

  /**
   * Get users who reacted with specific type
   */
  async getReactionUsers(
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetId: string,
    type?: ReactionType,
    options?: { limit?: number; offset?: number }
  ): Promise<ReactionUsers[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get total reaction count
   */
  async getReactionCount(
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetId: string
  ): Promise<number> {
    throw new Error('Implement with database');
  }

  /**
   * Batch get reactions for multiple posts
   */
  async batchGetUserReactions(
    userId: string,
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetIds: string[]
  ): Promise<Map<string, ReactionType | null>> {
    throw new Error('Implement with database');
  }

  /**
   * Batch get reaction summaries
   */
  async batchGetReactionSummaries(
    targetType: 'post' | 'comment' | 'story' | 'reel',
    targetIds: string[]
  ): Promise<Map<string, ReactionSummary>> {
    throw new Error('Implement with database');
  }

  /**
   * Get user's reaction history
   */
  async getUserReactionHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ reaction: Reaction; content: { type: string; id: string } }[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get top reactions (trending content)
   */
  async getTopReactedContent(
    targetType: 'post' | 'comment' | 'story' | 'reel',
    timeRange: 'day' | 'week' | 'month',
    limit: number = 10
  ): Promise<{ id: string; reactionCount: number }[]> {
    throw new Error('Implement with database');
  }
}

export const reactionService = new ReactionService();
