/**
 * Shared Types
 * TypeScript type definitions used across services
 */

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'custom';
  phone?: string;
  currentCity?: string;
  hometown?: string;
  workplace?: string;
  education?: string;
  relationshipStatus?: string;
  country?: string;
  isVerified: boolean;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Post Types
export interface Post {
  id: string;
  authorId: string;
  author: User;
  content?: string;
  mediaType?: 'image' | 'video' | 'gif';
  mediaUrl?: string;
  mediaUrls?: string[];
  postType: 'status' | 'photo' | 'video' | 'link' | 'check_in';
  visibility: 'public' | 'friends' | 'only_me' | 'specific_friends';
  feeling?: { emoji: string; text: string };
  location?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: Date;
  updatedAt: Date;
  userReaction?: string | null;
  comments?: Comment[];
  reactions?: Reaction[];
}

// Comment Types
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  parentId?: string;
  content: string;
  mediaUrl?: string;
  likeCount: number;
  replyCount: number;
  createdAt: Date;
  replies?: Comment[];
}

// Reaction Types
export interface Reaction {
  id: string;
  userId: string;
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care';
  postId?: string;
  commentId?: string;
  createdAt: Date;
}

// Friend Types
export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  sender: User;
  receiverId: string;
  receiver: User;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: Date;
}

// Follow Types
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

// Chat Types
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content?: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker' | 'gif';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveredAt?: Date;
  readAt?: Date;
  isRead: boolean;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title?: string;
  message: string;
  image?: string;
  actor?: User;
  relatedType?: string;
  relatedId?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

// Group Types
export interface Group {
  id: string;
  name: string;
  description?: string;
  coverPhoto?: string;
  avatar?: string;
  type: 'public' | 'private' | 'secret';
  memberCount: number;
  postCount: number;
  createdBy: User;
  createdAt: Date;
  isMember?: boolean;
  isAdmin?: boolean;
}

// Page Types
export interface Page {
  id: string;
  name: string;
  username?: string;
  description?: string;
  avatar?: string;
  coverPhoto?: string;
  category: string;
  likeCount: number;
  followerCount: number;
  isVerified: boolean;
  createdAt: Date;
  isLiked?: boolean;
  isAdmin?: boolean;
}

// Event Types
export interface Event {
  id: string;
  title: string;
  description?: string;
  coverPhoto?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  isOnline: boolean;
  onlineUrl?: string;
  host: User;
  goingCount: number;
  interestedCount: number;
  visibility: 'public' | 'private';
  createdAt: Date;
  isGoing?: boolean;
  isInterested?: boolean;
}

// Story Types
export interface Story {
  id: string;
  userId: string;
  user: User;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string;
  viewCount: number;
  reactionCount: number;
  createdAt: Date;
  expiresAt: Date;
  isViewed?: boolean;
}

// Reel Types
export interface Reel {
  id: string;
  userId: string;
  author: User;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  audio?: string;
  duration?: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: Date;
}

// Marketplace Types
export interface MarketplaceListing {
  id: string;
  sellerId: string;
  seller: User;
  title: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  condition: 'new' | 'like_new' | 'used' | 'fair';
  images: string[];
  location: string;
  status: 'available' | 'pending' | 'sold';
  viewCount: number;
  saveCount: number;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role?: string;
}

// Search Types
export interface SearchResult {
  type: 'user' | 'post' | 'group' | 'page' | 'event';
  id: string;
  score: number;
  data: unknown;
}

// Analytics Types
export interface AnalyticsEvent {
  type: string;
  userId?: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}
