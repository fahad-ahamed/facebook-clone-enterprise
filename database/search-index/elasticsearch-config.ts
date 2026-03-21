/**
 * Elasticsearch Configuration and Mappings
 * Search index schemas for all content types
 */

// =====================================================
// Index Configuration
// =====================================================

export const INDEX_SETTINGS = {
  number_of_shards: 3,
  number_of_replicas: 1,
  analysis: {
    analyzer: {
      default: {
        type: 'standard',
        stopwords: '_english_',
      },
      ngram_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'ngram_filter'],
      },
      edge_ngram_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'edge_ngram_filter'],
      },
    },
    filter: {
      ngram_filter: {
        type: 'ngram',
        min_gram: 2,
        max_gram: 3,
      },
      edge_ngram_filter: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 20,
      },
    },
  },
};

// =====================================================
// User Index Mapping
// =====================================================

export const USER_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    username: {
      type: 'text',
      analyzer: 'edge_ngram_analyzer',
      search_analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    fullName: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    email: { type: 'keyword' },
    bio: { type: 'text' },
    location: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    avatarUrl: { type: 'keyword', index: false },
    isVerified: { type: 'boolean' },
    followerCount: { type: 'integer' },
    createdAt: { type: 'date' },
    lastActiveAt: { type: 'date' },
    // Completion suggester for autocomplete
    suggest: {
      type: 'completion',
      analyzer: 'simple',
      search_analyzer: 'simple',
    },
  },
};

// =====================================================
// Post Index Mapping
// =====================================================

export const POST_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    content: {
      type: 'text',
      analyzer: 'standard',
    },
    authorId: { type: 'keyword' },
    authorName: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    authorUsername: { type: 'keyword' },
    visibility: { type: 'keyword' },
    type: { type: 'keyword' }, // text, image, video
    tags: { type: 'keyword' },
    hashtags: { type: 'keyword' },
    mentions: { type: 'keyword' },
    mediaUrls: { type: 'keyword', index: false },
    location: {
      type: 'text',
      fields: { keyword: { type: 'keyword' } },
    },
    // Geolocation for location-based search
    geoLocation: { type: 'geo_point' },
    groupId: { type: 'keyword' },
    pageId: { type: 'keyword' },
    likeCount: { type: 'integer' },
    commentCount: { type: 'integer' },
    shareCount: { type: 'integer' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    // For ranking
    popularityScore: { type: 'float' },
  },
};

// =====================================================
// Group Index Mapping
// =====================================================

export const GROUP_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'edge_ngram_analyzer',
      search_analyzer: 'standard',
      fields: { keyword: { type: 'keyword' } },
    },
    description: { type: 'text' },
    coverUrl: { type: 'keyword', index: false },
    privacy: { type: 'keyword' },
    category: { type: 'keyword' },
    memberCount: { type: 'integer' },
    postCount: { type: 'integer' },
    createdBy: { type: 'keyword' },
    createdAt: { type: 'date' },
    suggest: {
      type: 'completion',
      analyzer: 'simple',
    },
  },
};

// =====================================================
// Page Index Mapping
// =====================================================

export const PAGE_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'edge_ngram_analyzer',
      search_analyzer: 'standard',
      fields: { keyword: { type: 'keyword' } },
    },
    username: { type: 'keyword' },
    description: { type: 'text' },
    category: { type: 'keyword' },
    avatarUrl: { type: 'keyword', index: false },
    coverUrl: { type: 'keyword', index: false },
    isVerified: { type: 'boolean' },
    followerCount: { type: 'integer' },
    createdBy: { type: 'keyword' },
    createdAt: { type: 'date' },
    suggest: {
      type: 'completion',
      analyzer: 'simple',
    },
  },
};

// =====================================================
// Event Index Mapping
// =====================================================

export const EVENT_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'edge_ngram_analyzer',
      search_analyzer: 'standard',
    },
    description: { type: 'text' },
    coverUrl: { type: 'keyword', index: false },
    startTime: { type: 'date' },
    endTime: { type: 'date' },
    location: { type: 'text' },
    geoLocation: { type: 'geo_point' },
    isOnline: { type: 'boolean' },
    onlineUrl: { type: 'keyword' },
    privacy: { type: 'keyword' },
    goingCount: { type: 'integer' },
    interestedCount: { type: 'integer' },
    createdBy: { type: 'keyword' },
    groupId: { type: 'keyword' },
    createdAt: { type: 'date' },
    suggest: {
      type: 'completion',
      analyzer: 'simple',
    },
  },
};

// =====================================================
// Hashtag Index Mapping
// =====================================================

