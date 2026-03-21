/**
 * Notification System
 * Complete notification management with push, email, SMS
 */

export * from './notification-service';
export * from './push-service';
export * from './email-service';
export * from './sms-service';
export * from './preference-service';

export type NotificationType = 
  | 'friend_request'
  | 'friend_request_accepted'
  | 'like'
  | 'comment'
  | 'share'
  | 'mention'
  | 'tag'
  | 'message'
  | 'group_invite'
  | 'group_post'
  | 'event_invite'
  | 'event_reminder'
  | 'page_update'
  | 'birthday'
  | 'memory'
  | 'recommendation'
  | 'system'
  | 'security';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  
  // Content
  title?: string;
  message: string;
  image?: string;
  
  // Related content
  relatedType?: 'post' | 'comment' | 'user' | 'group' | 'page' | 'event' | 'message';
  relatedId?: string;
  actionUrl?: string;
  
  // Actor (who triggered it)
  actorId?: string;
  
  // Status
  isRead: boolean;
  readAt?: Date;
  
  // Delivery
  deliveredPush: boolean;
  deliveredEmail: boolean;
  deliveredSms: boolean;
  
  // Timestamps
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  [key: string]: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

export class NotificationSystem {
  /**
   * Create notification
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title?: string;
    message: string;
    image?: string;
    relatedType?: Notification['relatedType'];
    relatedId?: string;
    actionUrl?: string;
    actorId?: string;
  }): Promise<Notification> {
    throw new Error('Implement with database');
  }

  /**
   * Get notifications
   */
  async getNotifications(userId: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: NotificationType[];
  }): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    throw new Error('Implement with database');
  }

  /**
   * Mark as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    throw new Error('Implement with database');
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId: string, notification: Notification): Promise<void> {
    throw new Error('Implement with FCM/APNs');
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId: string, notification: Notification): Promise<void> {
    throw new Error('Implement with email service');
  }

  /**
   * Send SMS notification
   */
  async sendSmsNotification(userId: string, notification: Notification): Promise<void> {
    throw new Error('Implement with SMS service');
  }

  /**
   * Get preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    throw new Error('Implement with database');
  }

  /**
   * Update preferences
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    throw new Error('Implement with database');
  }

  /**
   * Batch create notifications
   */
  async batchCreate(notifications: Array<Omit<Notification, 'id' | 'createdAt'>>): Promise<Notification[]> {
    throw new Error('Implement with database');
  }

  /**
   * Clear expired notifications
   */
  async clearExpired(): Promise<number> {
    throw new Error('Implement with database');
  }

  /**
   * Get notification settings for type
   */
  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: 'push' | 'email' | 'sms'
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences[type]?.[channel] ?? true;
  }
}

export const notificationSystem = new NotificationSystem();
