/**
 * Feed SDK
 * News feed service client
 * @module shared/sdk/feed-sdk
 */

import { HttpClient } from './base-client';
import {
  PostResponse,
  StoryResponse,
  ApiResponse,
  PaginatedResult,
} from './types';

/**
 * Feed SDK configuration
 */
export interface FeedSdkConfig {
  /** Base URL for feed service */
  baseUrl: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Feed type
 */
export type FeedType = 'home' | 'friends' | 'following' | 'group' | 'page' | 'hashtag';

/**
 * Feed params
 */
export interface FeedParams {
  /** Feed type */
  type?: FeedType;
  /** Cursor for pagination */
  cursor?: string;
  /** Limit items per page */
  limit?: number;
  /** Group ID (for group feed) */
  groupId?: string;
  /** Page ID (for page feed) */
  pageId?: string;
  /** Hashtag (for hashtag feed) */
  hashtag?: string;
}

/**
 * Feed response
 */
export interface FeedResponse {
  posts: PostResponse[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Stories response
 */
export interface StoriesResponse {
  /** Stories grouped by user */
  stories: Array<{
    user: {
      id: string;
      name: string;
      avatar: string;
      hasUnviewed: boolean;
    };
    items: StoryResponse[];
  }>;
}

/**
 * Feed SDK client
 */
export class FeedSdk {
  private client: HttpClient;

  constructor(config: FeedSdkConfig) {
    this.client = new HttpClient({
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set access token
   */
  setAccessToken(token: string | null): void {
    this.client.setAccessToken(token);
  }

  /**
   * Get home feed
   */
  async getHomeFeed(params?: FeedParams): Promise<ApiResponse<FeedResponse>> {
    return this.client.get<FeedResponse>('/api/posts', {
      type: 'feed',
      ...params,
    });
  }

  /**
   * Get friends feed (posts from friends only)
   */
  async getFriendsFeed(params?: FeedParams): Promise<ApiResponse<FeedResponse>> {
    return this.client.get<FeedResponse>('/api/posts', {
      type: 'friends',
      ...params,
    });
  }

  /**
   * Get following feed (posts from followed users/pages)
   */
  async getFollowingFeed(params?: FeedParams): Promise<ApiResponse<FeedResponse>> {
    return this.client.get<FeedResponse>('/api/posts', {
      type: 'following',
      ...params,
    });
  }

  /**
   * Get group feed
   */
  async getGroupFeed(groupId: string, params?: FeedParams): Promise<ApiResponse<FeedResponse>> {
    return this.client.get<FeedResponse>('/api/posts', {
      type: 'group',
      groupId,
      ...params,
    });
  }

  /**
   * Get page feed
   */
  async getPageFeed(pageId: string, params?: FeedParams): Promise<ApiResponse<FeedResponse>> {
    return this.client.get<FeedResponse>('/api/posts', {
      type: 'page',
      pageId,
      ...params,
    });
  }

  /**
   * Get hashtag feed
   */
  async getHashtagFeed(hashtag: string, params?: FeedParams): Promise<ApiResponse<FeedResponse>> {
    return this.client.get<FeedResponse>('/api/posts', {
      type: 'hashtag',
      hashtag,
      ...params,
    });
  }

  /**
   * Get stories
   */
  async getStories(): Promise<ApiResponse<StoriesResponse>> {
    return this.client.get<StoriesResponse>('/api/stories');
  }

  /**
   * Create story
   */
  async createStory(data: {
    mediaType: 'image' | 'video';
    mediaUrl: string;
    caption?: string;
  }): Promise<ApiResponse<StoryResponse>> {
    return this.client.post<StoryResponse>('/api/stories', data);
  }

  /**
   * View story
   */
  async viewStory(storyId: string): Promise<ApiResponse<{ viewed: boolean }>> {
    return this.client.post<{ viewed: boolean }>(`/api/stories/${storyId}/view`);
  }

  /**
   * Delete story
   */
  async deleteStory(storyId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>(`/api/stories/${storyId}`);
  }

  /**
   * React to story
   */
  async reactToStory(
    storyId: string,
    type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care'
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(`/api/stories/${storyId}/react`, { type });
  }

  /**
   * Get reels
   */
  async getReels(params?: { cursor?: string; limit?: number }): Promise<
    ApiResponse<{
      reels: Array<{
        id: string;
        videoUrl: string;
        thumbnailUrl: string;
        caption: string;
        author: { id: string; name: string; avatar: string };
        likeCount: number;
        commentCount: number;
        viewCount: number;
        isLiked: boolean;
      }>;
      nextCursor?: string;
      hasMore: boolean;
    }>
  > {
    return this.client.get('/api/reels', params);
  }

  /**
   * Get suggested posts
   */
  async getSuggestedPosts(limit?: number): Promise<ApiResponse<PostResponse[]>> {
    return this.client.get<PostResponse[]>('/api/posts/suggested', { limit: limit || 5 });
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(limit?: number): Promise<ApiResponse<PostResponse[]>> {
    return this.client.get<PostResponse[]>('/api/posts/trending', { limit: limit || 10 });
  }

  /**
   * Get memories
   */
  async getMemories(): Promise<
    ApiResponse<
      Array<{
        date: string;
        posts: PostResponse[];
      }>
    >
  > {
    return this.client.get('/api/memories');
  }

  /**
   * Hide post from feed
   */
  async hidePost(postId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(`/api/feed/hide`, { postId });
  }

  /**
   * See fewer posts like this
   */
  async seeFewerLikeThis(postId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(`/api/feed/preferences`, {
      action: 'see_fewer',
      postId,
    });
  }

  /**
   * Snooze user posts
   */
  async snoozeUser(userId: string, duration: number): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(`/api/feed/preferences`, {
      action: 'snooze',
      userId,
      duration,
    });
  }

  /**
   * Report feed issue
   */
  async reportFeedIssue(data: {
    postId: string;
    reason: string;
    details?: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>('/api/feed/report', data);
  }
}

/**
 * Create Feed SDK instance
 */
export function createFeedSdk(config: FeedSdkConfig): FeedSdk {
  return new FeedSdk(config);
}

/**
 * Default Feed SDK instance
 */
export const feedSdk = createFeedSdk({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
});

export default {
  FeedSdk,
  createFeedSdk,
  feedSdk,
};