export const HASHTAG_INDEX_MAPPING = {
  properties: {
    tag: { type: 'keyword' },
    count: { type: 'integer' },
    trendingScore: { type: 'float' },
    firstUsed: { type: 'date' },
    lastUsed: { type: 'date' },
    // For autocomplete
    suggest: {
      type: 'completion',
      analyzer: 'simple',
    },
  },
};

// =====================================================
// Marketplace Index Mapping
// =====================================================

export const MARKETPLACE_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    title: {
      type: 'text',
      analyzer: 'edge_ngram_analyzer',
      search_analyzer: 'standard',
    },
    description: { type: 'text' },
    price: { type: 'float' },
    currency: { type: 'keyword' },
    category: { type: 'keyword' },
    condition: { type: 'keyword' },
    status: { type: 'keyword' },
    images: { type: 'keyword', index: false },
    location: { type: 'text' },
    geoLocation: { type: 'geo_point' },
    sellerId: { type: 'keyword' },
    sellerName: { type: 'text' },
    viewCount: { type: 'integer' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
  },
};

// =====================================================
// Search Queries
// =====================================================

/**
 * Multi-match search query
 */
export const createMultiMatchQuery = (query: string, fields: string[], boost: Record<string, number> = {}) => {
  return {
    multi_match: {
      query,
      fields: fields.map(f => boost[f] ? `${f}^${boost[f]}` : f),
      type: 'best_fields',
      fuzziness: 'AUTO',
    },
  };
};

/**
 * Autocomplete query
 */
export const createAutocompleteQuery = (query: string, index: string) => {
  return {
    suggest: {
      autocomplete: {
        prefix: query,
        completion: {
          field: 'suggest',
          size: 10,
          fuzzy: {
            fuzziness: 1,
          },
        },
      },
    },
  };
};

/**
 * Geo-distance filter
 */
export const createGeoDistanceFilter = (lat: number, lon: number, distance: string) => {
  return {
    geo_distance: {
      distance,
      geoLocation: { lat, lon },
    },
  };
};

/**
 * Range filter for dates
 */
export const createDateRangeFilter = (field: string, gte?: Date, lte?: Date) => {
  const range: any = {};
  if (gte) range.gte = gte;
  if (lte) range.lte = lte;
  return { range: { [field]: range } };
};

/**
 * Combined search query
 */
export const createSearchQuery = (
  query: string,
  options: {
    types?: string[];
    filters?: any[];
    sort?: any;
    from?: number;
    size?: number;
  } = {}
) => {
  const must: any[] = [];
  const filter: any[] = options.filters || [];

  if (query) {
    must.push({
      bool: {
        should: [
          createMultiMatchQuery(query, ['name^2', 'title^2', 'content', 'description', 'username', 'fullName']),
        ],
        minimum_should_match: 1,
      },
    });
  }

  return {
    query: {
      bool: {
        must,
        filter,
      },
    },
    from: options.from || 0,
    size: options.size || 20,
    sort: options.sort || [
      { _score: 'desc' },
      { createdAt: 'desc' },
    ],
  };
};

// =====================================================
// Index Creation Commands
// =====================================================

export const CREATE_INDICES = {
  users: {
    index: 'users',
    body: {
      settings: INDEX_SETTINGS,
      mappings: USER_INDEX_MAPPING,
    },
  },
  posts: {
    index: 'posts',
    body: {
      settings: INDEX_SETTINGS,
      mappings: POST_INDEX_MAPPING,
    },
  },
  groups: {
    index: 'groups',
    body: {
      settings: INDEX_SETTINGS,
      mappings: GROUP_INDEX_MAPPING,
    },
  },
  pages: {
    index: 'pages',
    body: {
      settings: INDEX_SETTINGS,
      mappings: PAGE_INDEX_MAPPING,
    },
  },
  events: {
    index: 'events',
    body: {
      settings: INDEX_SETTINGS,
      mappings: EVENT_INDEX_MAPPING,
    },
  },
  hashtags: {
    index: 'hashtags',
    body: {
      settings: INDEX_SETTINGS,
      mappings: HASHTAG_INDEX_MAPPING,
    },
  },
  marketplace: {
    index: 'marketplace',
    body: {
      settings: INDEX_SETTINGS,
      mappings: MARKETPLACE_INDEX_MAPPING,
    },
  },
};

export default {
  INDEX_SETTINGS,
  USER_INDEX_MAPPING,
  POST_INDEX_MAPPING,
  GROUP_INDEX_MAPPING,
  PAGE_INDEX_MAPPING,
  EVENT_INDEX_MAPPING,
  HASHTAG_INDEX_MAPPING,
  MARKETPLACE_INDEX_MAPPING,
  createMultiMatchQuery,
  createAutocompleteQuery,
  createGeoDistanceFilter,
  createDateRangeFilter,
  createSearchQuery,
  CREATE_INDICES,
};
