export interface User {
  id: string;
  email?: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  coverPhoto?: string | null;
  bio?: string | null;
  location?: string | null;
  workplace?: string | null;
  education?: string | null;
  relationshipStatus?: string | null;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  createdAt?: string;
  updatedAt?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string | null;
  friendCount?: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  settings?: UserSettings;
}

export interface UserProfile extends User {
  mutualFriends?: User[];
  isFriend?: boolean;
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  canViewProfile?: boolean;
}

export interface UserSettings {
  id: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  language: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  privacyLevel: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  profileVisibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
}

export interface FriendConnection {
  id: string;
  friend: User;
  createdAt: string;
  closeFriend: boolean;
}

export interface FriendSuggestion {
  id: string;
  user: User;
  mutualFriendCount: number;
  reason: string;
  score: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actor?: User;
  target?: NotificationTarget;
  actionUrl?: string;
}

export type NotificationType = 
  | 'LIKE'
  | 'COMMENT'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPT'
  | 'SHARE'
  | 'MENTION'
  | 'TAG'
  | 'BIRTHDAY'
  | 'EVENT'
  | 'GROUP_INVITE'
  | 'PAGE_INVITE'
  | 'REACTION'
  | 'FOLLOW'
  | 'SYSTEM';

export type NotificationTarget = 
  | { __typename: 'Post'; id: string; content?: string }
  | { __typename: 'Comment'; id: string; content?: string }
  | { __typename: 'User'; id: string; firstName: string; lastName: string };

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  workplace?: string;
  education?: string;
  relationshipStatus?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  avatar?: string;
  coverPhoto?: string;
}

export interface UserSettingsInput {
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  language?: string;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  privacyLevel?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  profileVisibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
}
