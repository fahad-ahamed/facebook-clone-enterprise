'use client';

import { type ApolloError } from '@apollo/client';
import { PostCard } from './PostCard';
import { PostCardSkeleton } from './PostCardSkeleton';
import type { Post } from '@/types/post';

interface FeedProps {
  posts: Post[];
  loading: boolean;
  error: ApolloError | undefined;
  onRefetch: () => void;
}

export function Feed({ posts, loading, error, onRefetch }: FeedProps) {
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          We couldn&apos;t load your feed. Please try again.
        </p>
        <button
          onClick={onRefetch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {loading && (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      )}

      {!loading && posts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No posts yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            When you follow people or join groups, their posts will show up here.
          </p>
        </div>
      )}
    </div>
  );
}
