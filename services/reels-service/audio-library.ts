// Audio Library Module for Reels

import { v4 as uuidv4 } from 'uuid';
import {
  AudioTrack,
  AudioLibraryItem,
  SearchAudioRequest,
} from './types';

interface AudioRepository {
  create(audio: AudioLibraryItem): Promise<AudioLibraryItem>;
  findById(audioId: string): Promise<AudioLibraryItem | null>;
  search(query: string, limit: number, offset: number): Promise<AudioLibraryItem[]>;
  findByCategory(category: string, limit: number, offset: number): Promise<AudioLibraryItem[]>;
  findTrending(limit: number): Promise<AudioLibraryItem[]>;
  incrementUsage(audioId: string): Promise<void>;
  count(): Promise<number>;
}

interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

interface StorageService {
  uploadAudio(file: Buffer, filename: string): Promise<string>;
  getAudioUrl(key: string): Promise<string>;
  deleteAudio(key: string): Promise<void>;
}

interface CopyrightService {
  checkCopyright(isrc: string): Promise<{
    isAllowed: boolean;
    restrictions?: {
      region?: string[];
      duration?: number;
      commercial?: boolean;
    };
  }>;
  getLicenseInfo(isrc: string): Promise<{
    type: string;
    holder: string;
    validFrom: Date;
    validTo: Date;
  }>;
}

interface AnalyticsService {
  trackAudioUsage(audioId: string, reelId: string, userId: string): Promise<void>;
  getAudioTrending(): Promise<{ audioId: string; score: number }[]>;
}

export interface AudioSearchResult {
  items: AudioLibraryItem[];
  total: number;
  hasMore: boolean;
}

export interface AudioUploadRequest {
  title: string;
  artist: string;
  duration: number;
  file: Buffer;
  coverArt?: Buffer;
  categories?: string[];
  isrc?: string;
}

export class AudioLibraryService {
  constructor(
    private audioRepo: AudioRepository,
    private cacheService: CacheService,
    private storageService: StorageService,
    private copyrightService: CopyrightService,
    private analyticsService: AnalyticsService
  ) {}

  /**
   * Search the audio library
   */
  async searchAudio(request: SearchAudioRequest): Promise<AudioSearchResult> {
    const limit = request.limit || 20;
    const offset = request.offset || 0;

    const cacheKey = `audio:search:${request.query || 'all'}:${request.category || 'all'}:${offset}:${limit}`;
    const cached = await this.cacheService.get<AudioSearchResult>(cacheKey);
    
    if (cached) {
      return cached;
    }

    let items: AudioLibraryItem[];

    if (request.trending) {
      items = await this.audioRepo.findTrending(limit);
    } else if (request.category) {
      items = await this.audioRepo.findByCategory(request.category, limit, offset);
    } else if (request.query) {
      items = await this.audioRepo.search(request.query, limit, offset);
    } else {
      items = await this.audioRepo.findTrending(limit);
    }

    const result: AudioSearchResult = {
      items,
      total: items.length,
      hasMore: items.length === limit,
    };

    await this.cacheService.set(cacheKey, result, 60); // 1 minute cache
    
    return result;
  }

  /**
   * Get audio by ID
   */
  async getAudio(audioId: string): Promise<AudioLibraryItem> {
    const cacheKey = `audio:${audioId}`;
    const cached = await this.cacheService.get<AudioLibraryItem>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const audio = await this.audioRepo.findById(audioId);
    if (!audio) {
      throw new Error('Audio not found');
    }

    await this.cacheService.set(cacheKey, audio, 300); // 5 minute cache
    
    return audio;
  }

