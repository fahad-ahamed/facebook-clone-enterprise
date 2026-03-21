// Main feed component - shows all posts
// Uses infinite scroll for loading more

import { useState, useEffect, useRef, useCallback } from 'react';
import { PostCard } from './PostCard';
import { CreatePost } from './CreatePost';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getInitials } from '@/utils/stringUtils';
import type { Post, User, Story } from '@/types';

interface FeedProps {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  currentUser: User;
  stories: { user: User; stories: Story[] }[];
  onLoadMore: () => void;
  onReact: (postId: string, type: string) => void;
  onComment: (postId: string, content: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onDelete: (postId: string) => void;
  onCreatePost: (data: any) => Promise<void>;
  onViewStory: (storyId: string) => void;
}

export function Feed({
  posts,
  loading,
  hasMore,
  currentUser,
  stories,
  onLoadMore,
  onReact,
  onComment,
  onShare,
  onSave,
  onDelete,
  onCreatePost,
  onViewStory,
}: FeedProps) {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll setup
  useEffect(() => {
    if (!hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <div className="max-w-[680px] mx-auto px-4 py-4">
      {/* Stories section */}
      {stories && stories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {/* Create story */}
          <div className="flex-shrink-0 w-[104px] h-[184px] rounded-xl overflow-hidden bg-white shadow relative cursor-pointer">
            <img
              src={currentUser.avatar}
              alt=""
              className="w-full h-3/4 object-cover"
            />
            <div className="absolute bottom-0 w-full h-1/4 bg-white flex items-center justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-white text-2xl">+</span>
              </div>
              <span className="text-xs font-medium mt-3">Create story</span>
            </div>
          </div>

          {/* Story cards */}
          {stories.map(({ user, stories: userStories }) => (
            <div
              key={user.id}
              onClick={() => onViewStory(userStories[0]?.id)}
              className="flex-shrink-0 w-[104px] h-[184px] rounded-xl overflow-hidden cursor-pointer relative"
            >
              <img
                src={userStories[0]?.mediaUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
              <div className="absolute top-2.5 left-2.5">
                <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                  <Avatar className="w-full h-full border-2 border-white">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                <p className="text-white text-xs font-medium drop-shadow truncate">
                  {user.firstName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create post box */}
      <div className="bg-white rounded-lg p-3 mb-2">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback>{getInitials(currentUser.firstName, currentUser.lastName)}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-left px-4 py-2.5 rounded-full text-gray-500 text-sm"
          >
            What&apos;s on your mind, {currentUser.firstName}?
          </button>
        </div>
        
        <hr className="my-3" />
        
        <div className="flex justify-around">
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-600"
          >
            <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
            </svg>
            Photo
          </button>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-600"
          >
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Video
          </button>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-600"
          >
            <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="1" fill="white"/>
              <circle cx="15" cy="9" r="1" fill="white"/>
            </svg>
            Feeling
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-2">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            onReact={onReact}
            onComment={onComment}
            onShare={onShare}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}

        {/* Loading indicator */}
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {loading && <Loader2 className="w-6 h-6 animate-spin text-blue-500" />}
          {!hasMore && posts.length > 0 && (
            <p className="text-gray-400 text-sm">No more posts</p>
          )}
        </div>
      </div>

      {/* Create post modal */}
      <CreatePost
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSubmit={onCreatePost}
        currentUser={currentUser}
      />
    </div>
  );
}
