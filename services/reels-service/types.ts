// Reels Service Types

export interface Reel {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  duration: number; // in seconds
  audio?: AudioTrack;
  mentions?: string[];
  hashtags?: string[];
  location?: Location;
  visibility: ReelVisibility;
  createdAt: Date;
  updatedAt: Date;
  metrics: ReelMetrics;
  settings: ReelSettings;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  source: 'library' | 'original' | 'imported';
  duration: number;
  previewUrl?: string;
  coverArt?: string;
  isrc?: string; // International Standard Recording Code
}

export interface Location {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface ReelMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
}

export interface ReelSettings {
  allowComments: boolean;
  allowDuets: boolean;
  allowRemix: boolean;
  allowStitch: boolean;
  hideViewCount: boolean;
  hideLikeCount: boolean;
  restrictDownloading: boolean;
}

export type ReelVisibility = 'public' | 'friends' | 'private';

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  parentId?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  replies?: ReelComment[];
}

export interface ReelLike {
  id: string;
  reelId: string;
  userId: string;
  createdAt: Date;
}

export interface ReelShare {
  id: string;
  reelId: string;
  userId: string;
  shareType: 'direct' | 'story' | 'external';
  sharedTo?: string;
  createdAt: Date;
}

export interface CreateReelRequest {
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  audio?: AudioTrack;
  mentions?: string[];
  hashtags?: string[];
  location?: Location;
  visibility?: ReelVisibility;
  settings?: Partial<ReelSettings>;
}

export interface GetReelsRequest {
  viewerId: string;
  limit?: number;
  offset?: number;
  userId?: string;
  hashtag?: string;
  audioId?: string;
  feedType?: 'for-you' | 'following' | 'trending';
}

export interface GetReelsResponse {
  reels: Reel[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface AudioLibraryItem {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverArt?: string;
  previewUrl: string;
  usageCount: number;
  isTrending: boolean;
  categories: string[];
}

export interface SearchAudioRequest {
  query?: string;
  category?: string;
  trending?: boolean;
  limit?: number;
  offset?: number;
}

export interface EngagementAction {
  type: 'like' | 'unlike' | 'comment' | 'share' | 'save';
  reelId: string;
  userId: string;
  data?: Record<string, unknown>;
}

export class ReelError extends Error {
  constructor(
    message: string,
    public code: ReelErrorCode,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ReelError';
  }
}

export enum ReelErrorCode {
  REEL_NOT_FOUND = 'REEL_NOT_FOUND',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INVALID_VIDEO = 'INVALID_VIDEO',
  VIDEO_TOO_LONG = 'VIDEO_TOO_LONG',
  VIDEO_TOO_SHORT = 'VIDEO_TOO_SHORT',
  AUDIO_NOT_FOUND = 'AUDIO_NOT_FOUND',
  AUDIO_COPYRIGHT = 'AUDIO_COPYRIGHT',
  COMMENT_DISABLED = 'COMMENT_DISABLED',
  SHARE_DISABLED = 'SHARE_DISABLED',
  DUET_DISABLED = 'DUET_DISABLED',
  REMIX_DISABLED = 'REMIX_DISABLED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
  COMMENT_NOT_FOUND = 'COMMENT_NOT_FOUND',
}

// Constants
export const REEL_CONSTANTS = {
  MIN_DURATION_SECONDS: 3,
  MAX_DURATION_SECONDS: 90,
  MAX_CAPTION_LENGTH: 2200,
  MAX_HASHTAGS: 30,
  MAX_MENTIONS: 20,
  MAX_COMMENTS_PER_DAY: 500,
  MAX_REELS_PER_DAY: 50,
  TRENDING_THRESHOLD_VIEWS: 10000,
  TRENDING_THRESHOLD_ENGAGEMENT: 0.1, // 10% engagement rate
};
