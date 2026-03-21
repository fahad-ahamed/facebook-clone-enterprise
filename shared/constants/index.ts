/**
 * Shared Constants
 * Application-wide constants
 */

// =====================================================
// Application Constants
// =====================================================

export const APP_NAME = 'Facebook Clone';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'A full-featured social media platform clone';

// =====================================================
// API Constants
// =====================================================

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  
  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  
  // Content errors
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// =====================================================
// User Constants
// =====================================================

export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  DELETED: 'deleted',
} as const;

export const GENDER_OPTIONS = ['male', 'female', 'custom', 'prefer_not_to_say'] as const;

export const RELATIONSHIP_STATUS = [
  'single',
  'in_relationship',
  'engaged',
  'married',
  'separated',
  'divorced',
  'widowed',
  'complicated',
] as const;

// =====================================================
// Post Constants
// =====================================================

export const POST_VISIBILITY = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private',
} as const;

export const POST_MAX_LENGTH = 63206; // Facebook's limit
export const COMMENT_MAX_LENGTH = 8000;

export const REACTION_TYPES = {
  LIKE: 'like',
  LOVE: 'love',
  HAHA: 'haha',
  WOW: 'wow',
  SAD: 'sad',
  ANGRY: 'angry',
} as const;

export const REACTION_EMOJIS = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
} as const;

// =====================================================
// Group Constants
// =====================================================

export const GROUP_PRIVACY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  SECRET: 'secret',
} as const;

export const GROUP_ROLES = {
  CREATOR: 'creator',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const;

// =====================================================
// Chat Constants
// =====================================================

export const MESSAGE_MAX_LENGTH = 20000;
export const CONVERSATION_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
} as const;

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

// =====================================================
// Notification Constants
// =====================================================

export const NOTIFICATION_TYPES = {
  // Social
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  NEW_FOLLOWER: 'new_follower',
  
  // Engagement
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  COMMENT_REPLY: 'comment_reply',
  COMMENT_LIKE: 'comment_like',
  POST_SHARE: 'post_share',
  POST_MENTION: 'post_mention',
  COMMENT_MENTION: 'comment_mention',
  
  // Groups
  GROUP_INVITE: 'group_invite',
  GROUP_ACCEPTED: 'group_accepted',
  GROUP_POST: 'group_post',
  
  // Pages
  PAGE_LIKE: 'page_like',
  
  // Events
  EVENT_INVITE: 'event_invite',
  EVENT_REMINDER: 'event_reminder',
  
  // Messages
  NEW_MESSAGE: 'new_message',
  
  // System
  ACCOUNT_SECURITY: 'account_security',
  POLICY_VIOLATION: 'policy_violation',
  FEATURE_UPDATE: 'feature_update',
} as const;

// =====================================================
// File Upload Constants
// =====================================================

export const FILE_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
} as const;

export const MAX_FILE_SIZES = {
  IMAGE: 50 * 1024 * 1024,      // 50 MB
  VIDEO: 5 * 1024 * 1024 * 1024, // 5 GB
  DOCUMENT: 100 * 1024 * 1024,   // 100 MB
  AVATAR: 10 * 1024 * 1024,      // 10 MB
  COVER: 20 * 1024 * 1024,       // 20 MB
  STORY: 100 * 1024 * 1024,      // 100 MB
} as const;

export const ALLOWED_MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// =====================================================
// Rate Limiting Constants
// =====================================================

export const RATE_LIMITS = {
  // Auth endpoints
  LOGIN: { windowMs: 15 * 60 * 1000, max: 5 },      // 5 per 15 min
  REGISTER: { windowMs: 60 * 60 * 1000, max: 3 },   // 3 per hour
  FORGOT_PASSWORD: { windowMs: 60 * 60 * 1000, max: 3 },
  
  // Content creation
  CREATE_POST: { windowMs: 60 * 1000, max: 30 },    // 30 per min
  CREATE_COMMENT: { windowMs: 60 * 1000, max: 60 }, // 60 per min
  UPLOAD: { windowMs: 60 * 60 * 1000, max: 50 },    // 50 per hour
  
  // Chat
  SEND_MESSAGE: { windowMs: 60 * 1000, max: 100 },  // 100 per min
  
  // Search
  SEARCH: { windowMs: 60 * 1000, max: 60 },         // 60 per min
  
  // Default
  DEFAULT: { windowMs: 60 * 1000, max: 100 },       // 100 per min
} as const;

// =====================================================
// Cache TTL Constants (seconds)
// =====================================================

export const CACHE_TTL = {
  USER_PROFILE: 3600,           // 1 hour
  USER_FEED: 300,               // 5 minutes
  POST: 1800,                   // 30 minutes
  TRENDING: 600,                // 10 minutes
  SEARCH_RESULTS: 300,          // 5 minutes
  NOTIFICATION_COUNT: 60,       // 1 minute
  PRESENCE: 300,                // 5 minutes
  RATE_LIMIT: 900,              // 15 minutes
  SESSION: 86400,               // 1 day
} as const;

// =====================================================
// Pagination Constants
// =====================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  FEED_LIMIT: 25,
  COMMENTS_LIMIT: 50,
  MESSAGES_LIMIT: 50,
  SEARCH_LIMIT: 20,
} as const;

// =====================================================
// WebSocket Events
// =====================================================

export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Chat
  MESSAGE: 'chat:message',
  TYPING: 'chat:typing',
  READ: 'chat:read',
  
  // Presence
  PRESENCE_UPDATE: 'presence:update',
  
  // Notifications
  NOTIFICATION: 'notification:new',
  
  // Feed
  FEED_UPDATE: 'feed:update',
  REACTION: 'feed:reaction',
  
  // Live Stream
  STREAM_START: 'stream:start',
  STREAM_END: 'stream:end',
  STREAM_COMMENT: 'stream:comment',
  STREAM_REACTION: 'stream:reaction',
} as const;

// =====================================================
// Feature Flags
// =====================================================

export const FEATURES = {
  STORIES: true,
  REELS: true,
  LIVE_STREAMING: true,
  MARKETPLACE: true,
  GROUPS: true,
  PAGES: true,
  EVENTS: true,
  GAMING: false,
  JOBS: false,
  DATING: false,
} as const;

export default {
  APP_NAME,
  APP_VERSION,
  API_VERSION,
  API_PREFIX,
  HTTP_STATUS,
  ERROR_CODES,
  USER_ROLES,
  USER_STATUS,
  POST_VISIBILITY,
  POST_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  REACTION_TYPES,
  GROUP_PRIVACY,
  GROUP_ROLES,
  MESSAGE_MAX_LENGTH,
  NOTIFICATION_TYPES,
  FILE_TYPES,
  MAX_FILE_SIZES,
  RATE_LIMITS,
  CACHE_TTL,
  PAGINATION,
  WS_EVENTS,
  FEATURES,
};
