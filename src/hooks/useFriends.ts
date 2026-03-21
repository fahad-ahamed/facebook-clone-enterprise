// Friends hook - manages friend requests and connections

import { useState, useEffect, useCallback } from 'react';
import { friendService } from '@/services/api';
import type { User } from '@/types';

interface FriendRequest {
  id: string;
  user: User;
  mutualFriends: number;
}

interface UseFriendsReturn {
  friends: User[];
  requests: FriendRequest[];
  suggestions: User[];
  loading: boolean;
  sendRequest: (userId: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  unfriend: (userId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useFriends(): UseFriendsReturn {
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, suggestionsRes] = await Promise.all([
        friendService.getFriends(),
        friendService.getRequests(),
        friendService.getSuggestions(),
      ]);
      
      setFriends(friendsRes.friends || []);
      setRequests(requestsRes.requests || []);
      setSuggestions(suggestionsRes.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch friends data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendRequest = useCallback(async (userId: string) => {
    try {
      await friendService.sendRequest(userId);
      // Remove from suggestions if there
      setSuggestions(prev => prev.filter(u => u.id !== userId));
      return true;
    } catch (error) {
      console.error('Send request error:', error);
      return false;
    }
  }, []);

  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      await friendService.acceptRequest(requestId);
      // Move from requests to friends
      const request = requests.find(r => r.user.id === requestId);
      if (request) {
        setFriends(prev => [...prev, request.user]);
        setRequests(prev => prev.filter(r => r.user.id !== requestId));
      }
      return true;
    } catch (error) {
      console.error('Accept request error:', error);
      return false;
    }
  }, [requests]);

  const rejectRequest = useCallback(async (requestId: string) => {
    try {
      await friendService.rejectRequest(requestId);
      setRequests(prev => prev.filter(r => r.user.id !== requestId));
      return true;
    } catch (error) {
      console.error('Reject request error:', error);
      return false;
    }
  }, []);

  const unfriend = useCallback(async (userId: string) => {
    try {
      await friendService.unfriend(userId);
      setFriends(prev => prev.filter(u => u.id !== userId));
      return true;
    } catch (error) {
      console.error('Unfriend error:', error);
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    friends,
    requests,
    suggestions,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
    refresh,
  };
}
