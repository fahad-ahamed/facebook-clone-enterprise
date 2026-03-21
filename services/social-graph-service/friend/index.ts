/**
 * Friend Service
 * Manages friend relationships and friend requests
 */

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'canceled';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
  closeFriend?: boolean;
}

export interface FriendList {
  userId: string;
  friends: {
    id: string;
    name: string;
    avatar?: string;
    mutualFriendsCount: number;
    friendsSince: Date;
    closeFriend: boolean;
  }[];
  total: number;
}

export class FriendService {
  /**
   * Send friend request
   */
  async sendFriendRequest(senderId: string, receiverId: string, message?: string): Promise<FriendRequest> {
    // Cannot send to self
    if (senderId === receiverId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already friends
    if (await this.areFriends(senderId, receiverId)) {
      throw new Error('Already friends');
    }

    // Check for existing pending request
    const existing = await this.getExistingRequest(senderId, receiverId);
    if (existing && existing.status === 'pending') {
      throw new Error('Friend request already pending');
    }

    throw new Error('Implement with database');
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId: string, receiverId: string): Promise<Friendship> {
    throw new Error('Implement with database');
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(requestId: string, receiverId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Cancel friend request
   */
  async cancelFriendRequest(requestId: string, senderId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Unfriend
   */
  async unfriend(userId: string, friendId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    throw new Error('Implement with database');
  }

  /**
   * Get friend list
   */
  async getFriendList(userId: string, options?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<FriendList> {
    throw new Error('Implement with database');
  }

  /**
   * Get pending friend requests (received)
   */
  async getPendingRequests(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    requests: (FriendRequest & { sender: { id: string; name: string; avatar?: string } })[];
    total: number;
  }> {
    throw new Error('Implement with database');
  }

  /**
   * Get sent friend requests
   */
  async getSentRequests(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    requests: (FriendRequest & { receiver: { id: string; name: string; avatar?: string } })[];
    total: number;
  }> {
    throw new Error('Implement with database');
  }

  /**
   * Get mutual friends
   */
  async getMutualFriends(userId1: string, userId2: string): Promise<{
    id: string;
    name: string;
    avatar?: string;
  }[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get friend suggestions
   */
  async getFriendSuggestions(userId: string, limit: number = 10): Promise<{
    userId: string;
    name: string;
    avatar?: string;
    mutualFriendsCount: number;
    suggestionReason: 'mutual_friends' | 'same_school' | 'same_workplace' | 'same_location';
  }[]> {
    throw new Error('Implement with database');
  }

  /**
   * Set as close friend
   */
  async setCloseFriend(userId: string, friendId: string, isClose: boolean): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get close friends
   */
  async getCloseFriends(userId: string): Promise<FriendList['friends']> {
    throw new Error('Implement with database');
  }

  /**
   * Get friend count
   */
  async getFriendCount(userId: string): Promise<number> {
    throw new Error('Implement with database');
  }

  /**
   * Get existing friend request between users
   */
  private async getExistingRequest(userId1: string, userId2: string): Promise<FriendRequest | null> {
    throw new Error('Implement with database');
  }

  /**
   * Search friends
   */
  async searchFriends(userId: string, query: string, limit: number = 10): Promise<FriendList['friends']> {
    throw new Error('Implement with database');
  }

  /**
   * Get recent interactions (for feed ranking)
   */
  async getRecentInteractions(userId: string, limit: number = 50): Promise<{
    friendId: string;
    lastInteraction: Date;
    interactionType: 'post_like' | 'comment' | 'message' | 'tag';
  }[]> {
    throw new Error('Implement with database');
  }
}

export const friendService = new FriendService();
