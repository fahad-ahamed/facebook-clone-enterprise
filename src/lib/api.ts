// API helper functions for Facebook clone

const API_BASE = '/api';

// Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  currentCity?: string;
  hometown?: string;
  workplace?: string;
  education?: string;
  relationshipStatus?: string;
  isVerified: boolean;
  isOnline: boolean;
  showOnlineStatus?: boolean;
  profileVisibility?: string;
  allowFriendRequests?: boolean;
  allowMessageRequests?: boolean;
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
  commentCount: number;
  shareCount: number;
  createdAt: string;
  author: User;
  userReaction?: string | null;
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

export interface Notification {
  id: string;
  type: string;
  message: string;
  image?: string;
  isRead: boolean;
  createdAt: string;
  actor?: User;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
  mediaUrl?: string;
  messageType?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  otherUser?: User;
  members?: User[];
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount: number;
  messages: Message[];
  muted?: boolean;
}

export interface FriendRequest {
  id: string;
  user: User;
  mutualFriends: number;
}

export interface Story {
  id: string;
  user: User;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  isViewed?: boolean;
  viewCount?: number;
}

export interface Reel {
  id: string;
  user: User;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration?: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  coverPhoto?: string;
  type: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
}

export interface Page {
  id: string;
  name: string;
  username?: string;
  description?: string;
  avatar?: string;
  coverPhoto?: string;
  pageType: string;
  likeCount: number;
  followerCount: number;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  coverPhoto?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isOnline: boolean;
  goingCount: number;
  interestedCount: number;
  createdAt: string;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  condition: string;
  images: string[];
  location: string;
  status: string;
  seller: User;
  createdAt: string;
}

// Auth APIs
export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function register(data: { email: string; password: string; firstName: string; lastName: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function logout() {
  const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  return res.json();
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`);
  return res.json();
}

// Posts APIs
export async function getPosts(params?: { page?: number; limit?: number; authorId?: string; groupId?: string; pageId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.authorId) searchParams.set('authorId', params.authorId);
  if (params?.groupId) searchParams.set('groupId', params.groupId);
  if (params?.pageId) searchParams.set('pageId', params.pageId);
  
  const res = await fetch(`${API_BASE}/posts?${searchParams}`);
  return res.json();
}

export async function createPost(data: {
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaUrls?: string[];
  postType?: string;
  visibility?: string;
  feeling?: string;
  activity?: string;
  location?: string;
  taggedUsers?: string[];
  groupId?: string;
  pageId?: string;
  linkUrl?: string;
  backgroundColor?: string;
}) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function reactToPost(postId: string, type: string) {
  const res = await fetch(`${API_BASE}/posts/${postId}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  return res.json();
}

export async function commentOnPost(postId: string, content: string, mediaUrl?: string) {
  const res = await fetch(`${API_BASE}/posts/${postId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, mediaUrl }),
  });
  return res.json();
}

export async function deletePost(postId: string) {
  const res = await fetch(`${API_BASE}/posts/${postId}`, { method: 'DELETE' });
  return res.json();
}

// Friends APIs
export async function getFriends(type: 'friends' | 'requests' | 'sent' | 'suggestions' = 'friends', userId?: string) {
  const params = new URLSearchParams({ type });
  if (userId) params.set('userId', userId);
  const res = await fetch(`${API_BASE}/friends?${params}`);
  return res.json();
}

export async function sendFriendRequest(receiverId: string) {
  const res = await fetch(`${API_BASE}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverId, action: 'send' }),
  });
  return res.json();
}

export async function acceptFriendRequest(receiverId: string) {
  const res = await fetch(`${API_BASE}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverId, action: 'accept' }),
  });
  return res.json();
}

export async function rejectFriendRequest(receiverId: string) {
  const res = await fetch(`${API_BASE}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverId, action: 'reject' }),
  });
  return res.json();
}

export async function cancelFriendRequest(receiverId: string) {
  const res = await fetch(`${API_BASE}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverId, action: 'cancel' }),
  });
  return res.json();
}

export async function unfriendUser(receiverId: string) {
  const res = await fetch(`${API_BASE}/friends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverId, action: 'unfriend' }),
  });
  return res.json();
}

// Follow APIs
export async function getFollowers(userId?: string, page?: number) {
  const params = new URLSearchParams({ type: 'followers' });
  if (userId) params.set('userId', userId);
  if (page) params.set('page', page.toString());
  const res = await fetch(`${API_BASE}/follow?${params}`);
  return res.json();
}

export async function getFollowing(userId?: string, page?: number) {
  const params = new URLSearchParams({ type: 'following' });
  if (userId) params.set('userId', userId);
  if (page) params.set('page', page.toString());
  const res = await fetch(`${API_BASE}/follow?${params}`);
  return res.json();
}

export async function followUser(targetUserId: string) {
  const res = await fetch(`${API_BASE}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, action: 'follow' }),
  });
  return res.json();
}

export async function unfollowUser(targetUserId: string) {
  const res = await fetch(`${API_BASE}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, action: 'unfollow' }),
  });
  return res.json();
}