  /**
   * Get trending audio
   */
  async getTrending(limit: number = 20): Promise<AudioLibraryItem[]> {
    const cacheKey = `audio:trending:${limit}`;
    const cached = await this.cacheService.get<AudioLibraryItem[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const trending = await this.audioRepo.findTrending(limit);
    await this.cacheService.set(cacheKey, trending, 300); // 5 minute cache
    
    return trending;
  }

  /**
   * Upload original audio (user-created)
   */
  async uploadOriginalAudio(request: AudioUploadRequest): Promise<AudioLibraryItem> {
    // Upload audio file
    const filename = `${uuidv4()}.mp3`;
    const audioUrl = await this.storageService.uploadAudio(request.file, filename);

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (request.coverArt) {
      const coverFilename = `${uuidv4()}.jpg`;
      coverArtUrl = await this.storageService.uploadAudio(request.coverArt, coverFilename);
    }

    const audio: AudioLibraryItem = {
      id: uuidv4(),
      title: request.title,
      artist: request.artist,
      duration: request.duration,
      coverArt: coverArtUrl,
      previewUrl: audioUrl,
      usageCount: 0,
      isTrending: false,
      categories: request.categories || [],
    };

    const created = await this.audioRepo.create(audio);
    await this.cacheService.invalidate('audio:*');

    return created;
  }

  /**
   * Import audio from external source (with copyright check)
   */
  async importAudio(
    isrc: string,
    title: string,
    artist: string,
    previewUrl: string
  ): Promise<AudioLibraryItem> {
    // Check copyright
    const copyrightCheck = await this.copyrightService.checkCopyright(isrc);
    if (!copyrightCheck.isAllowed) {
      throw new Error('Audio has copyright restrictions');
    }

    const audio: AudioLibraryItem = {
      id: uuidv4(),
      title,
      artist,
      duration: 0, // Would be fetched from metadata
      previewUrl,
      usageCount: 0,
      isTrending: false,
      categories: [],
    };

    const created = await this.audioRepo.create(audio);
    return created;
  }

  /**
   * Record audio usage in a reel
   */
  async recordUsage(audioId: string, reelId: string, userId: string): Promise<void> {
    await this.audioRepo.incrementUsage(audioId);
    await this.analyticsService.trackAudioUsage(audioId, reelId, userId);
    await this.cacheService.invalidate(`audio:${audioId}`);
  }

  /**
   * Get audio categories
   */
  async getCategories(): Promise<{ id: string; name: string; count: number }[]> {
    const cacheKey = 'audio:categories';
    const cached = await this.cacheService.get<{ id: string; name: string; count: number }[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const categories = [
      { id: 'pop', name: 'Pop', count: 0 },
      { id: 'hiphop', name: 'Hip Hop', count: 0 },
      { id: 'rock', name: 'Rock', count: 0 },
      { id: 'electronic', name: 'Electronic', count: 0 },
      { id: 'rnb', name: 'R&B', count: 0 },
      { id: 'country', name: 'Country', count: 0 },
      { id: 'classical', name: 'Classical', count: 0 },
      { id: 'jazz', name: 'Jazz', count: 0 },
      { id: 'indie', name: 'Indie', count: 0 },
      { id: 'original', name: 'Original Sounds', count: 0 },
    ];

    await this.cacheService.set(cacheKey, categories, 3600); // 1 hour cache
    
    return categories;
  }

  /**
   * Check if user can use audio
   */
  async checkUsageRights(audioId: string, userId: string): Promise<{
    canUse: boolean;
    restrictions?: string[];
  }> {
    const audio = await this.audioRepo.findById(audioId);
    if (!audio) {
      return { canUse: false, restrictions: ['Audio not found'] };
    }

    // Check copyright if ISRC exists
    if (audio.isrc) {
      const copyrightCheck = await this.copyrightService.checkCopyright(audio.isrc);
      if (!copyrightCheck.isAllowed) {
        return {
          canUse: false,
          restrictions: copyrightCheck.restrictions ? 
            Object.entries(copyrightCheck.restrictions)
              .filter(([, v]) => v)
              .map(([k]) => k) : [],
        };
      }
    }

    return { canUse: true };
  }

  /**
   * Get audio statistics
   */
  async getAudioStats(audioId: string): Promise<{
    usageCount: number;
    reelsCount: number;
    trending: boolean;
  }> {
    const audio = await this.audioRepo.findById(audioId);
    if (!audio) {
      throw new Error('Audio not found');
    }

    return {
      usageCount: audio.usageCount,
      reelsCount: audio.usageCount, // Same for now
      trending: audio.isTrending,
    };
  }
}

// Sound Collections (Curated playlists)
export class SoundCollectionsService {
  constructor(
    private audioRepo: AudioRepository,
    private cacheService: CacheService
  ) {}

  async getFeaturedCollections(): Promise<{
    id: string;
    name: string;
    description: string;
    coverUrl: string;
    audioCount: number;
  }[]> {
    const cacheKey = 'audio:collections:featured';
    const cached = await this.cacheService.get<{
      id: string;
      name: string;
      description: string;
      coverUrl: string;
      audioCount: number;
    }[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const collections = [
      {
        id: 'viral-hits',
        name: 'Viral Hits',
        description: 'The most used sounds on Reels right now',
        coverUrl: '',
        audioCount: 50,
      },
      {
        id: 'new-releases',
        name: 'New Releases',
        description: 'Fresh tracks from trending artists',
        coverUrl: '',
        audioCount: 30,
      },
      {
        id: 'throwbacks',
        name: 'Throwbacks',
        description: 'Classic hits that never get old',
        coverUrl: '',
        audioCount: 40,
      },
    ];

    await this.cacheService.set(cacheKey, collections, 3600);
    
    return collections;
  }

  async getCollectionAudio(
    collectionId: string,
    limit: number = 20
  ): Promise<AudioLibraryItem[]> {
    // In a real implementation, this would fetch from a curated collection
    return this.audioRepo.findTrending(limit);
  }
}

// API Handlers
export async function searchAudioHandler(
  request: SearchAudioRequest,
  dependencies: {
    audioRepo: AudioRepository;
    cacheService: CacheService;
    storageService: StorageService;
    copyrightService: CopyrightService;
    analyticsService: AnalyticsService;
  }
): Promise<AudioSearchResult> {
  const service = new AudioLibraryService(
    dependencies.audioRepo,
    dependencies.cacheService,
    dependencies.storageService,
    dependencies.copyrightService,
    dependencies.analyticsService
  );
  return service.searchAudio(request);
}

export async function getAudioHandler(
  audioId: string,
  dependencies: {
    audioRepo: AudioRepository;
    cacheService: CacheService;
    storageService: StorageService;
    copyrightService: CopyrightService;
    analyticsService: AnalyticsService;
  }
): Promise<AudioLibraryItem> {
  const service = new AudioLibraryService(
    dependencies.audioRepo,
    dependencies.cacheService,
    dependencies.storageService,
    dependencies.copyrightService,
    dependencies.analyticsService
  );
  return service.getAudio(audioId);
}
