/**
 * Feed Ranking Service
 * ML-based ranking for personalized feed
 */

export interface RankingFactors {
  // Time decay
  timeDecay: number; // 0-1, newer posts score higher
  
  // Engagement
  engagementRate: number; // Combined likes, comments, shares
  
  // Relationship
  relationshipScore: number; // 0-1, how close user is to author
  
  // Content type
  contentTypeBonus: number; // Photos/videos get bonus
  
  // Author influence
  authorInfluence: number; // Verified users, active users
  
  // Diversity
  diversityScore: number; // Ensures variety in feed
  
  // Personalization
  personalizationScore: number; // User's interests
}

export interface RankingWeights {
  timeDecay: number;
  engagementRate: number;
  relationshipScore: number;
  contentTypeBonus: number;
  authorInfluence: number;
  diversityScore: number;
  personalizationScore: number;
}

// Default weights
export const DEFAULT_WEIGHTS: RankingWeights = {
  timeDecay: 0.25,
  engagementRate: 0.25,
  relationshipScore: 0.30,
  contentTypeBonus: 0.10,
  authorInfluence: 0.10,
  diversityScore: 0.0,
  personalizationScore: 0.0,
};

export class FeedRankingService {
  private weights: RankingWeights;

  constructor(weights: Partial<RankingWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Calculate post score
   */
  async calculatePostScore(
    postId: string,
    userId: string,
    context: {
      createdAt: Date;
      authorId: string;
      mediaType?: string;
      likeCount: number;
      commentCount: number;
      shareCount: number;
      viewCount?: number;
    }
  ): Promise<number> {
    const factors = await this.calculateFactors(postId, userId, context);
    
    return (
      factors.timeDecay * this.weights.timeDecay +
      factors.engagementRate * this.weights.engagementRate +
      factors.relationshipScore * this.weights.relationshipScore +
      factors.contentTypeBonus * this.weights.contentTypeBonus +
      factors.authorInfluence * this.weights.authorInfluence +
      factors.diversityScore * this.weights.diversityScore +
      factors.personalizationScore * this.weights.personalizationScore
    );
  }

  /**
   * Rank posts
   */
  async rankPosts(
    posts: Array<{ postId: string; authorId: string; createdAt: Date; [key: string]: unknown }>,
    userId: string,
    options?: {
      diversityEnabled?: boolean;
      personalizationEnabled?: boolean;
    }
  ): Promise<Array<{ postId: string; score: number; reasons: string[] }>> {
    const scoredPosts = await Promise.all(
      posts.map(async (post) => {
        const score = await this.calculatePostScore(post.postId, userId, {
          createdAt: post.createdAt,
          authorId: post.authorId,
          likeCount: (post.likeCount as number) || 0,
          commentCount: (post.commentCount as number) || 0,
          shareCount: (post.shareCount as number) || 0,
          mediaType: post.mediaType as string,
        });
        return { postId: post.postId, score, reasons: [] };
      })
    );

    // Sort by score descending
    return scoredPosts.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate ranking factors
   */
  private async calculateFactors(
    postId: string,
    userId: string,
    context: {
      createdAt: Date;
      authorId: string;
      mediaType?: string;
      likeCount: number;
      commentCount: number;
      shareCount: number;
      viewCount?: number;
    }
  ): Promise<RankingFactors> {
    return {
      timeDecay: this.calculateTimeDecay(context.createdAt),
      engagementRate: this.calculateEngagementRate(context),
      relationshipScore: await this.calculateRelationshipScore(userId, context.authorId),
      contentTypeBonus: this.calculateContentTypeBonus(context.mediaType),
      authorInfluence: await this.calculateAuthorInfluence(context.authorId),
      diversityScore: 1, // Set during ranking
      personalizationScore: await this.calculatePersonalizationScore(userId, postId),
    };
  }

  /**
   * Time decay calculation
   */
  private calculateTimeDecay(createdAt: Date): number {
    const now = new Date();
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const halfLife = 24; // 24 hours
    return Math.pow(0.5, ageInHours / halfLife);
  }

  /**
   * Engagement rate calculation
   */
  private calculateEngagementRate(context: {
    likeCount: number;
    commentCount: number;
    shareCount: number;
    viewCount?: number;
  }): number {
    const views = context.viewCount || 100; // Default assumption
    const totalEngagement = 
      context.likeCount + 
      (context.commentCount * 2) + 
      (context.shareCount * 3);
    return Math.min(1, totalEngagement / views);
  }

  /**
   * Relationship score calculation
   */
  private async calculateRelationshipScore(userId: string, authorId: string): Promise<number> {
    if (userId === authorId) return 1.0;
    
    // Would check:
    // - Are they friends?
    // - Are they following?
    // - Interaction history (likes, comments)
    // - Tagging history
    
    throw new Error('Implement with social graph service');
  }

  /**
   * Content type bonus
   */
  private calculateContentTypeBonus(mediaType?: string): number {
    switch (mediaType) {
      case 'video': return 0.3;
      case 'image': return 0.2;
      default: return 0;
    }
  }

  /**
   * Author influence calculation
   */
  private async calculateAuthorInfluence(authorId: string): Promise<number> {
    // Would check:
    // - Follower count
    // - Verification status
    // - Activity level
    // - Content quality score
    
    throw new Error('Implement with user service');
  }

  /**
   * Personalization score
   */
  private async calculatePersonalizationScore(userId: string, postId: string): Promise<number> {
    // Would check:
    // - User's interests vs post topics
    // - Historical engagement with similar content
    // - Time of day preferences
    
    throw new Error('Implement with ML service');
  }

  /**
   * Update weights based on user feedback
   */
  async updateWeightsFromFeedback(
    userId: string,
    postId: string,
    feedback: 'positive' | 'negative' | 'hide'
  ): Promise<void> {
    // Machine learning to adjust weights per user
    throw new Error('Implement with ML pipeline');
  }

  /**
   * Get explainability for ranking
   */
  async explainRanking(postId: string, userId: string): Promise<{
    score: number;
    factors: RankingFactors;
    topReasons: string[];
  }> {
    throw new Error('Implement with ranking explanation');
  }
}

export const feedRankingService = new FeedRankingService();