// Block APIs
export async function getBlockedUsers() {
  const res = await fetch(`${API_BASE}/block`);
  return res.json();
}

export async function blockUser(targetUserId: string) {
  const res = await fetch(`${API_BASE}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, action: 'block' }),
  });
  return res.json();
}

export async function unblockUser(targetUserId: string) {
  const res = await fetch(`${API_BASE}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId, action: 'unblock' }),
  });
  return res.json();
}

// Conversations/Messages APIs
export async function getConversations(page?: number) {
  const params = page ? `?page=${page}` : '';
  const res = await fetch(`${API_BASE}/conversations${params}`);
  return res.json();
}

export async function createConversation(data: { type: 'direct' | 'group'; recipientId?: string; name?: string; memberIds?: string[] }) {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getMessages(conversationId: string, page?: number) {
  const params = page ? `?page=${page}` : '';
  const res = await fetch(`${API_BASE}/conversations/${conversationId}${params}`);
  return res.json();
}

export async function sendMessage(conversationId: string, data: {
  content?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'gif';
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  stickerId?: string;
  gifUrl?: string;
  replyToId?: string;
}) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteConversation(conversationId: string) {
  const res = await fetch(`${API_BASE}/conversations/${conversationId}`, { method: 'DELETE' });
  return res.json();
}

// Stories APIs
export async function getStories(type: 'feed' | 'user' | 'my' = 'feed', userId?: string) {
  const params = new URLSearchParams({ type });
  if (userId) params.set('userId', userId);
  const res = await fetch(`${API_BASE}/stories?${params}`);
  return res.json();
}

export async function createStory(data: {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  visibility?: string;
  stickers?: object[];
  textOverlays?: object[];
  music?: object;
}) {
  const res = await fetch(`${API_BASE}/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteStory(storyId: string) {
  const res = await fetch(`${API_BASE}/stories?id=${storyId}`, { method: 'DELETE' });
  return res.json();
}

// Reels APIs
export async function getReels(type: 'feed' | 'user' | 'following' = 'feed', userId?: string, page?: number) {
  const params = new URLSearchParams({ type });
  if (userId) params.set('userId', userId);
  if (page) params.set('page', page.toString());
  const res = await fetch(`${API_BASE}/reels?${params}`);
  return res.json();
}

export async function createReel(data: {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  caption?: string;
  audio?: object;
  effects?: object[];
  visibility?: string;
  allowComments?: boolean;
  allowDuets?: boolean;
}) {
  const res = await fetch(`${API_BASE}/reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteReel(reelId: string) {
  const res = await fetch(`${API_BASE}/reels?id=${reelId}`, { method: 'DELETE' });
  return res.json();
}

// Saved Posts APIs
export async function getSavedPosts(collection?: string, page?: number) {
  const params = new URLSearchParams();
  if (collection) params.set('collection', collection);
  if (page) params.set('page', page.toString());
  const res = await fetch(`${API_BASE}/saved-posts?${params}`);
  return res.json();
}

export async function savePost(postId: string, collection?: string) {
  const res = await fetch(`${API_BASE}/saved-posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, action: 'save', collection }),
  });
  return res.json();
}

export async function unsavePost(postId: string) {
  const res = await fetch(`${API_BASE}/saved-posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, action: 'unsave' }),
  });
  return res.json();
}

