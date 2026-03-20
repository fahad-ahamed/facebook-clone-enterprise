/**
 * Event Types
 * All domain event types for Facebook Clone
 */

// Base event structure
export interface DomainEvent<T = any> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: number;
  payload: T;
  metadata: EventMetadata;
  correlationId?: string;
  causationId?: string;
}

export interface EventMetadata {
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ip?: string;
  userAgent?: string;
  source: string;
  traceId?: string;
}

// Event type categories
export enum EventCategory {
  USER = 'user',
  POST = 'post',
  COMMENT = 'comment',
  MESSAGE = 'message',
  NOTIFICATION = 'notification',
  FRIENDSHIP = 'friendship',
  GROUP = 'group',
  EVENT = 'event',
  MARKETPLACE = 'marketplace',
  REEL = 'reel',
  STORY = 'story',
  REACTION = 'reaction',
  MEDIA = 'media',
  SECURITY = 'security',
  SYSTEM = 'system',
}

// User Events
export interface UserCreatedEvent extends DomainEvent<{
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}> {
  type: 'user.created';
}

export interface UserUpdatedEvent extends DomainEvent<{
  userId: string;
  changes: Partial<{
    firstName: string;
    lastName: string;
    bio: string;
    avatar: string;
    coverPhoto: string;
  }>;
}> {
  type: 'user.updated';
}

export interface UserDeletedEvent extends DomainEvent<{
  userId: string;
  reason: string;
  deletedBy: string;
}> {
  type: 'user.deleted';
}

export interface UserActivatedEvent extends DomainEvent<{
  userId: string;
  activatedBy: string;
}> {
  type: 'user.activated';
}

export interface UserDeactivatedEvent extends DomainEvent<{
  userId: string;
  reason: string;
  deactivatedBy: string;
}> {
  type: 'user.deactivated';
}

export interface UserVerifiedEvent extends DomainEvent<{
  userId: string;
  verificationType: 'email' | 'phone';
}> {
  type: 'user.verified';
}

export interface UserOnlineEvent extends DomainEvent<{
  userId: string;
  deviceId: string;
  deviceType: string;
}> {
  type: 'user.online';
}

export interface UserOfflineEvent extends DomainEvent<{
  userId: string;
  deviceId: string;
  lastSeen: number;
}> {
  type: 'user.offline';
}

export interface UserProfileViewEvent extends DomainEvent<{
  viewerId: string;
  profileId: string;
  duration: number;
}> {
  type: 'user.profile_view';
}

// Post Events
export interface PostCreatedEvent extends DomainEvent<{
  postId: string;
  authorId: string;
  content: string;
  type: string;
  visibility: string;
  attachments: string[];
  tags: string[];
}> {
  type: 'post.created';
}

export interface PostUpdatedEvent extends DomainEvent<{
  postId: string;
  authorId: string;
  changes: Partial<{
    content: string;
    visibility: string;
  }>;
}> {
  type: 'post.updated';
}

export interface PostDeletedEvent extends DomainEvent<{
  postId: string;
  authorId: string;
  deletedBy: string;
  reason?: string;
}> {
  type: 'post.deleted';
}

export interface PostSharedEvent extends DomainEvent<{
  postId: string;
  sharedBy: string;
  sharedTo: string;
  comment?: string;
}> {
  type: 'post.shared';
}

export interface PostHiddenEvent extends DomainEvent<{
  postId: string;
  hiddenBy: string;
  reason?: string;
}> {
  type: 'post.hidden';
}

// Comment Events
export interface CommentCreatedEvent extends DomainEvent<{
  commentId: string;
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  attachments: string[];
}> {
  type: 'comment.created';
}

export interface CommentUpdatedEvent extends DomainEvent<{
  commentId: string;
  postId: string;
  authorId: string;
  content: string;
}> {
  type: 'comment.updated';
}

export interface CommentDeletedEvent extends DomainEvent<{
  commentId: string;
  postId: string;
  authorId: string;
  deletedBy: string;
}> {
  type: 'comment.deleted';
}

