// API Service - handles all the backend calls
// Trying to keep components clean by putting API logic here

const API_BASE = '/api';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  
  return data;
}

// ========== AUTH ==========

export const authService = {
  login: (email: string, password: string) => 
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    
  register: (data: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    country?: string;
  }) => fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  logout: () => fetchAPI('/auth/logout', { method: 'POST' }),
  
  getCurrentUser: () => fetchAPI('/auth/me'),
  
  verifyEmail: (email: string, code: string) => 
    fetchAPI('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
    
  forgotPassword: (email: string) =>
    fetchAPI('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
    
  resetPassword: (email: string, code: string, newPassword: string) =>
    fetchAPI('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),
};

// ========== POSTS ==========

export const postService = {
  getFeed: (page = 1, limit = 10) => 
    fetchAPI(`/posts?page=${page}&limit=${limit}`),
    
  getUserPosts: (userId: string) => 
    fetchAPI(`/posts?authorId=${userId}`),
    
  create: (data: {
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    visibility?: string;
    feeling?: string;
    location?: string;
  }) => fetchAPI('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  delete: (postId: string) => 
    fetchAPI(`/posts/${postId}`, { method: 'DELETE' }),
    
  react: (postId: string, type: string) =>
    fetchAPI(`/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),
    
  addComment: (postId: string, content: string) =>
    fetchAPI(`/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
    
  getComments: (postId: string, page = 1) =>
    fetchAPI(`/posts/${postId}/comment?page=${page}`),
};

// ========== USERS ==========

export const userService = {
  getProfile: (userId: string) => 
    fetchAPI(`/users/${userId}`),
    
  updateProfile: (data: Record<string, unknown>) =>
    fetchAPI('/users', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
  search: (query: string) =>
    fetchAPI(`/users?q=${encodeURIComponent(query)}`),
    
  checkUsername: (username: string) =>
    fetchAPI(`/users/check-username?username=${encodeURIComponent(username)}`),
};

// ========== FRIENDS ==========

export const friendService = {
  getFriends: () => fetchAPI('/friends?type=friends'),
  
  getRequests: () => fetchAPI('/friends?type=requests'),
  
  getSuggestions: () => fetchAPI('/friends?type=suggestions'),
  
  sendRequest: (receiverId: string) =>
    fetchAPI('/friends', {
      method: 'POST',
      body: JSON.stringify({ receiverId, action: 'send' }),
    }),
    
  acceptRequest: (senderId: string) =>
    fetchAPI('/friends', {
      method: 'POST',
      body: JSON.stringify({ receiverId: senderId, action: 'accept' }),
    }),
    
  rejectRequest: (senderId: string) =>
    fetchAPI('/friends', {
      method: 'POST',
      body: JSON.stringify({ receiverId: senderId, action: 'reject' }),
    }),
    
  unfriend: (userId: string) =>
    fetchAPI('/friends', {
      method: 'POST',
      body: JSON.stringify({ receiverId: userId, action: 'unfriend' }),
    }),
};

// ========== CHAT ==========

export const chatService = {
  getConversations: () => fetchAPI('/conversations'),
  
  getMessages: (conversationId: string) =>
    fetchAPI(`/conversations/${conversationId}`),
    
  sendMessage: (conversationId: string, data: {
    content?: string;
    mediaUrl?: string;
    messageType?: string;
  }) => fetchAPI(`/conversations/${conversationId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  createConversation: (recipientId: string) =>
    fetchAPI('/conversations', {
      method: 'POST',
      body: JSON.stringify({ type: 'direct', recipientId }),
    }),
};

// ========== STORIES ==========

export const storyService = {
  getFeed: () => fetchAPI('/stories?type=feed'),
  
  create: (data: { mediaType: string; mediaUrl: string; caption?: string }) =>
    fetchAPI('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  delete: (storyId: string) =>
    fetchAPI(`/stories?id=${storyId}`, { method: 'DELETE' }),
};

// ========== NOTIFICATIONS ==========

export const notificationService = {
  getAll: () => fetchAPI('/notifications'),
  
  markAsRead: (notificationId?: string) =>
    fetchAPI('/notifications', {
      method: 'PUT',
      body: JSON.stringify(notificationId ? { notificationId } : { markAllRead: true }),
    }),
};

// ========== SEARCH ==========

export const searchService = {
  searchAll: (query: string) =>
    fetchAPI(`/search?q=${encodeURIComponent(query)}`),
};

// ========== MARKETPLACE ==========

export const marketplaceService = {
  getListings: (category?: string) => {
    const params = category ? `?category=${category}` : '';
    return fetchAPI(`/marketplace${params}`);
  },
  
  create: (data: Record<string, unknown>) =>
    fetchAPI('/marketplace', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ========== GROUPS ==========

export const groupService = {
  getAll: () => fetchAPI('/groups?type=all'),
  
  getJoined: () => fetchAPI('/groups?type=joined'),
  
  create: (data: { name: string; description?: string; type?: string }) =>
    fetchAPI('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  join: (groupId: string) =>
    fetchAPI(`/groups/${groupId}/join`, { method: 'POST' }),
    
  leave: (groupId: string) =>
    fetchAPI(`/groups/${groupId}/leave`, { method: 'POST' }),
};

// ========== PAGES ==========

export const pageService = {
  getAll: () => fetchAPI('/pages?type=all'),
  
  create: (data: { name: string; description?: string; category?: string }) =>
    fetchAPI('/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  like: (pageId: string) =>
    fetchAPI(`/pages/${pageId}/like`, {
      method: 'POST',
      body: JSON.stringify({ action: 'like' }),
    }),
};

// ========== EVENTS ==========

export const eventService = {
  getUpcoming: () => fetchAPI('/events?type=upcoming'),
  
  create: (data: Record<string, unknown>) =>
    fetchAPI('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  rsvp: (eventId: string, status: 'going' | 'interested' | 'not_going') =>
    fetchAPI(`/events/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
};
