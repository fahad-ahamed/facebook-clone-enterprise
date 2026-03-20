/**
 * Shared Constants
 * Application-wide constants
 */

// HTTP Status Codes
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

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  INVALID_INPUT: 'Invalid input provided',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  INTERNAL_ERROR: 'An internal error occurred. Please try again',
  SESSION_EXPIRED: 'Your session has expired. Please login again',
  USER_NOT_FOUND: 'User not found',
  POST_NOT_FOUND: 'Post not found',
  ALREADY_FRIENDS: 'Already friends with this user',
  ALREADY_FOLLOWING: 'Already following this user',
  CANNOT_BLOCK_SELF: 'You cannot block yourself',
  CANNOT_FRIEND_SELF: 'You cannot send a friend request to yourself',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  FRIEND_REQUEST_SENT: 'Friend request sent successfully',
  FRIEND_REQUEST_ACCEPTED: 'Friend request accepted',
  FOLLOW_SUCCESS: 'Now following this user',
  POST_CREATED: 'Post created successfully',
  MESSAGE_SENT: 'Message sent successfully',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
} as const;

// Rate Limits
export const RATE_LIMITS = {
  LOGIN: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 per 15 min
  REGISTER: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 per hour
  POST_CREATE: { windowMs: 60 * 1000, max: 10 }, // 10 per min
  COMMENT_CREATE: { windowMs: 60 * 1000, max: 30 }, // 30 per min
  MESSAGE_SEND: { windowMs: 60 * 1000, max: 60 }, // 60 per min
  SEARCH: { windowMs: 60 * 1000, max: 30 }, // 30 per min
} as const;

// Token Expiration
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '7d',
  REFRESH_TOKEN: '30d',
  VERIFICATION_CODE: 10 * 60 * 1000, // 10 minutes
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
} as const;

// User Roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

// Post Visibility
export const POST_VISIBILITY = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  ONLY_ME: 'only_me',
  SPECIFIC_FRIENDS: 'specific_friends',
  FRIENDS_EXCEPT: 'friends_except',
} as const;

// Reaction Types
export const REACTION_TYPES = {
  LIKE: 'like',
  LOVE: 'love',
  HAHA: 'haha',
  WOW: 'wow',
  SAD: 'sad',
  ANGRY: 'angry',
  CARE: 'care',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  FRIEND_REQUEST: 'friend_request',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  POST_SHARE: 'post_share',
  MENTION: 'mention',
  TAG: 'tag',
  MESSAGE: 'message',
  GROUP_INVITE: 'group_invite',
  EVENT_REMINDER: 'event_reminder',
  BIRTHDAY: 'birthday',
  MEMORY: 'memory',
} as const;

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  VOICE: 'voice',
  FILE: 'file',
  STICKER: 'sticker',
  GIF: 'gif',
} as const;

// Story Duration
export const STORY_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Max lengths
export const MAX_LENGTHS = {
  USERNAME: 50,
  BIO: 150,
  POST_CONTENT: 5000,
  COMMENT_CONTENT: 1000,
  MESSAGE_CONTENT: 5000,
  GROUP_NAME: 100,
  GROUP_DESCRIPTION: 500,
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER_PREFIX: 'user:',
  POST_PREFIX: 'post:',
  FEED_PREFIX: 'feed:',
  SESSION_PREFIX: 'session:',
} as const;

// Event Names
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  TYPING: 'typing',
  MESSAGE: 'message',
  NOTIFICATION: 'notification',
  PRESENCE: 'presence',
} as const;