// Message Events
export interface MessageSentEvent extends DomainEvent<{
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientIds: string[];
  content: string;
  type: string;
  attachments: string[];
  replyTo?: string;
}> {
  type: 'message.sent';
}

export interface MessageDeliveredEvent extends DomainEvent<{
  messageId: string;
  conversationId: string;
  recipientId: string;
  deliveredAt: number;
}> {
  type: 'message.delivered';
}

export interface MessageReadEvent extends DomainEvent<{
  messageId: string;
  conversationId: string;
  readerId: string;
  readAt: number;
}> {
  type: 'message.read';
}

export interface MessageDeletedEvent extends DomainEvent<{
  messageId: string;
  conversationId: string;
  deletedBy: string;
  deletedFor: 'self' | 'everyone';
}> {
  type: 'message.deleted';
}

export interface ConversationCreatedEvent extends DomainEvent<{
  conversationId: string;
  type: 'direct' | 'group';
  participants: string[];
  createdBy: string;
}> {
  type: 'conversation.created';
}

export interface ConversationUpdatedEvent extends DomainEvent<{
  conversationId: string;
  changes: Partial<{
    name: string;
    avatar: string;
    participants: string[];
  }>;
}> {
  type: 'conversation.updated';
}

// Notification Events
export interface NotificationCreatedEvent extends DomainEvent<{
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  priority: 'low' | 'normal' | 'high';
}> {
  type: 'notification.created';
}

export interface NotificationReadEvent extends DomainEvent<{
  notificationId: string;
  userId: string;
  readAt: number;
}> {
  type: 'notification.read';
}

export interface NotificationDismissedEvent extends DomainEvent<{
  notificationId: string;
  userId: string;
}> {
  type: 'notification.dismissed';
}

// Friendship Events
export interface FriendRequestSentEvent extends DomainEvent<{
  requestId: string;
  senderId: string;
  recipientId: string;
  message?: string;
}> {
  type: 'friend_request.sent';
}

export interface FriendRequestAcceptedEvent extends DomainEvent<{
  requestId: string;
  senderId: string;
  recipientId: string;
}> {
  type: 'friend_request.accepted';
}

export interface FriendRequestRejectedEvent extends DomainEvent<{
  requestId: string;
  senderId: string;
  recipientId: string;
}> {
  type: 'friend_request.rejected';
}

export interface FriendshipEndedEvent extends DomainEvent<{
  userId: string;
  friendId: string;
  initiatedBy: string;
}> {
  type: 'friendship.ended';
}

export interface UserFollowedEvent extends DomainEvent<{
  followerId: string;
  followingId: string;
}> {
  type: 'user.followed';
}

export interface UserUnfollowedEvent extends DomainEvent<{
  followerId: string;
  followingId: string;
}> {
  type: 'user.unfollowed';
}

export interface UserBlockedEvent extends DomainEvent<{
  blockerId: string;
  blockedId: string;
  reason?: string;
}> {
  type: 'user.blocked';
}

export interface UserUnblockedEvent extends DomainEvent<{
  blockerId: string;
  unblockedId: string;
}> {
  type: 'user.unblocked';
}

// Group Events
export interface GroupCreatedEvent extends DomainEvent<{
  groupId: string;
  name: string;
  description: string;
  creatorId: string;
  privacy: 'public' | 'private' | 'secret';
}> {
  type: 'group.created';
}

export interface GroupUpdatedEvent extends DomainEvent<{
  groupId: string;
  changes: Partial<{
    name: string;
    description: string;
    privacy: string;
    coverPhoto: string;
  }>;
  updatedBy: string;
}> {
  type: 'group.updated';
}

export interface GroupDeletedEvent extends DomainEvent<{
  groupId: string;
  deletedBy: string;
}> {
  type: 'group.deleted';
}

export interface GroupMemberJoinedEvent extends DomainEvent<{
  groupId: string;
  userId: string;
  role: 'member' | 'admin' | 'moderator';
}> {
  type: 'group.member_joined';
}

