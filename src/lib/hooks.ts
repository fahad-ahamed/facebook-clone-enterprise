'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from './api';

// Auth hook
export function useAuth() {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.getCurrentUser();
        if (res.user) {
          setUser(res.user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return { user, loading, login, logout, setUser };
}

// Posts hook
export function usePosts(authorId?: string, groupId?: string, pageId?: string) {
  const [posts, setPosts] = useState<api.Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPosts({ authorId, groupId, pageId, limit: 20 });
      if (res.posts) {
        setPosts(res.posts);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }, [authorId, groupId, pageId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = async (data: Parameters<typeof api.createPost>[0]) => {
    const res = await api.createPost(data);
    if (res.post) {
      setPosts(prev => [res.post, ...prev]);
    }
    return res;
  };

  const reactToPost = async (postId: string, type: string) => {
    const res = await api.reactToPost(postId, type);
    if (res.success) {
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, userReaction: res.reaction?.type, likeCount: res.likeCount }
          : p
      ));
    }
    return res;
  };

  const commentOnPost = async (postId: string, content: string) => {
    const res = await api.commentOnPost(postId, content);
    if (res.comment) {
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, comments: [...p.comments, res.comment], commentCount: p.commentCount + 1 }
          : p
      ));
    }
    return res;
  };

  const deletePost = async (postId: string) => {
    await api.deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return { posts, loading, createPost, reactToPost, commentOnPost, deletePost, refresh: fetchPosts };
}

// Friends hook
export function useFriends() {
  const [friends, setFriends] = useState<api.User[]>([]);
  const [requests, setRequests] = useState<api.User[]>([]);
  const [suggestions, setSuggestions] = useState<api.User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, suggestionsRes] = await Promise.all([
        api.getFriends('friends'),
        api.getFriends('requests'),
        api.getFriends('suggestions'),
      ]);
      if (friendsRes.friends) setFriends(friendsRes.friends);
      if (requestsRes.requests) setRequests(requestsRes.requests);
      if (suggestionsRes.suggestions) setSuggestions(suggestionsRes.suggestions);
    } catch (error) {
      console.error('Failed to fetch friends data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendRequest = async (receiverId: string) => {
    return api.sendFriendRequest(receiverId);
  };

  const acceptRequest = async (senderId: string) => {
    const res = await api.acceptFriendRequest(senderId);
    if (res.message) {
      setRequests(prev => prev.filter(r => r.id !== senderId));
    }
    return res;
  };

  const rejectRequest = async (senderId: string) => {
    const res = await api.rejectFriendRequest(senderId);
    if (res.message) {
      setRequests(prev => prev.filter(r => r.id !== senderId));
    }
    return res;
  };

  return { friends, requests, suggestions, loading, sendRequest, acceptRequest, rejectRequest, refresh: fetchData };
}

// Follow hook
export function useFollow(userId?: string) {
  const [followers, setFollowers] = useState<api.User[]>([]);
  const [following, setFollowing] = useState<api.User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFollowers = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.getFollowers(userId);
      if (res.followers) setFollowers(res.followers);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchFollowing = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.getFollowing(userId);
      if (res.following) setFollowing(res.following);
    } catch (error) {
      console.error('Failed to fetch following:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFollowers();
    fetchFollowing();
  }, [fetchFollowers, fetchFollowing]);

  const follow = async (targetUserId: string) => {
    const res = await api.followUser(targetUserId);
    if (res.following) {
      setFollowing(prev => [...prev, res.user]);
    }
    return res;
  };

  const unfollow = async (targetUserId: string) => {
    const res = await api.unfollowUser(targetUserId);
    if (!res.following) {
      setFollowing(prev => prev.filter(u => u.id !== targetUserId));
    }
    return res;
  };

  return { followers, following, loading, follow, unfollow, refreshFollowers: fetchFollowers, refreshFollowing: fetchFollowing };
}

