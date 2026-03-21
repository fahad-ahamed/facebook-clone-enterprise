// Friend suggestions component - shows people you may know
// Displays mutual friends and add friend functionality

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserPlus,
  X,
  Check,
  Users,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';

// Suggestion interface
export interface SuggestedFriend {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isVerified?: boolean;
  badgeType?: string | null;
  mutualFriends: number;
  currentCity?: string;
  workplace?: string;
  education?: string;
}

interface FriendSuggestionsProps {
  suggestions: SuggestedFriend[];
  onAddFriend: (userId: string) => void;
  onRemoveSuggestion?: (userId: string) => void;
  loading?: boolean;
  maxDisplay?: number;
  layout?: 'list' | 'grid';
}

// Single suggestion card
function SuggestionCard({
  suggestion,
  onAddFriend,
  onRemove,
  loading,
  layout,
}: {
  suggestion: SuggestedFriend;
  onAddFriend: () => void;
  onRemove?: () => void;
  loading?: boolean;
  layout: 'list' | 'grid';
}) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddFriend = async () => {
    setIsAdding(true);
    await onAddFriend();
    // Keep loading state briefly for visual feedback
    setTimeout(() => setIsAdding(false), 500);
  };

  if (layout === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      >
        {/* Avatar */}
        <div className="aspect-square bg-gray-100 relative">
          <Avatar className="w-full h-full rounded-none">
            <AvatarImage src={suggestion.avatar} className="object-cover" />
            <AvatarFallback className="rounded-none text-2xl bg-gray-200">
              {getInitials(suggestion.firstName, suggestion.lastName)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm truncate">
              {suggestion.firstName} {suggestion.lastName}
            </p>

            {suggestion.isVerified && suggestion.badgeType && (
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                  suggestion.badgeType === 'blue'
                    ? "bg-blue-500"
                    : suggestion.badgeType === 'gold'
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                )}
              >
                <Check className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>

          {/* Mutual friends */}
          {suggestion.mutualFriends > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends !== 1 ? 's' : ''}
            </p>
          )}

          {/* Action button */}
          <Button
            size="sm"
            className="w-full mt-3 bg-[#1877F2] hover:bg-[#166FE5]"
            onClick={handleAddFriend}
            disabled={loading || isAdding}
          >
            {isAdding ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Request Sent
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1" />
                Add Friend
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  }

  // List layout
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors rounded-lg group"
    >
      {/* Avatar */}
      <Avatar className="w-12 h-12 flex-shrink-0">
        <AvatarImage src={suggestion.avatar} />
        <AvatarFallback className="bg-gray-200">
          {getInitials(suggestion.firstName, suggestion.lastName)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-semibold text-sm">
            {suggestion.firstName} {suggestion.lastName}
          </h4>

          {suggestion.isVerified && suggestion.badgeType && (
            <span
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                suggestion.badgeType === 'blue'
                  ? "bg-blue-500"
                  : suggestion.badgeType === 'gold'
                  ? "bg-yellow-500"
                  : "bg-gray-500"
              )}
            >
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>

        {/* Mutual friends or other info */}
        {suggestion.mutualFriends > 0 ? (
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Users className="w-3 h-3" />
            <span>
              {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends !== 1 ? 's' : ''}
            </span>
          </div>
        ) : suggestion.currentCity ? (
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <MapPin className="w-3 h-3" />
            <span>Lives in {suggestion.currentCity}</span>
          </div>
        ) : suggestion.workplace ? (
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Briefcase className="w-3 h-3" />
            <span>Works at {suggestion.workplace}</span>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          className="bg-[#1877F2] hover:bg-[#166FE5]"
          onClick={handleAddFriend}
          disabled={loading || isAdding}
        >
          {isAdding ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Sent
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-1" />
              Add
            </>
          )}
        </Button>

        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export function FriendSuggestions({
  suggestions,
  onAddFriend,
  onRemoveSuggestion,
  loading,
  maxDisplay = 5,
  layout = 'list',
}: FriendSuggestionsProps) {
  const [showAll, setShowAll] = useState(false);

  const displaySuggestions = showAll
    ? suggestions
    : suggestions.slice(0, maxDisplay);

  const hasMore = suggestions.length > maxDisplay;

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h4 className="font-semibold text-gray-700">No Suggestions</h4>
        <p className="text-gray-500 text-sm text-center mt-1">
          We'll suggest friends for you here
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-lg font-bold">People You May Know</h3>
        <span className="text-sm text-gray-500">
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Suggestions */}
      <ScrollArea className={cn(showAll && "max-h-[500px]")}>
        {layout === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            <AnimatePresence>
              {displaySuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAddFriend={() => onAddFriend(suggestion.id)}
                  onRemove={onRemoveSuggestion ? () => onRemoveSuggestion(suggestion.id) : undefined}
                  loading={loading}
                  layout={layout}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            <AnimatePresence>
              {displaySuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAddFriend={() => onAddFriend(suggestion.id)}
                  onRemove={onRemoveSuggestion ? () => onRemoveSuggestion(suggestion.id) : undefined}
                  loading={loading}
                  layout={layout}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Show more/less toggle */}
      {hasMore && (
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            className="w-full text-sm text-blue-500 hover:bg-gray-50"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                See All Suggestions ({suggestions.length - maxDisplay} more)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact suggestion card for sidebar
interface SuggestionPreviewProps {
  suggestions: SuggestedFriend[];
  onAddFriend: (userId: string) => void;
  onViewAll?: () => void;
}

export function SuggestionPreview({
  suggestions,
  onAddFriend,
  onViewAll,
}: SuggestionPreviewProps) {
  const displaySuggestions = suggestions.slice(0, 3);

  if (suggestions.length === 0) return null;

  return (
    <div className="py-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h4 className="text-sm font-semibold text-gray-500">People You May Know</h4>
      </div>

      {/* Suggestions list */}
      <div className="space-y-2">
        {displaySuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center gap-2 px-4 py-1.5"
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src={suggestion.avatar} />
              <AvatarFallback className="bg-gray-200 text-xs">
                {getInitials(suggestion.firstName, suggestion.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {suggestion.firstName} {suggestion.lastName}
              </p>

              {suggestion.mutualFriends > 0 && (
                <p className="text-xs text-gray-500">
                  {suggestion.mutualFriends} mutual
                </p>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-blue-500 hover:bg-blue-50"
              onClick={() => onAddFriend(suggestion.id)}
            >
              Add
            </Button>
          </div>
        ))}
      </div>

      {/* See all */}
      {suggestions.length > 3 && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full text-center text-sm text-blue-600 hover:bg-gray-50 py-2 mt-1"
        >
          See All Suggestions
        </button>
      )}
    </div>
  );
}