export interface GroupMemberLeftEvent extends DomainEvent<{
  groupId: string;
  userId: string;
}> {
  type: 'group.member_left';
}

export interface GroupMemberRoleChangedEvent extends DomainEvent<{
  groupId: string;
  userId: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
}> {
  type: 'group.member_role_changed';
}

// Reaction Events
export interface ReactionAddedEvent extends DomainEvent<{
  reactionId: string;
  targetType: 'post' | 'comment' | 'message';
  targetId: string;
  userId: string;
  type: string;
}> {
  type: 'reaction.added';
}

export interface ReactionRemovedEvent extends DomainEvent<{
  reactionId: string;
  targetType: 'post' | 'comment' | 'message';
  targetId: string;
  userId: string;
}> {
  type: 'reaction.removed';
}

// Story Events
export interface StoryCreatedEvent extends DomainEvent<{
  storyId: string;
  authorId: string;
  type: 'image' | 'video' | 'text';
  mediaUrl: string;
  duration: number;
  visibility: string;
  expiresAt: number;
}> {
  type: 'story.created';
}

export interface StoryViewedEvent extends DomainEvent<{
  storyId: string;
  viewerId: string;
  authorId: string;
}> {
  type: 'story.viewed';
}

export interface StoryDeletedEvent extends DomainEvent<{
  storyId: string;
  authorId: string;
}> {
  type: 'story.deleted';
}

// Media Events
export interface MediaUploadedEvent extends DomainEvent<{
  mediaId: string;
  userId: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  size: number;
  mimeType: string;
  metadata: Record<string, any>;
}> {
  type: 'media.uploaded';
}

export interface MediaDeletedEvent extends DomainEvent<{
  mediaId: string;
  userId: string;
}> {
  type: 'media.deleted';
}

// Security Events
export interface LoginAttemptEvent extends DomainEvent<{
  userId: string;
  success: boolean;
  ip: string;
  deviceId: string;
  userAgent: string;
  failureReason?: string;
}> {
  type: 'security.login_attempt';
}

export interface PasswordChangedEvent extends DomainEvent<{
  userId: string;
  changedBy: string;
  sessionsInvalidated: boolean;
}> {
  type: 'security.password_changed';
}

export interface TwoFactorEnabledEvent extends DomainEvent<{
  userId: string;
  method: 'app' | 'sms' | 'email';
}> {
  type: 'security.2fa_enabled';
}

export interface TwoFactorDisabledEvent extends DomainEvent<{
  userId: string;
}> {
  type: 'security.2fa_disabled';
}

export interface SuspiciousActivityEvent extends DomainEvent<{
  userId: string;
  activityType: string;
  details: Record<string, any>;
  riskScore: number;
}> {
  type: 'security.suspicious_activity';
}

// System Events
export interface SystemMaintenanceEvent extends DomainEvent<{
  scheduledStart: number;
  scheduledEnd: number;
  reason: string;
  affectedServices: string[];
}> {
  type: 'system.maintenance';
}

export interface SystemConfigChangedEvent extends DomainEvent<{
  configKey: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
}> {
  type: 'system.config_changed';
}

export interface ServiceHealthChangedEvent extends DomainEvent<{
  serviceName: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}> {
  type: 'system.service_health_changed';
}

