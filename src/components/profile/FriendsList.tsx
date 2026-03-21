// Friends list component - displays friends grid with search and actions
// Supports filtering and mutual friends display

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  UserPlus,
  MoreHorizontal,
  MessageCircle,
  UserMinus,
  Ban,
  Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials, formatNumber } from '@/utils/stringUtils';
import type { User } from '@/types';

interface Friend extends User {
  mutualFriends?: number;
  friendsSince?: string;
}

interface FriendsListProps {
  friends: Friend[];
  onFriendClick?: (friend: Friend) => void;
  onRemoveFriend?: (friendId: string) => void;
  onBlockFriend?: (friendId: string) => void;
  onMessageFriend?: (friendId: string) => void;
  isOwnProfile?: boolean;
  showMutualFriends?: boolean;
  layout?: 'grid' | 'list';
  maxDisplay?: number;
}

export function FriendsList({
  friends,
  onFriendClick,
  onRemoveFriend,
  onBlockFriend,
  onMessageFriend,
  isOwnProfile = false,
  showMutualFriends = true,
  layout = 'grid',
  maxDisplay,
}: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showActions, setShowActions] = useState<string | null>(null);

  // Filter friends based on search
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;

    const query = searchQuery.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.firstName.toLowerCase().includes(query) ||
        friend.lastName.toLowerCase().includes(query) ||
        friend.username?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const displayFriends = maxDisplay ? filteredFriends.slice(0, maxDisplay) : filteredFriends;

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No friends yet</h3>
        <p className="text-gray-500 mt-1">Friends will appear here when added</p>
        {isOwnProfile && (
          <Button className="mt-4 bg-[#1877F2] hover:bg-[#166FE5]">
            <UserPlus className="w-4 h-4 mr-2" />
            Find Friends
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold">
            Friends
            <span className="text-gray-500 font-normal ml-2">
              ({formatNumber(friends.length)})
            </span>
          </h3>
          {showMutualFriends && friends.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {friends.filter((f) => f.mutualFriends && f.mutualFriends > 0).length} mutual friends
            </p>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* No results message */}
      {filteredFriends.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-500">
          No friends found matching "{searchQuery}"
        </div>
      )}

      {/* Friends Grid */}
      {layout === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {displayFriends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Friend card */}
                <div
                  className="cursor-pointer"
                  onClick={() => onFriendClick?.(friend)}
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <Avatar className="w-full h-full rounded-none">
                      <AvatarImage src={friend.avatar} className="object-cover" />
                      <AvatarFallback className="rounded-none text-2xl bg-gray-200">
                        {getInitials(friend.firstName, friend.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Online indicator */}
                    {friend.isOnline && (
                      <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="p-3">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm truncate">
                        {friend.firstName} {friend.lastName}
                      </p>
                      {friend.isVerified && friend.badgeType && (
                        <span
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                            friend.badgeType === 'blue'
                              ? "bg-blue-500"
                              : friend.badgeType === 'gold'
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          )}
                        >
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* Mutual friends */}
                    {showMutualFriends && friend.mutualFriends !== undefined && friend.mutualFriends > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {friend.mutualFriends} mutual friend{friend.mutualFriends !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons - show on hover or for own profile */}
                {isOwnProfile && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMessageFriend?.(friend.id);
                        }}
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Message
                      </Button>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(showActions === friend.id ? null : friend.id);
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>

                        {/* Dropdown menu */}
                        <AnimatePresence>
                          {showActions === friend.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute bottom-full right-0 mb-1 bg-white rounded-lg shadow-lg border py-1 w-40 z-10"
                            >
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveFriend?.(friend.id);
                                  setShowActions(null);
                                }}
                              >
                                <UserMinus className="w-4 h-4" />
                                Unfriend
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBlockFriend?.(friend.id);
                                  setShowActions(null);
                                }}
                              >
                                <Ban className="w-4 h-4" />
                                Block
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* List layout */
        <div className="space-y-3">
          <AnimatePresence>
            {displayFriends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => onFriendClick?.(friend)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback className="bg-gray-200">
                        {getInitials(friend.firstName, friend.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    {friend.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold">
                        {friend.firstName} {friend.lastName}
                      </p>
                      {friend.isVerified && friend.badgeType && (
                        <span
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center",
                            friend.badgeType === 'blue'
                              ? "bg-blue-500"
                              : friend.badgeType === 'gold'
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          )}
                        >
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    {showMutualFriends && friend.mutualFriends !== undefined && friend.mutualFriends > 0 && (
                      <p className="text-sm text-gray-500">
                        {friend.mutualFriends} mutual friend{friend.mutualFriends !== 1 ? 's' : ''}
                      </p>
                    )}
                    {friend.friendsSince && (
                      <p className="text-xs text-gray-400">
                        Friends since {friend.friendsSince}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessageFriend?.(friend.id);
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Message
                  </Button>

                  {isOwnProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActions(showActions === friend.id ? null : friend.id);
                      }}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Show more button */}
      {maxDisplay && filteredFriends.length > maxDisplay && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => {}}>
            Show More Friends ({filteredFriends.length - maxDisplay} more)
          </Button>
        </div>
      )}
    </div>
  );
}

// Mutual friends component - shows mutual friends between two users
interface MutualFriendsProps {
  friends: Friend[];
  maxDisplay?: number;
}

export function MutualFriends({ friends, maxDisplay = 8 }: MutualFriendsProps) {
  const displayFriends = friends.slice(0, maxDisplay);
  const remainingCount = friends.length - maxDisplay;

  if (friends.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayFriends.map((friend) => (
          <Avatar key={friend.id} className="w-8 h-8 border-2 border-white">
            <AvatarImage src={friend.avatar} />
            <AvatarFallback className="bg-gray-200 text-xs">
              {getInitials(friend.firstName, friend.lastName)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="text-sm text-gray-600">
        {remainingCount > 0
          ? `${friends.length} mutual friends`
          : `${friends.length} mutual friend${friends.length !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}