// Conversations hook
export function useConversations() {
  const [conversations, setConversations] = useState<api.Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getConversations();
      if (res.conversations) {
        setConversations(res.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const create = async (data: Parameters<typeof api.createConversation>[0]) => {
    const res = await api.createConversation(data);
    if (res.conversation) {
      setConversations(prev => [res.conversation, ...prev]);
    }
    return res;
  };

  return { conversations, loading, create, refresh: fetchConversations };
}

// Messages hook
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<api.Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await api.getMessages(conversationId);
      if (res.messages) {
        setMessages(res.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const send = async (data: Parameters<typeof api.sendMessage>[1]) => {
    if (!conversationId) return;
    const res = await api.sendMessage(conversationId, data);
    if (res.message) {
      setMessages(prev => [...prev, res.message]);
    }
    return res;
  };

  return { messages, loading, send, refresh: fetchMessages };
}

// Notifications hook
export function useNotifications() {
  const [notifications, setNotifications] = useState<api.Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId?: string) => {
    await api.markNotificationRead(notificationId);
    if (notificationId) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, refresh: fetchNotifications };
}

// Stories hook
export function useStories(type: 'feed' | 'user' | 'my' = 'feed', userId?: string) {
  const [stories, setStories] = useState<{ user: api.User; stories: api.Story[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getStories(type, userId);
      if (res.stories) {
        setStories(res.stories);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
    }
  }, [type, userId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const create = async (data: Parameters<typeof api.createStory>[0]) => {
    const res = await api.createStory(data);
    if (res.story) {
      // Refresh stories after creating
      fetchStories();
    }
    return res;
  };

  const remove = async (storyId: string) => {
    await api.deleteStory(storyId);
    fetchStories();
  };

  return { stories, loading, create, remove, refresh: fetchStories };
}

// Reels hook
export function useReels(type: 'feed' | 'user' | 'following' = 'feed', userId?: string) {
  const [reels, setReels] = useState<api.Reel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getReels(type, userId);
      if (res.reels) {
        setReels(res.reels);
      }
    } catch (error) {
      console.error('Failed to fetch reels:', error);
    } finally {
      setLoading(false);
    }
  }, [type, userId]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const create = async (data: Parameters<typeof api.createReel>[0]) => {
    const res = await api.createReel(data);
    if (res.reel) {
      setReels(prev => [res.reel, ...prev]);
    }
    return res;
  };

  const remove = async (reelId: string) => {
    await api.deleteReel(reelId);
    setReels(prev => prev.filter(r => r.id !== reelId));
  };

  return { reels, loading, create, remove, refresh: fetchReels };
}

// Saved Posts hook
export function useSavedPosts() {
  const [savedPosts, setSavedPosts] = useState<api.Post[]>([]);
  const [collections, setCollections] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = useCallback(async (collection?: string) => {
    setLoading(true);
    try {
      const res = await api.getSavedPosts(collection);
      if (res.savedPosts) {
        setSavedPosts(res.savedPosts);
        setCollections(res.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  const save = async (postId: string, collection?: string) => {
    return api.savePost(postId, collection);
  };

  const unsave = async (postId: string) => {
    return api.unsavePost(postId);
  };

  return { savedPosts, collections, loading, save, unsave, refresh: fetchSavedPosts };
}

// Groups hook
export function useGroups(type: 'all' | 'joined' | 'admin' = 'all') {
  const [groups, setGroups] = useState<api.Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getGroups(type);
      if (res.groups) {
        setGroups(res.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const create = async (data: Parameters<typeof api.createGroup>[0]) => {
    const res = await api.createGroup(data);
    if (res.group) {
      setGroups(prev => [res.group, ...prev]);
    }
    return res;
  };

  const join = async (groupId: string) => {
    return api.joinGroup(groupId);
  };

  const leave = async (groupId: string) => {
    return api.leaveGroup(groupId);
  };

  return { groups, loading, create, join, leave, refresh: fetchGroups };
}

// Pages hook
export function usePages(type: 'all' | 'liked' | 'admin' = 'all') {
  const [pages, setPages] = useState<api.Page[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPages(type);
      if (res.pages) {
        setPages(res.pages);
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const create = async (data: Parameters<typeof api.createPage>[0]) => {
    const res = await api.createPage(data);
    if (res.page) {
      setPages(prev => [res.page, ...prev]);
    }
    return res;
  };

  const like = async (pageId: string) => {
    return api.likePage(pageId);
  };

  const unlike = async (pageId: string) => {
    return api.unlikePage(pageId);
  };

  return { pages, loading, create, like, unlike, refresh: fetchPages };
}

// Events hook
export function useEvents(type: 'upcoming' | 'past' | 'going' | 'interested' | 'hosting' = 'upcoming') {
  const [events, setEvents] = useState<api.Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEvents(type);
      if (res.events) {
        setEvents(res.events);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const create = async (data: Parameters<typeof api.createEvent>[0]) => {
    const res = await api.createEvent(data);
    if (res.event) {
      setEvents(prev => [res.event, ...prev]);
    }
    return res;
  };

  const rsvp = async (eventId: string, status: 'going' | 'interested' | 'not_going') => {
    return api.rsvpToEvent(eventId, status);
  };

  return { events, loading, create, rsvp, refresh: fetchEvents };
}

// Marketplace hook
export function useMarketplace(filters?: {
  category?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
  condition?: string;
}) {
  const [listings, setListings] = useState<api.MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMarketplaceListings(filters);
      if (res.listings) {
        setListings(res.listings);
      }
    } catch (error) {
      console.error('Failed to fetch marketplace listings:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const create = async (data: Parameters<typeof api.createMarketplaceListing>[0]) => {
    const res = await api.createMarketplaceListing(data);
    if (res.listing) {
      setListings(prev => [res.listing, ...prev]);
    }
    return res;
  };

  return { listings, loading, create, refresh: fetchListings };
}

// Search hook
export function useSearch() {
  const [results, setResults] = useState<{ users: api.User[] }>({ users: [] });
  const [loading, setLoading] = useState(false);

  const search = async (query: string) => {
    if (!query.trim()) {
      setResults({ users: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await api.searchUsers(query);
      setResults({ users: res.users || [] });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search };
}

// User Profile hook
export function useUserProfile(userId: string | null) {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.getUser(userId);
      if (res.user) {
        setUser(res.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, refresh: fetchUser };
}
