// App configuration
// NOTE: changed some defaults based on user feedback

export const APP_CONFIG = {
  // Pagination
  POSTS_PER_PAGE: 10,
  COMMENTS_PER_POST: 3,
  MESSAGES_PER_PAGE: 50,
  
  // File uploads
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
  
  // Story settings
  STORY_DURATION_HOURS: 24,
  STORY_PROGRESS_INTERVAL: 50, // ms
  
  // Chat settings
  TYPING_INDICATOR_TIMEOUT: 3000,
  MESSAGE_STATUS_UPDATE_INTERVAL: 5000,
  
  // Cache settings
  CACHE_DURATION_MINUTES: 5,
  
  // Theme
  DEFAULT_THEME: 'light',
  THEME_STORAGE_KEY: 'fb-theme',
  
  // Auth
  TOKEN_EXPIRY_DAYS: 7,
  VERIFICATION_CODE_EXPIRY_MINUTES: 10,
  PASSWORD_MIN_LENGTH: 8,
  
  // API endpoints (for reference)
  API_BASE: '/api',
} as const;

// Some default avatars we use
export const DEFAULT_AVATARS = {
  male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
  default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
};

// Navigation items
export const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'friends', label: 'Friends', icon: 'users' },
  { id: 'marketplace', label: 'Marketplace', icon: 'shopping-bag' },
  { id: 'groups', label: 'Groups', icon: 'users-round' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad' },
];

// Marketplace categories
export const MARKETPLACE_CATEGORIES = [
  'Vehicles',
  'Electronics',
  'Furniture',
  'Clothing',
  'Home & Garden',
  'Sports & Outdoors',
  'Toys & Games',
  'Books & Media',
  'Other',
];

// Group types
export const GROUP_TYPES = [
  { value: 'public', label: 'Public', description: 'Anyone can see and join' },
  { value: 'private', label: 'Private', description: 'Anyone can find, but only members can see posts' },
  { value: 'secret', label: 'Secret', description: 'Only invited people can find and join' },
];

// Event categories
export const EVENT_CATEGORIES = [
  'Music',
  'Sports',
  'Business',
  'Food & Drink',
  'Community',
  'Arts',
  'Education',
  'Other',
];
