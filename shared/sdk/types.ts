/**
 * SDK Types
 * Shared type definitions for all SDK clients
 * @module shared/sdk/types
 */

// Re-export types from shared types
export * from '../types/index';

/**
 * Service configuration
 */
export interface ServiceConfig {
  /** Service name */
  name: string;
  /** Base URL */
  baseUrl: string;
  /** API version */
  version?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResult<T> {
  /** Data items */
  data: T[];
  /** Total count */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Whether there are more items */
  hasMore: boolean;
  /** Next cursor (for cursor-based pagination) */
  nextCursor?: string;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  /** Email address */
  email: string;
  /** Password */
  password: string;
}

/**
 * Registration data
 */
export interface RegistrationData {
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Email address */
  email: string;
  /** Password */
  password: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Gender */
  gender?: 'male' | 'female' | 'custom';
  /** Username */
  username?: string;
  /** Country */
  country?: string;
}

/**
 * Auth tokens
 */
export interface AuthTokens {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * Auth response
 */
export interface AuthResponse {
  /** User data */
  user: UserResponse;
  /** Auth tokens */
  tokens: AuthTokens;
  /** Whether email is verified */
  emailVerified: boolean;
}

/**
 * User response
 */
export interface UserResponse {
  /** User ID */
  id: string;
  /** Email address */
  email: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Username */
  username?: string;
  /** Avatar URL */
  avatar?: string;
  /** Cover photo URL */
  coverPhoto?: string;
  /** Bio */
  bio?: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Gender */
  gender?: string;
  /** Phone number */
  phone?: string;
  /** Current city */
  currentCity?: string;
  /** Hometown */
  hometown?: string;
  /** Workplace */
  workplace?: string;
  /** Education */
  education?: string;
  /** Relationship status */
  relationshipStatus?: string;
  /** Country */
  country?: string;
  /** Whether user is verified */
  isVerified: boolean;
  /** Badge type */
  badgeType?: string;
  /** Whether profile is locked */
  isProfileLocked: boolean;
  /** Whether user is online */
  isOnline: boolean;
  /** Follower count */
  followerCount: number;
  /** Following count */
  followingCount: number;
  /** Friend count */
  friendCount: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Post response
 */
export interface PostResponse {
  /** Post ID */
  id: string;
  /** Author ID */
  authorId: string;
  /** Author */
  author: UserResponse;
  /** Post content */
  content?: string;
  /** Media type */
  mediaType?: 'image' | 'video' | 'gif';
  /** Media URL */
  mediaUrl?: string;
  /** Multiple media URLs */
  mediaUrls?: string[];
  /** Post type */
  postType: 'status' | 'photo' | 'video' | 'link' | 'check_in';
  /** Visibility */
  visibility: 'public' | 'friends' | 'only_me' | 'specific_friends' | 'friends_except';
  /** Feeling */
  feeling?: {
    emoji: string;
    text: string;
  };
  /** Location */
  location?: string;
  /** Like count */
  likeCount: number;
  /** Comment count */
  commentCount: number;
  /** Share count */
  shareCount: number;
  /** User's reaction */
  userReaction?: string;
  /** Comments */
  comments?: CommentResponse[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Comment response
 */
export interface CommentResponse {
  /** Comment ID */
  id: string;
  /** Post ID */
  postId: string;
  /** Author ID */
  authorId: string;
  /** Author */
  author: UserResponse;
  /** Parent comment ID */
  parentId?: string;
  /** Comment content */
  content: string;
  /** Media URL */
  mediaUrl?: string;
  /** Like count */
  likeCount: number;
  /** Reply count */
  replyCount: number;
  /** Replies */
  replies?: CommentResponse[];
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Reaction response
 */
export interface ReactionResponse {
  /** Reaction ID */
  id: string;
  /** User ID */
  userId: string;
  /** Reaction type */
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care';
  /** Post ID */
  postId?: string;
  /** Comment ID */
  commentId?: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Conversation response
 */
export interface ConversationResponse {
  /** Conversation ID */
  id: string;
  /** Conversation type */
  type: 'direct' | 'group';
  /** Conversation name (for groups) */
  name?: string;
  /** Participants */
  participants: UserResponse[];
  /** Last message */
  lastMessage?: MessageResponse;
  /** Last message timestamp */
  lastMessageAt?: string;
  /** Unread count */
  unreadCount: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Message response
 */
export interface MessageResponse {
  /** Message ID */
  id: string;
  /** Conversation ID */
  conversationId: string;
  /** Sender ID */
  senderId: string;
  /** Sender */
  sender: UserResponse;
  /** Message content */
  content?: string;
  /** Message type */
  messageType: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker' | 'gif';
  /** Media URL */
  mediaUrl?: string;
  /** File name */
  fileName?: string;
  /** File size */
  fileSize?: number;
  /** Voice duration */
  voiceDuration?: number;
  /** Message status */
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  /** Delivered at */
  deliveredAt?: string;
  /** Read at */
  readAt?: string;
  /** Whether message is read */
  isRead: boolean;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Notification response
 */
export interface NotificationResponse {
  /** Notification ID */
  id: string;
  /** User ID */
  userId: string;
  /** Notification type */
  type: string;
  /** Notification title */
  title?: string;
  /** Notification message */
  message: string;
  /** Image URL */
  image?: string;
  /** Actor user */
  actor?: UserResponse;
  /** Related type */
  relatedType?: string;
  /** Related ID */
  relatedId?: string;
  /** Action URL */
  actionUrl?: string;
  /** Whether notification is read */
  isRead: boolean;
  /** Read timestamp */
  readAt?: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Group response
 */
export interface GroupResponse {
  /** Group ID */
  id: string;
  /** Group name */
  name: string;
  /** Group description */
  description?: string;
  /** Cover photo URL */
  coverPhoto?: string;
  /** Avatar URL */
  avatar?: string;
  /** Group type */
  type: 'public' | 'private' | 'secret';
  /** Member count */
  memberCount: number;
  /** Post count */
  postCount: number;
  /** Creator */
  createdBy: UserResponse;
  /** Whether current user is a member */
  isMember?: boolean;
  /** Whether current user is admin */
  isAdmin?: boolean;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Event response
 */
export interface EventResponse {
  /** Event ID */
  id: string;
  /** Event title */
  title: string;
  /** Event description */
  description?: string;
  /** Cover photo URL */
  coverPhoto?: string;
  /** Start date */
  startDate: string;
  /** End date */
  endDate?: string;
  /** Location */
  location?: string;
  /** Whether event is online */
  isOnline: boolean;
  /** Online URL */
  onlineUrl?: string;
  /** Event host */
  host: UserResponse;
  /** Going count */
  goingCount: number;
  /** Interested count */
  interestedCount: number;
  /** Event visibility */
  visibility: 'public' | 'private';
  /** Whether current user is going */
  isGoing?: boolean;
  /** Whether current user is interested */
  isInterested?: boolean;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Story response
 */
export interface StoryResponse {
  /** Story ID */
  id: string;
  /** User ID */
  userId: string;
  /** User */
  user: UserResponse;
  /** Media type */
  mediaType: 'image' | 'video';
  /** Media URL */
  mediaUrl: string;
  /** Caption */
  caption?: string;
  /** View count */
  viewCount: number;
  /** Reaction count */
  reactionCount: number;
  /** Whether current user has viewed */
  isViewed?: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Expiration timestamp */
  expiresAt: string;
}

/**
 * Reel response
 */
export interface ReelResponse {
  /** Reel ID */
  id: string;
  /** Author ID */
  userId: string;
  /** Author */
  author: UserResponse;
  /** Video URL */
  videoUrl: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Caption */
  caption?: string;
  /** Audio info */
  audio?: string;
  /** Duration in seconds */
  duration?: number;
  /** View count */
  viewCount: number;
  /** Like count */
  likeCount: number;
  /** Comment count */
  commentCount: number;
  /** Share count */
  shareCount: number;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Marketplace listing response
 */
export interface MarketplaceListingResponse {
  /** Listing ID */
  id: string;
  /** Seller ID */
  sellerId: string;
  /** Seller */
  seller: UserResponse;
  /** Listing title */
  title: string;
  /** Listing description */
  description?: string;
  /** Price */
  price: number;
  /** Currency */
  currency: string;
  /** Category */
  category: string;
  /** Condition */
  condition: 'new' | 'like_new' | 'used' | 'fair';
  /** Image URLs */
  images: string[];
  /** Location */
  location: string;
  /** Listing status */
  status: 'available' | 'pending' | 'sold';
  /** View count */
  viewCount: number;
  /** Save count */
  saveCount: number;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Search response
 */
export interface SearchResponse {
  /** User results */
  users: UserResponse[];
  /** Post results */
  posts: PostResponse[];
  /** Group results */
  groups: GroupResponse[];
  /** Event results */
  events: EventResponse[];
  /** Page results */
  pages: unknown[];
  /** Marketplace results */
  marketplace: MarketplaceListingResponse[];
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  /** Event name */
  name: string;
  /** Event properties */
  properties?: Record<string, unknown>;
  /** User ID */
  userId?: string;
  /** Timestamp */
  timestamp?: string;
}

export default {
  // All types are exported above
};
