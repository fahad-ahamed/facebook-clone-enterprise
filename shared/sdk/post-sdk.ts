/**
 * Post SDK
 * Post management service client
 * @module shared/sdk/post-sdk
 */

import { HttpClient } from './base-client';
import {
  PostResponse,
  CommentResponse,
  ReactionResponse,
  ApiResponse,
  PaginatedResult,
  PaginationParams,
} from './types';

/**
 * Post SDK configuration
 */
export interface PostSdkConfig {
  /** Base URL for post service */
  baseUrl: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Create post data
 */
export interface CreatePostData {
  content?: string;
  mediaType?: 'image' | 'video' | 'gif';
  mediaUrl?: string;
  mediaUrls?: string[];
  postType?: 'status' | 'photo' | 'video' | 'link' | 'check_in';
  visibility?: 'public' | 'friends' | 'only_me' | 'specific_friends' | 'friends_except';
  feeling?: { emoji: string; text: string };
  location?: string;
  customVisibilityUsers?: string[];
}

/**
 * Update post data
 */
export interface UpdatePostData {
  content?: string;
  visibility?: 'public' | 'friends' | 'only_me' | 'specific_friends' | 'friends_except';
  customVisibilityUsers?: string[];
}

/**
 * Create comment data
 */
export interface CreateCommentData {
  content: string;
  mediaUrl?: string;
  parentId?: string;
}

/**
 * Post SDK client
 */
export class PostSdk {
  private client: HttpClient;

  constructor(config: PostSdkConfig) {
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
   * Get post by ID
   */
  async getPost(postId: string): Promise<ApiResponse<PostResponse>> {
    return this.client.get<PostResponse>(`/api/posts/${postId}`);
  }

  /**
   * Get posts by user ID
   */
  async getUserPosts(
    userId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<PostResponse>>> {
    return this.client.get<PaginatedResult<PostResponse>>('/api/posts', {
      userId,
      ...params,
    });
  }

  /**
   * Create new post
   */
  async createPost(data: CreatePostData): Promise<ApiResponse<PostResponse>> {
    return this.client.post<PostResponse>('/api/posts', data);
  }

  /**
   * Update post
   */
  async updatePost(postId: string, data: UpdatePostData): Promise<ApiResponse<PostResponse>> {
    return this.client.put<PostResponse>(`/api/posts/${postId}`, data);
  }

  /**
   * Delete post
   */
  async deletePost(postId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>(`/api/posts/${postId}`);
  }

  /**
   * React to post
   */
  async reactToPost(
    postId: string,
    type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care'
  ): Promise<ApiResponse<ReactionResponse>> {
    return this.client.post<ReactionResponse>(`/api/posts/${postId}/react`, { type });
  }

  /**
   * Remove reaction from post
   */
  async removeReaction(postId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>(`/api/posts/${postId}/react`);
  }

  /**
   * Get post reactions
   */
  async getReactions(
    postId: string,
    type?: string
  ): Promise<ApiResponse<Array<{ user: { id: string; name: string; avatar: string }; type: string }>>> {
    return this.client.get(`/api/posts/${postId}/reactions`, { type });
  }

  /**
   * Get comments for post
   */
  async getComments(
    postId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<CommentResponse>>> {
    return this.client.get<PaginatedResult<CommentResponse>>(
      `/api/posts/${postId}/comments`,
      params
    );
  }

  /**
   * Create comment on post
   */
  async createComment(
    postId: string,
    data: CreateCommentData
  ): Promise<ApiResponse<CommentResponse>> {
    return this.client.post<CommentResponse>(`/api/posts/${postId}/comment`, data);
  }

  /**
   * Delete comment
   */
  async deleteComment(
    postId: string,
    commentId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>(
      `/api/posts/${postId}/comment?commentId=${commentId}`
    );
  }

  /**
   * React to comment
   */
  async reactToComment(
    commentId: string,
    type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care'
  ): Promise<ApiResponse<ReactionResponse>> {
    return this.client.post<ReactionResponse>(`/api/comments/${commentId}/react`, { type });
  }

  /**
   * Share post
   */
  async sharePost(
    postId: string,
    data?: { content?: string; visibility?: string }
  ): Promise<ApiResponse<PostResponse>> {
    return this.client.post<PostResponse>('/api/share', { postId, ...data });
  }

  /**
   * Save post
   */
  async savePost(
    postId: string,
    collection?: string
  ): Promise<ApiResponse<{ message: string; saved: boolean }>> {
    return this.client.post<{ message: string; saved: boolean }>('/api/saved-posts', {
      postId,
      collection,
    });
  }

  /**
   * Unsave post
   */
  async unsavePost(postId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>('/api/saved-posts', {
      postId,
    });
  }

  /**
   * Get saved posts
   */
  async getSavedPosts(
    collection?: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<PostResponse>>> {
    return this.client.get<PaginatedResult<PostResponse>>('/api/saved-posts', {
      collection,
      ...params,
    });
  }

  /**
   * Report post
   */
  async reportPost(
    postId: string,
    reason: string,
    details?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>('/api/reports', {
      type: 'post',
      targetId: postId,
      reason,
      details,
    });
  }

  /**
   * Hide post from feed
   */
  async hidePost(postId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(`/api/posts/${postId}/hide`);
  }

  /**
   * Upload media for post
   */
  async uploadMedia(file: File): Promise<ApiResponse<{ url: string; type: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: this.client.getAccessToken()
        ? { Authorization: `Bearer ${this.client.getAccessToken()}` }
        : undefined,
    });

    return response.json();
  }
}

/**
 * Create Post SDK instance
 */
export function createPostSdk(config: PostSdkConfig): PostSdk {
  return new PostSdk(config);
}

/**
 * Default Post SDK instance
 */
export const postSdk = createPostSdk({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
});

export default {
  PostSdk,
  createPostSdk,
  postSdk,
};
