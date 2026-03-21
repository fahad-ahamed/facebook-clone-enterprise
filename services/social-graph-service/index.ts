/**
 * Social Graph Service
 * Manages friends, followers, and social connections
 */

export * from './friend';
export * from './follow';
export * from './graph-db';

export interface SocialStats {
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  mutualFriendsCount: number;
  pendingRequestsCount: number;
  sentRequestsCount: number;
}

export class SocialGraphService {
  /**
   * Get user's social statistics
   */
  async getSocialStats(userId: string): Promise<SocialStats> {
    throw new Error('Implement with database');
  }

  /**
   * Get mutual friends count between two users
   */
  async getMutualFriendsCount(userId1: string, userId2: string): Promise<number> {
    throw new Error('Implement with database');
  }

  /**
   * Get relationship status between two users
   */
  async getRelationshipStatus(userId1: string, userId2: string): Promise<{
    isFriend: boolean;
    isFollowing: boolean;
    isFollowedBy: boolean;
    hasPendingRequest: boolean;
    requestDirection?: 'incoming' | 'outgoing';
    isBlocked: boolean;
  }> {
    throw new Error('Implement with database');
  }

  /**
   * Get social suggestions (people you may know)
   */
  async getPeopleYouMayKnow(userId: string, limit: number = 10): Promise<{
    userId: string;
    name: string;
    avatar?: string;
    mutualFriendsCount: number;
    reason: 'mutual_friends' | 'same_workplace' | 'same_school' | 'same_location';
  }[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get user's birthday reminders
   */
  async getBirthdayReminders(userId: string): Promise<{
    userId: string;
    name: string;
    avatar?: string;
    birthday: Date;
    isToday: boolean;
    daysUntil: number;
  }[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get friend anniversary reminders
   */
  async getFriendAnniversaries(userId: string): Promise<{
    friendId: string;
    name: string;
    avatar?: string;
    friendsSince: Date;
    years: number;
  }[]> {
    throw new Error('Implement with database');
  }
}

export const socialGraphService = new SocialGraphService();