// Event Types Registry
export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',
  USER_VERIFIED: 'user.verified',
  USER_ONLINE: 'user.online',
  USER_OFFLINE: 'user.offline',
  USER_PROFILE_VIEW: 'user.profile_view',

  // Post events
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',
  POST_SHARED: 'post.shared',
  POST_HIDDEN: 'post.hidden',

  // Comment events
  COMMENT_CREATED: 'comment.created',
  COMMENT_UPDATED: 'comment.updated',
  COMMENT_DELETED: 'comment.deleted',

  // Message events
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  MESSAGE_DELETED: 'message.deleted',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_DISMISSED: 'notification.dismissed',

  // Friendship events
  FRIEND_REQUEST_SENT: 'friend_request.sent',
  FRIEND_REQUEST_ACCEPTED: 'friend_request.accepted',
  FRIEND_REQUEST_REJECTED: 'friend_request.rejected',
  FRIENDSHIP_ENDED: 'friendship.ended',
  USER_FOLLOWED: 'user.followed',
  USER_UNFOLLOWED: 'user.unfollowed',
  USER_BLOCKED: 'user.blocked',
  USER_UNBLOCKED: 'user.unblocked',

  // Group events
  GROUP_CREATED: 'group.created',
  GROUP_UPDATED: 'group.updated',
  GROUP_DELETED: 'group.deleted',
  GROUP_MEMBER_JOINED: 'group.member_joined',
  GROUP_MEMBER_LEFT: 'group.member_left',
  GROUP_MEMBER_ROLE_CHANGED: 'group.member_role_changed',

  // Reaction events
  REACTION_ADDED: 'reaction.added',
  REACTION_REMOVED: 'reaction.removed',

  // Story events
  STORY_CREATED: 'story.created',
  STORY_VIEWED: 'story.viewed',
  STORY_DELETED: 'story.deleted',

  // Media events
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_DELETED: 'media.deleted',

  // Security events
  LOGIN_ATTEMPT: 'security.login_attempt',
  PASSWORD_CHANGED: 'security.password_changed',
  TWO_FACTOR_ENABLED: 'security.2fa_enabled',
  TWO_FACTOR_DISABLED: 'security.2fa_disabled',
  SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',

  // System events
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_CONFIG_CHANGED: 'system.config_changed',
  SERVICE_HEALTH_CHANGED: 'system.service_health_changed',
} as const;

/**
 * Create a domain event
 */
export function createEvent<T>(
  type: string,
  aggregateId: string,
  aggregateType: string,
  payload: T,
  metadata: Partial<EventMetadata> = {},
  options: {
    version?: number;
    correlationId?: string;
    causationId?: string;
  } = {}
): DomainEvent<T> {
  return {
    id: generateEventId(),
    type,
    aggregateId,
    aggregateType,
    version: options.version || 1,
    timestamp: Date.now(),
    payload,
    metadata: {
      source: process.env.SERVICE_NAME || 'unknown',
      ...metadata,
    },
    correlationId: options.correlationId,
    causationId: options.causationId,
  };
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `evt_${timestamp}_${random}`;
}

// Union type of all events
export type AllEvents =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | UserActivatedEvent
  | UserDeactivatedEvent
  | UserVerifiedEvent
  | UserOnlineEvent
  | UserOfflineEvent
  | UserProfileViewEvent
  | PostCreatedEvent
  | PostUpdatedEvent
  | PostDeletedEvent
  | PostSharedEvent
  | PostHiddenEvent
  | CommentCreatedEvent
  | CommentUpdatedEvent
  | CommentDeletedEvent
  | MessageSentEvent
  | MessageDeliveredEvent
  | MessageReadEvent
  | MessageDeletedEvent
  | ConversationCreatedEvent
  | ConversationUpdatedEvent
  | NotificationCreatedEvent
  | NotificationReadEvent
  | NotificationDismissedEvent
  | FriendRequestSentEvent
  | FriendRequestAcceptedEvent
  | FriendRequestRejectedEvent
  | FriendshipEndedEvent
  | UserFollowedEvent
  | UserUnfollowedEvent
  | UserBlockedEvent
  | UserUnblockedEvent
  | GroupCreatedEvent
  | GroupUpdatedEvent
  | GroupDeletedEvent
  | GroupMemberJoinedEvent
  | GroupMemberLeftEvent
  | GroupMemberRoleChangedEvent
  | ReactionAddedEvent
  | ReactionRemovedEvent
  | StoryCreatedEvent
  | StoryViewedEvent
  | StoryDeletedEvent
  | MediaUploadedEvent
  | MediaDeletedEvent
  | LoginAttemptEvent
  | PasswordChangedEvent
  | TwoFactorEnabledEvent
  | TwoFactorDisabledEvent
  | SuspiciousActivityEvent
  | SystemMaintenanceEvent
  | SystemConfigChangedEvent
  | ServiceHealthChangedEvent;
