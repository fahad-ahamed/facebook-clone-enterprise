/**
 * Memory Service
 * Manages "On this Day" memories and reminiscence features
 */

export interface Memory {
  id: string;
  userId: string;
  sourceType: 'post' | 'photo' | 'video' | 'friendship';
  sourceId: string;
  originalDate: Date;
  yearsAgo: number;
  preview?: string;
  
  // Notification tracking
  notifiedAt?: Date;
  viewedAt?: Date;
  
  createdAt: Date;
}

export interface MemoryStats {
  totalMemories: number;
  thisDayCount: number;
  thisWeekCount: number;
  oldestMemory?: Date;
}

export class MemoryService {
  /**
   * Get memories for a specific date
   */
  async getMemoriesForDate(
    userId: string,
    date: Date,
    options?: { limit?: number }
  ): Promise<Memory[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get today's memories ("On this Day")
   */
  async getTodaysMemories(userId: string): Promise<Memory[]> {
    const today = new Date();
    return this.getMemoriesForDate(userId, today);
  }

  /**
   * Get memories for date range
   */
  async getMemoriesForRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Memory[]> {
    throw new Error('Implement with database');
  }

  /**
   * Create memory from post
   */
  async createMemoryFromPost(postId: string): Promise<Memory> {
    throw new Error('Implement with database');
  }

  /**
   * Mark memory as viewed
   */
  async markAsViewed(memoryId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Share memory as new post
   */
  async shareMemory(userId: string, memoryId: string, caption?: string): Promise<string> {
    // Returns new post ID
    throw new Error('Implement with database');
  }

  /**
   * Hide memory
   */
  async hideMemory(memoryId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(userId: string): Promise<MemoryStats> {
    throw new Error('Implement with database');
  }

  /**
   * Get friend anniversaries
   */
  async getFriendAnniversaries(userId: string): Promise<{
    friendId: string;
    friendName: string;
    friendAvatar?: string;
    friendsSince: Date;
    years: number;
  }[]> {
    throw new Error('Implement with database');
  }

  /**
   * Get memories notification
   */
  async getMemoriesNotification(userId: string): Promise<{
    hasNewMemories: boolean;
    count: number;
    years: number[];
  }> {
    throw new Error('Implement with database');
  }

  /**
   * Generate memories for all users (cron job)
   */
  async generateDailyMemories(): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get memory settings
   */
  async getMemorySettings(userId: string): Promise<{
    enabled: boolean;
    showInFeed: boolean;
    notifications: boolean;
  }> {
    throw new Error('Implement with database');
  }

  /**
   * Update memory settings
   */
  async updateMemorySettings(userId: string, settings: {
    enabled?: boolean;
    showInFeed?: boolean;
    notifications?: boolean;
  }): Promise<void> {
    throw new Error('Implement with database');
  }
}

export const memoryService = new MemoryService();
