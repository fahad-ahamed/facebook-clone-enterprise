/**
 * User SDK
 * User management service client
 * @module shared/sdk/user-sdk
 */

import { HttpClient } from './base-client';
import {
  UserResponse,
  ApiResponse,
  PaginatedResult,
  PaginationParams,
} from './types';

/**
 * User SDK configuration
 */
export interface UserSdkConfig {
  /** Base URL for user service */
  baseUrl: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * User update data
 */
export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  currentCity?: string;
  hometown?: string;
  workplace?: string;
  education?: string;
  relationshipStatus?: string;
  country?: string;
  isProfileLocked?: boolean;
}

/**
 * User search params
 */
export interface UserSearchParams extends PaginationParams {
  /** Search query */
  q?: string;
  /** Filter by location */
  location?: string;
  /** Filter by workplace */
  workplace?: string;
}

/**
 * Friend request response
 */
export interface FriendRequestResponse {
  id: string;
  senderId: string;
  sender: UserResponse;
  receiverId: string;
  receiver: UserResponse;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: string;
}

/**
 * Follow response
 */
export interface FollowResponse {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

/**
 * Block response
 */
export interface BlockResponse {
  isBlocked: boolean;
  message: string;
}

/**
 * User SDK client
 */
export class UserSdk {
  private client: HttpClient;

  constructor(config: UserSdkConfig) {
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
   * Get user by ID
   */
  async getUser(userId: string): Promise<ApiResponse<UserResponse>> {
    return this.client.get<UserResponse>(`/api/users/${userId}`);
  }

  /**
   * Get multiple users by IDs
   */
  async getUsers(userIds: string[]): Promise<ApiResponse<UserResponse[]>> {
    return this.client.post<UserResponse[]>('/api/users/batch', { userIds });
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<UserResponse>> {
    return this.client.get<UserResponse>('/api/auth/me');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UserUpdateData): Promise<ApiResponse<UserResponse>> {
    return this.client.put<UserResponse>('/api/users', data);
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    // Use native fetch for FormData
    const response = await fetch('/api/users/avatar', {
      method: 'POST',
      body: formData,
      headers: this.client.getAccessToken()
        ? { Authorization: `Bearer ${this.client.getAccessToken()}` }
        : undefined,
    });

    return response.json();
  }

  /**
   * Upload cover photo
   */
  async uploadCoverPhoto(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/users/cover', {
      method: 'POST',
      body: formData,
      headers: this.client.getAccessToken()
        ? { Authorization: `Bearer ${this.client.getAccessToken()}` }
        : undefined,
    });

    return response.json();
  }

  /**
   * Search users
   */
  async searchUsers(
    params: UserSearchParams
  ): Promise<ApiResponse<PaginatedResult<UserResponse>>> {
    return this.client.get<PaginatedResult<UserResponse>>('/api/users', params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<ApiResponse<UserResponse>> {
    return this.client.get<UserResponse>(`/api/users/username/${username}`);
  }

  /**
   * Get user friends
   */
  async getFriends(
    userId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<UserResponse>>> {
    return this.client.get<PaginatedResult<UserResponse>>(
      `/api/friends`,
      { userId, type: 'friends', ...params }
    );
  }

  /**
   * Get friend requests
   */
  async getFriendRequests(): Promise<ApiResponse<FriendRequestResponse[]>> {
    return this.client.get<FriendRequestResponse[]>('/api/friends', { type: 'requests' });
  }

  /**
   * Get friend suggestions
   */
  async getFriendSuggestions(limit?: number): Promise<ApiResponse<UserResponse[]>> {
    return this.client.get<UserResponse[]>('/api/friends', {
      type: 'suggestions',
      limit: limit || 10,
    });
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string): Promise<ApiResponse<FriendRequestResponse>> {
    return this.client.post<FriendRequestResponse>('/api/friends', { userId });
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>('/api/friends', {
      action: 'accept',
      requestId,
    });
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(requestId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>('/api/friends', {
      action: 'reject',
      requestId,
    });
  }

  /**
   * Remove friend
   */
  async removeFriend(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>('/api/friends', {
      action: 'unfriend',
      userId,
    });
  }

  /**
   * Follow user
   */
  async followUser(userId: string): Promise<ApiResponse<FollowResponse>> {
    return this.client.post<FollowResponse>('/api/follow', { userId });
  }

  /**
   * Unfollow user
   */
  async unfollowUser(userId: string): Promise<ApiResponse<FollowResponse>> {
    return this.client.post<FollowResponse>('/api/follow', { userId, action: 'unfollow' });
  }

  /**
   * Get followers
   */
  async getFollowers(
    userId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<UserResponse>>> {
    return this.client.get<PaginatedResult<UserResponse>>('/api/follow', {
      userId,
      type: 'followers',
      ...params,
    });
  }

  /**
   * Get following
   */
  async getFollowing(
    userId: string,
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResult<UserResponse>>> {
    return this.client.get<PaginatedResult<UserResponse>>('/api/follow', {
      userId,
      type: 'following',
      ...params,
    });
  }

  /**
   * Block user
   */
  async blockUser(userId: string): Promise<ApiResponse<BlockResponse>> {
    return this.client.post<BlockResponse>('/api/block', { userId, action: 'block' });
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string): Promise<ApiResponse<BlockResponse>> {
    return this.client.post<BlockResponse>('/api/block', { userId, action: 'unblock' });
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(): Promise<ApiResponse<UserResponse[]>> {
    return this.client.get<UserResponse[]>('/api/block');
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>('/api/users');
  }
}

/**
 * Create User SDK instance
 */
export function createUserSdk(config: UserSdkConfig): UserSdk {
  return new UserSdk(config);
}

/**
 * Default User SDK instance
 */
export const userSdk = createUserSdk({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
});

export default {
  UserSdk,
  createUserSdk,
  userSdk,
};
