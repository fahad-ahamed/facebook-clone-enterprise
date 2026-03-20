/**
 * Shared Types
 * TypeScript type definitions used across services
 */

// =====================================================
// User Types
// =====================================================

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  gender?: Gender;
  birthDate?: Date;
  location?: string;
  website?: string;
  language: string;
  timezone: string;
  isVerified: boolean;
  isPrivate: boolean;
  status: UserStatus;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type Gender = 'male' | 'female' | 'custom' | 'prefer_not_to_say';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned' | 'deleted';
export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';

export interface UserProfile extends User {
  followerCount: number;
  followingCount: number;
  friendCount: number;
  postCount: number;
  isFollowing?: boolean;
  isFriend?: boolean;
  isBlocked?: boolean;
}

// =====================================================
// Authentication Types
// =====================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  deviceName?: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// =====================================================
// Post Types
// =====================================================

export interface Post {
  id: string;
  userId: string;
  content?: string;
  media: PostMedia[];
  visibility: PostVisibility;
  location?: string;
  feeling?: string;
  tags: string[];
  groupId?: string;
  pageId?: string;
  isPinned: boolean;
  isFeatured: boolean;
  commentCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type PostVisibility = 'public' | 'friends' | 'private';

export interface PostMedia {
  id: string;
  postId: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  position: number;
  metadata?: Record<string, any>;
}

export type MediaType = 'image' | 'video' | 'gif';

export interface PostWithAuthor extends Post {
  author: UserProfile;
  isLiked: boolean;
  isSaved: boolean;
  reactions: ReactionSummary[];
}

export interface ReactionSummary {
  type: ReactionType;
  count: number;
  isUserReaction: boolean;
}

// =====================================================
// Comment Types
// =====================================================

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  media?: PostMedia[];
  likeCount: number;
  replyCount: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CommentWithAuthor extends Comment {
  author: UserProfile;
  isLiked: boolean;
  replies?: CommentWithAuthor[];
}

// =====================================================
// Reaction Types
// =====================================================

export interface Reaction {
  id: string;
  userId: string;
  reactableType: 'post' | 'comment';
  reactableId: string;
  type: ReactionType;
  createdAt: Date;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

// =====================================================
// Social Graph Types
// =====================================================

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

// =====================================================
// Chat Types
// =====================================================

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  name?: string;
  avatar?: string;
  admins?: string[];
  lastMessage?: MessagePreview;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationType = 'private' | 'group';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  media?: PostMedia[];
  replyToId?: string;
  reactions: MessageReaction[];
  readBy: string[];
  deliveredTo: string[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface MessagePreview {
  id: string;
  content?: string;
  senderId: string;
  createdAt: Date;
}

export interface MessageReaction {
  userId: string;
  type: ReactionType;
  createdAt: Date;
}

// =====================================================
// Notification Types
// =====================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title?: string;
  content?: string;
  data?: Record<string, any>;
  imageUrl?: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'new_follower'
  | 'post_like'
  | 'post_comment'
  | 'comment_reply'
  | 'comment_like'
  | 'post_share'
  | 'post_mention'
  | 'comment_mention'
  | 'group_invite'
  | 'group_accepted'
  | 'group_post'
  | 'page_like'
  | 'event_invite'
  | 'event_reminder'
  | 'new_message'
  | 'account_security'
  | 'policy_violation'
  | 'feature_update';

// =====================================================
// Group Types
// =====================================================

export interface Group {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  privacy: GroupPrivacy;
  creatorId: string;
  memberCount: number;
  postCount: number;
  rules?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type GroupPrivacy = 'public' | 'private' | 'secret';

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  status: 'active' | 'banned' | 'left';
  joinedAt: Date;
}

export type GroupRole = 'creator' | 'admin' | 'moderator' | 'member';

// =====================================================
// Event Types
// =====================================================

export interface Event {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  creatorId: string;
  groupId?: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
  onlineUrl?: string;
  privacy: EventPrivacy;
  goingCount: number;
  interestedCount: number;
  createdAt: Date;
}

export type EventPrivacy = 'public' | 'private' | 'group';

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  createdAt: Date;
}

export type RsvpStatus = 'going' | 'interested' | 'not_going';

// =====================================================
// Story & Reel Types
// =====================================================

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
  caption?: string;
  duration?: number;
  viewCount: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface StoryView {
  id: string;
  storyId: string;
  userId: string;
  viewedAt: Date;
}

export interface Reel {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  audioId?: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: Date;
}

// =====================================================
// Marketplace Types
// =====================================================

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  condition: ListingCondition;
  location?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  status: ListingStatus;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ListingStatus = 'available' | 'sold' | 'reserved';

// =====================================================
// Search Types
// =====================================================

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchQuery {
  q: string;
  type?: 'all' | 'users' | 'posts' | 'groups' | 'pages' | 'events' | 'hashtags';
  filters?: SearchFilters;
  sort?: 'relevance' | 'recent' | 'popular';
  page?: number;
  limit?: number;
}

export interface SearchFilters {
  dateRange?: { start: Date; end: Date };
  location?: string;
  authorId?: string;
}

// =====================================================
// Pagination Types
// =====================================================

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  cursor?: string;
}

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string | number;
  message: string;
  details?: any;
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationInfo;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// =====================================================
// Webhook Types
// =====================================================

export interface WebhookEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

// =====================================================
// File Types
// =====================================================

export interface FileUpload {
  id: string;
  userId: string;
  type: FileType;
  originalName: string;
  size: number;
  mimeType: string;
  bucket: string;
  key: string;
  url: string;
  variants?: Record<string, string>;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  createdAt: Date;
}

export type FileType = 'image' | 'video' | 'document' | 'avatar' | 'cover' | 'story' | 'reel';

// =====================================================
// Analytics Types
// =====================================================

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  properties: Record<string, any>;
  context: {
    device?: string;
    os?: string;
    browser?: string;
    referrer?: string;
    page?: string;
  };
}

export interface MetricsSummary {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalComments: number;
  totalMessages: number;
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}
