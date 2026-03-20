/**
 * Comment Service
 * Manages comments on posts, reels, and other content
 */

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string; // For nested comments
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'gif';
  
  // Engagement
  likeCount: number;
  replyCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Computed
  isEdited?: boolean;
  userLiked?: boolean;
}

export interface CommentTree {
  comment: Comment;
  author: { id: string; name: string; avatar?: string };
  replies?: CommentTree[];
}

export class CommentService {
  /**
   * Create comment
   */
  async createComment(postId: string, authorId: string, data: {
    content: string;
    parentId?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'gif';
  }): Promise<Comment> {
    throw new Error('Implement with database');
  }

  /**
   * Get comment by ID
   */
  async getComment(commentId: string): Promise<Comment | null> {
    throw new Error('Implement with database');
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, authorId: string, content: string): Promise<Comment> {
    throw new Error('Implement with database');
  }

  /**
   * Delete comment (soft delete)
   */
  async deleteComment(commentId: string, requesterId: string): Promise<void> {
    // Can be deleted by author or post owner
    throw new Error('Implement with database');
  }

  /**
   * Get comments for post
   */
  async getPostComments(postId: string, viewerId?: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'chronological' | 'top' | 'relevant';
  }): Promise<{ comments: CommentTree[]; total: number; hasMore: boolean }> {
    throw new Error('Implement with database');
  }

  /**
   * Get replies for comment
   */
  async getCommentReplies(commentId: string, viewerId?: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ replies: CommentTree[]; total: number; hasMore: boolean }> {
    throw new Error('Implement with database');
  }

  /**
   * Like comment
   */
  async likeComment(commentId: string, userId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Unlike comment
   */
  async unlikeComment(commentId: string, userId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get comment count for post
   */
  async getCommentCount(postId: string): Promise<number> {
    throw new Error('Implement with database');
  }

  /**
   * Report comment
   */
  async reportComment(reporterId: string, commentId: string, reason: string, description?: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Hide comment
   */
  async hideComment(commentId: string, userId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get user's comments
   */
  async getUserComments(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ comments: Comment[]; total: number }> {
    throw new Error('Implement with database');
  }

  /**
   * Get comment likes
   */
  async getCommentLikes(commentId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ users: { id: string; name: string; avatar?: string }[]; total: number }> {
    throw new Error('Implement with database');
  }
}

export const commentService = new CommentService();