// Share APIs
export async function sharePost(postId: string, content?: string, shareType?: 'timeline' | 'message', groupId?: string) {
  const res = await fetch(`${API_BASE}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, content, shareType, groupId }),
  });
  return res.json();
}

export async function getPostShares(postId: string) {
  const res = await fetch(`${API_BASE}/share?postId=${postId}`);
  return res.json();
}

// Notifications APIs
export async function getNotifications(page?: number) {
  const params = page ? `?page=${page}` : '';
  const res = await fetch(`${API_BASE}/notifications${params}`);
  return res.json();
}

export async function markNotificationRead(notificationId?: string) {
  const res = await fetch(`${API_BASE}/notifications`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notificationId ? { notificationId } : { markAllRead: true }),
  });
  return res.json();
}

// Search APIs
export async function searchUsers(query: string) {
  const res = await fetch(`${API_BASE}/users?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function searchAll(query: string) {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

// User APIs
export async function updateUser(data: Partial<User>) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getUser(userId: string) {
  const res = await fetch(`${API_BASE}/users/${userId}`);
  return res.json();
}

// Groups APIs
export async function getGroups(type: 'all' | 'joined' | 'admin' = 'all', query?: string) {
  const params = new URLSearchParams({ type });
  if (query) params.set('q', query);
  const res = await fetch(`${API_BASE}/groups?${params}`);
  return res.json();
}

export async function createGroup(data: {
  name: string;
  description?: string;
  type?: 'public' | 'private' | 'secret';
  category?: string;
  location?: string;
  coverPhoto?: string;
  avatar?: string;
}) {
  const res = await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function joinGroup(groupId: string) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/join`, { method: 'POST' });
  return res.json();
}

export async function leaveGroup(groupId: string) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/leave`, { method: 'POST' });
  return res.json();
}

export async function getGroupMembers(groupId: string, role?: string) {
  const params = role ? `?role=${role}` : '';
  const res = await fetch(`${API_BASE}/groups/${groupId}/members${params}`);
  return res.json();
}

export async function manageGroupMember(groupId: string, data: {
  action: 'invite' | 'add' | 'remove' | 'changeRole';
  targetUserId: string;
  role?: 'admin' | 'moderator' | 'member';
}) {
  const res = await fetch(`${API_BASE}/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Pages APIs
export async function getPages(type: 'all' | 'liked' | 'admin' = 'all', query?: string) {
  const params = new URLSearchParams({ type });
  if (query) params.set('q', query);
  const res = await fetch(`${API_BASE}/pages?${params}`);
  return res.json();
}

export async function createPage(data: {
  name: string;
  username?: string;
  description?: string;
  category?: string;
  pageType?: string;
  coverPhoto?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
}) {
  const res = await fetch(`${API_BASE}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function likePage(pageId: string) {
  const res = await fetch(`${API_BASE}/pages/${pageId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'like' }),
  });
  return res.json();
}

export async function unlikePage(pageId: string) {
  const res = await fetch(`${API_BASE}/pages/${pageId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unlike' }),
  });
  return res.json();
}

export async function followPage(pageId: string) {
  const res = await fetch(`${API_BASE}/pages/${pageId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'follow' }),
  });
  return res.json();
}

export async function unfollowPage(pageId: string) {
  const res = await fetch(`${API_BASE}/pages/${pageId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unfollow' }),
  });
  return res.json();
}

// Events APIs
export async function getEvents(type: 'upcoming' | 'past' | 'going' | 'interested' | 'hosting' = 'upcoming', query?: string) {
  const params = new URLSearchParams({ type });
  if (query) params.set('q', query);
  const res = await fetch(`${API_BASE}/events?${params}`);
  return res.json();
}

export async function createEvent(data: {
  title: string;
  description?: string;
  coverPhoto?: string;
  startDate: string;
  endDate?: string;
  isAllDay?: boolean;
  timezone?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  location?: string;
  city?: string;
  country?: string;
  visibility?: string;
  category?: string;
  ticketUrl?: string;
  price?: string;
}) {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function rsvpToEvent(eventId: string, status: 'going' | 'interested' | 'not_going') {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function getEventRsvps(eventId: string, status?: string) {
  const params = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp${params}`);
  return res.json();
}

// Marketplace APIs
export async function getMarketplaceListings(params?: {
  category?: string;
  query?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
  condition?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.query) searchParams.set('q', params.query);
  if (params?.location) searchParams.set('location', params.location);
  if (params?.minPrice) searchParams.set('minPrice', params.minPrice);
  if (params?.maxPrice) searchParams.set('maxPrice', params.maxPrice);
  if (params?.condition) searchParams.set('condition', params.condition);
  
  const res = await fetch(`${API_BASE}/marketplace?${searchParams}`);
  return res.json();
}

export async function createMarketplaceListing(data: {
  title: string;
  description?: string;
  price: number | string;
  currency?: string;
  negotiable?: boolean;
  category: string;
  subcategory?: string;
  condition?: string;
  brand?: string;
  images: string[];
  video?: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  const res = await fetch(`${API_BASE}/marketplace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Reports APIs
export async function createReport(data: {
  reportType: 'post' | 'comment' | 'user' | 'page' | 'group' | 'message' | 'marketplace' | 'event';
  reportedId: string;
  reason: string;
  description?: string;
}) {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Admin APIs
export async function getAdminStats() {
  const res = await fetch(`${API_BASE}/admin?type=stats`);
  return res.json();
}

export async function getAdminUsers(search?: string, page?: number) {
  const params = new URLSearchParams({ type: 'users' });
  if (search) params.set('search', search);
  if (page) params.set('page', page.toString());
  const res = await fetch(`${API_BASE}/admin?${params}`);
  return res.json();
}

export async function adminAction(action: string, targetType?: string, targetId?: string, data?: object) {
  const res = await fetch(`${API_BASE}/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, targetType, targetId, data }),
  });
  return res.json();
}

export async function updateAdminSettings(settings: Record<string, string>) {
  const res = await fetch(`${API_BASE}/admin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
  return res.json();
}

// Analytics APIs
export async function getAnalytics(range?: '24h' | '7d' | '30d') {
  const params = range ? `?range=${range}` : '';
  const res = await fetch(`${API_BASE}/analytics${params}`);
  return res.json();
}

export async function trackEvent(eventType: string, entityType?: string, entityId?: string, metadata?: object) {
  const res = await fetch(`${API_BASE}/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, entityType, entityId, metadata }),
  });
  return res.json();
}
