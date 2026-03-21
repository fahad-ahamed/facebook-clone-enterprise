// Posts hook - manages feed and post operations

import { useState, useEffect, useCallback } from 'react';
import { postService } from '@/services/api';
import type { Post } from '@/types';

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  createPost: (data: Parameters<typeof postService.create>[0]) => Promise<{ success: boolean; post?: Post }>;
  deletePost: (postId: string) => Promise<void>;
  reactToPost: (postId: string, type: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePosts(initialLimit = 10): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = initialLimit;

  const fetchPosts = useCallback(async (pageNum: number, reset = false) => {
    try {
      const response = await postService.getFeed(pageNum, limit);
      const newPosts = response.posts || [];
      
      if (reset) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      setHasMore(newPosts.length === limit);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);
    await fetchPosts(nextPage);
  }, [page, hasMore, loading, fetchPosts]);

  const refresh = useCallback(async () => {
    setPage(1);
    setLoading(true);
    await fetchPosts(1, true);
  }, [fetchPosts]);

  const createPost = useCallback(async (data: Parameters<typeof postService.create>[0]) => {
    try {
      const response = await postService.create(data);
      if (response.post) {
        // Add new post to the beginning
        setPosts(prev => [response.post as Post, ...prev]);
        return { success: true, post: response.post as Post };
      }
      return { success: false };
    } catch (error) {
      console.error('Create post error:', error);
      return { success: false };
    }
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    try {
      await postService.delete(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Delete post error:', error);
    }
  }, []);

  const reactToPost = useCallback(async (postId: string, type: string) => {
    try {
      await postService.react(postId, type);
      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const currentReaction = post.userReaction;
          const newReaction = currentReaction === type ? null : type;
          
          // Update counts
          const counts = { ...post };
          if (currentReaction && counts[currentReaction + 'Count' as keyof Post]) {
            (counts[currentReaction + 'Count' as keyof Post] as number)--;
          }
          if (newReaction) {
            (counts[newReaction + 'Count' as keyof Post] as number)++;
          }
          
          return { ...counts, userReaction: newReaction };
        }
        return post;
      }));
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }, []);

  const addComment = useCallback(async (postId: string, content: string) => {
    try {
      const response = await postService.addComment(postId, content);
      if (response.comment) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...post.comments, response.comment],
              commentCount: post.commentCount + 1,
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Comment error:', error);
    }
  }, []);

  return {
    posts,
    loading,
    hasMore,
    createPost,
    deletePost,
    reactToPost,
    addComment,
    loadMore,
    refresh,
  };
}
