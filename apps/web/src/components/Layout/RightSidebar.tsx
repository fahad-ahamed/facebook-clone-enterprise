'use client';

import { useQuery } from '@apollo/client';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { GET_FRIEND_SUGGESTIONS } from '@/graphql/queries/userQueries';
import type { User } from '@/types/user';

interface FriendSuggestion {
  id: string;
  user: User;
  mutualFriendCount: number;
  reason: string;
}

export function RightSidebar() {
  const { data: suggestionsData, loading } = useQuery(GET_FRIEND_SUGGESTIONS, {
    variables: { limit: 5 },
  });

  const suggestions: FriendSuggestion[] = suggestionsData?.friendSuggestions || [];

  // Mock sponsored content (would come from API in production)
  const sponsoredContent = [
    {
      id: '1',
      title: 'Amazing Product',
      description: 'Discover the latest innovation in tech',
      imageUrl: '/sponsored/ad1.jpg',
      link: 'https://example.com',
    },
    {
      id: '2', 
      title: 'Learn New Skills',
      description: 'Online courses starting at $9.99',
      imageUrl: '/sponsored/ad2.jpg',
      link: 'https://example.com/courses',
    },
  ];

  // Birthdays (mock data)
  const birthdays = [
    { id: '1', name: 'John Doe', avatar: '/avatars/john.jpg', isToday: true },
    { id: '2', name: 'Jane Smith', avatar: '/avatars/jane.jpg', isToday: false },
  ];

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
      {/* Sponsored Section */}
      <div className="mb-4">
        <h3 className="px-3 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          Sponsored
        </h3>
        <div className="space-y-3">
          {sponsoredContent.map((ad) => (
            <Link
              key={ad.id}
              href={ad.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {ad.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {ad.description}
                </p>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
                  example.com
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Divider */}
      <hr className="my-3 border-gray-200 dark:border-gray-700" />

      {/* Birthdays */}
      {birthdays.length > 0 && (
        <>
          <div className="mb-4">
            <h3 className="px-3 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Birthdays
            </h3>
            <div className="px-3">
              {birthdays.map((birthday) => (
                <div key={birthday.id} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 flex items-center justify-center text-2xl">
                    🎂
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{birthday.name}</span>
                      {birthday.isToday && (
                        <span className="text-gray-500 dark:text-gray-400"> has a birthday today.</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <hr className="my-3 border-gray-200 dark:border-gray-700" />
        </>
      )}

      {/* Friend Requests / Suggestions */}
      <div className="mb-4">
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            People You May Know
          </h3>
          <Link
            href="/friends/suggestions"
            className="text-xs text-blue-500 hover:underline"
          >
            See All
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 px-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <FriendSuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No suggestions available
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 text-xs text-gray-400 dark:text-gray-500">
        <p className="mt-2">Meta © {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}

interface FriendSuggestionCardProps {
  suggestion: FriendSuggestion;
}

function FriendSuggestionCard({ suggestion }: FriendSuggestionCardProps) {
  const { user, mutualFriendCount } = suggestion;

  return (
    <div className="px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/profile/${user.id}`} className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={`${user.firstName} ${user.lastName}`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-semibold text-xl">
                {user.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link 
            href={`/profile/${user.id}`}
            className="text-sm font-semibold text-gray-900 dark:text-white hover:underline"
          >
            {user.firstName} {user.lastName}
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {mutualFriendCount} mutual friend{mutualFriendCount !== 1 ? 's' : ''}
          </p>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            <button className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors">
              Add Friend
            </button>
            <button className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
              Remove
            </button>
          </div>
        </div>

        {/* More Options */}
        <button className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 self-start">
          <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}
