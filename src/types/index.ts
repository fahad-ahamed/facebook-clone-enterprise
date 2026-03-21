// Types for the whole app
// TODO: maybe split this into separate files later?

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  currentCity?: string;
  hometown?: string;
  workplace?: string;
  education?: string;
  relationshipStatus?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  isVerified: boolean;
  isOnline: boolean;
  isProfileLocked?: boolean;
  badgeType?: string | null;
  friendCount?: number;
  followerCount?: number;
  followingCount?: number;
  username?: string;
}

export interface Post {
  id: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  postType: string;
  visibility: string;
  feeling?: string;
  location?: string;
  likeCount: number;
  loveCount?: number;
  hahaCount?: number;
  wowCount?: number;
  sadCount?: number;
  angryCount?: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  author: User;
  userReaction?: string | null;
  isSaved?: boolean;
  comments: Comment[];
  reactions?: { type: string; userId: string }[];
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: string;
  likeCount: number;
}

export interface Story {
  id: string;
  user: User;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
  isViewed?: boolean;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  image?: string;
  isRead: boolean;
  createdAt: string;
  actor?: User;
}

export interface Chat {
  id: string;
  user: User;
  lastMessage: { content: string; createdAt: string; isRead: boolean };
  unreadCount: number;
  messages: Message[];
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
  mediaUrl?: string;
  mediaType?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'document' | 'sticker' | 'gif';
  fileName?: string;
  fileSize?: number;
  voiceDuration?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveredAt?: string;
  readAt?: string;
  isEncrypted?: boolean;
}

export interface FriendRequest {
  id: string;
  user: User;
  mutualFriends: number;
}

// Reaction types
export const REACTIONS = [
  { type: 'like', icon: '👍', label: 'Like', color: '#1877F2' },
  { type: 'love', icon: '❤️', label: 'Love', color: '#F33E58' },
  { type: 'haha', icon: '😂', label: 'Haha', color: '#F7B928' },
  { type: 'wow', icon: '😮', label: 'Wow', color: '#F7B928' },
  { type: 'sad', icon: '😢', label: 'Sad', color: '#F7B928' },
  { type: 'angry', icon: '😡', label: 'Angry', color: '#E9710F' },
] as const;

// Feeling options
export const FEELINGS = [
  { emoji: '😊', label: 'feeling happy' },
  { emoji: '😢', label: 'feeling sad' },
  { emoji: '😍', label: 'feeling loved' },
  { emoji: '🎉', label: 'celebrating' },
  { emoji: '😎', label: 'feeling cool' },
  { emoji: '🙏', label: 'feeling blessed' },
  { emoji: '🥳', label: 'feeling excited' },
] as const;

// Countries list
export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 
  'Belgium', 'Brazil', 'Canada', 'China', 'Colombia', 'Egypt', 'France', 'Germany', 
  'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Italy', 'Japan', 'Kenya', 'Malaysia', 
  'Mexico', 'Morocco', 'Netherlands', 'Nigeria', 'Pakistan', 'Philippines', 'Poland', 
  'Portugal', 'Russia', 'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 
  'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 
  'United Kingdom', 'United States', 'Vietnam'
].sort();

// Post visibility options
export const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: 'globe', description: 'Anyone can see this post' },
  { value: 'friends', label: 'Friends', icon: 'users', description: 'Your friends can see this post' },
  { value: 'friends_except', label: 'Friends except...', icon: 'users-round', description: 'Don\'t show to some friends' },
  { value: 'specific_friends', label: 'Specific friends', icon: 'user-check', description: 'Only show to select friends' },
  { value: 'private', label: 'Only me', icon: 'lock', description: 'Only you can see this post' },
] as const;

// Group types
export interface Group {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  privacy: 'public' | 'private';
  memberCount: number;
  isAdmin?: boolean;
  isMember?: boolean;
  createdAt: string;
  createdBy: User;
}

// Event types
export interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  host: User;
  goingCount: number;
  interestedCount: number;
  isGoing?: boolean;
  isInterested?: boolean;
  createdAt: string;
}

// Marketplace listing types
export interface MarketplaceListing {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  condition: 'new' | 'used' | 'refurbished';
  category: string;
  images: string[];
  location: string;
  seller: User;
  isAvailable: boolean;
  createdAt: string;
}

// Reel types
export interface Reel {
  id: string;
  videoUrl: string;
  caption?: string;
  audioTitle?: string;
  audioArtist?: string;
  author: User;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
}

// Page types (for Facebook Pages)
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
  isLiked?: boolean;
  isAdmin?: boolean;
  createdAt: string;
}

// Conversation types (extended)
export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}
