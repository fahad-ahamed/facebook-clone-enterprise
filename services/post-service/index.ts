/**
 * Post Service
 * Manages posts, media, and tagging
 */

export * from './text';
export * from './media';
export * from './tagging';

export type PostType = 'status' | 'photo' | 'video' | 'link' | 'life_event' | 'check_in';
export type PostVisibility = 'public' | 'friends' | 'friends_except' | 'specific_friends' | 'only_me';

export interface Post {
  id: string;
  authorId: string;
  content?: string;
  mediaType?: 'image' | 'video' | 'gif';
  mediaUrl?: string;
  mediaUrls?: string[];
  postType: PostType;
  visibility: PostVisibility;
  visibilityExcept?: string[];
  visibilitySpecific?: string[];
  
  // Rich content
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  
  // Feeling/activity
  feeling?: { emoji: string; text: string };
  activity?: { type: string; target?: string };
  
  // Location
  location?: string;
  locationId?: string;
  
  // Background customization
  backgroundColor?: string;
  textColor?: string;
  font?: string;
  
  // Context
  groupId?: string;
  pageId?: string;
  
  // Engagement
  likeCount: number;
  commentCount: number;
  shareCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Computed
  isEdited?: boolean;
  userReaction?: string;
}

export interface PostCreateData {
  content?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'gif';
  postType?: PostType;
  visibility?: PostVisibility;
  visibilityExcept?: string[];
  visibilitySpecific?: string[];
  feeling?: Post['feeling'];
  activity?: Post['activity'];
  location?: string;
  backgroundColor?: string;
  textColor?: string;
  groupId?: string;
  pageId?: string;
  linkUrl?: string;
  taggedUserIds?: string[];
}

export interface PostUpdateData {
  content?: string;
  visibility?: PostVisibility;
  visibilityExcept?: string[];
  visibilitySpecific?: string[];
}

export class PostService {
  /**
   * Create post
   */
  async createPost(authorId: string, data: PostCreateData): Promise<Post> {
    throw new Error('Implement with database');
  }

  /**
   * Get post by ID
   */
  async getPost(postId: string, viewerId?: string): Promise<Post | null> {
    throw new Error('Implement with database');
  }

  /**
   * Update post
   */
  async updatePost(postId: string, authorId: string, data: PostUpdateData): Promise<Post> {
    throw new Error('Implement with database');
  }

  /**
   * Delete post (soft delete)
   */
  async deletePost(postId: string, authorId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get feed posts
   */
  async getFeedPosts(userId: string, options?: {
    limit?: number;
    offset?: number;
    groupId?: string;
    pageId?: string;
  }): Promise<{ posts: Post[]; hasMore: boolean }> {
    throw new Error('Implement with database');
  }

  /**
   * Get user's posts
   */
  async getUserPosts(userId: string, viewerId?: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ posts: Post[]; hasMore: boolean }> {
    throw new Error('Implement with database');
  }

  /**
   * Get posts for group
   */
  async getGroupPosts(groupId: string, viewerId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ posts: Post[]; hasMore: boolean }> {
    throw new Error('Implement with database');
  }

  /**
   * Get posts for page
   */
  async getPagePosts(pageId: string, viewerId?: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ posts: Post[]; hasMore: boolean }> {
    throw new Error('Implement with database');
  }

  /**
   * Share post
   */
  async sharePost(userId: string, postId: string, content?: string): Promise<Post> {
    throw new Error('Implement with database');
  }

  /**
   * Hide post from feed
   */
  async hidePost(userId: string, postId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Report post
   */
  async reportPost(reporterId: string, postId: string, reason: string, description?: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get post count
   */
  async getPostCount(userId: string): Promise<number> {
    throw new Error('Implement with database');
  }

  /**
   * Check if user can view post
   */
  async canViewPost(postId: string, viewerId?: string): Promise<boolean> {
    throw new Error('Implement with privacy checks');
  }

  /**
   * Get posts by hashtag
   */
  async getPostsByHashtag(hashtag: string, viewerId?: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ posts: Post[]; hasMore: boolean }> {
    throw new Error('Implement with database');
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(viewerId?: string, limit: number = 10): Promise<Post[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get post statistics
   */
  async getPostStats(postId: string): Promise<{
    likeCount: number;
    commentCount: number;
    shareCount: number;
    reachCount: number;
    engagementRate: number;
  }> {
    throw new Error('Implement with database');
  }
}

export const postService = new PostService();
