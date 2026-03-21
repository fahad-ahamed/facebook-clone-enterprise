// Story Service Types

export interface Story {
  id: string;
  userId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration?: number; // in seconds for video stories
  createdAt: Date;
  expiresAt: Date;
  viewCount: number;
  isExpired: boolean;
  privacy: StoryPrivacy;
  mentions?: string[];
  hashtags?: string[];
  location?: Location;
  music?: StoryMusic;
  stickers?: StorySticker[];
}

export interface StoryPrivacy {
  type: 'public' | 'friends' | 'close_friends' | 'custom';
  allowedUsers?: string[];
  blockedUsers?: string[];
}

export interface Location {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface StoryMusic {
  id: string;
  title: string;
  artist: string;
  startTime: number;
  duration: number;
}

export interface StorySticker {
  id: string;
  type: 'text' | 'emoji' | 'location' | 'mention' | 'hashtag' | 'poll' | 'question' | 'countdown' | 'slider';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
  content: string | PollContent | QuestionContent | CountdownContent | SliderContent;
}

export interface PollContent {
  question: string;
  options: string[];
  votes: { option: string; count: number }[];
  totalVotes: number;
}

export interface QuestionContent {
  question: string;
  responses: { userId: string; response: string; createdAt: Date }[];
}

export interface CountdownContent {
  title: string;
  targetTime: Date;
  subscribers: string[];
}

export interface SliderContent {
  question: string;
  emoji: string;
  averageRating: number;
  ratings: { userId: string; rating: number }[];
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewedAt: Date;
  reaction?: string;
}

export interface CreateStoryRequest {
  userId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration?: number;
  privacy?: StoryPrivacy;
  mentions?: string[];
  hashtags?: string[];
  location?: Location;
  music?: StoryMusic;
  stickers?: StorySticker[];
}

export interface GetStoriesRequest {
  userId?: string;
  viewerId: string;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetStoriesResponse {
  stories: Story[];
  hasMore: boolean;
  total: number;
}

export interface StoryFeedItem {
  userId: string;
  userName: string;
  userAvatar: string;
  hasUnviewedStories: boolean;
  stories: Story[];
}

export interface StoryExpirationJob {
  storyId: string;
  expiresAt: Date;
}

export class StoryError extends Error {
  constructor(
    message: string,
    public code: StoryErrorCode,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'StoryError';
  }
}

export enum StoryErrorCode {
  STORY_NOT_FOUND = 'STORY_NOT_FOUND',
  STORY_EXPIRED = 'STORY_EXPIRED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INVALID_MEDIA_TYPE = 'INVALID_MEDIA_TYPE',
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',
  PRIVACY_VIOLATION = 'PRIVACY_VIOLATION',
  DUPLICATE_STORY = 'DUPLICATE_STORY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_STICKER = 'INVALID_STICKER',
  VIEW_NOT_ALLOWED = 'VIEW_NOT_ALLOWED',
}
