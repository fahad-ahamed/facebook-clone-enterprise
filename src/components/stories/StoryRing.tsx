'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import type { Story, User } from '@/types';

interface StoryRingProps {
  story?: {
    user: User;
    stories: (Story & { isViewed: boolean })[];
  };
  isCreate?: boolean;
  currentUser?: User;
  onClick: () => void;
}

// Gradient ring colors for unviewed stories - mimics Instagram/Facebook style
const GRADIENT_COLORS = 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600';

export function StoryRing({ story, isCreate, currentUser, onClick }: StoryRingProps) {
  // Check if any story in the group hasn't been viewed
  const hasUnviewedStories = story?.stories.some(s => !s.isViewed) ?? false;
  
  // Get display user - either the story author or current user for create
  const displayUser = isCreate ? currentUser : story?.user;
  
  // Get user display name
  const displayName = displayUser 
    ? `${displayUser.firstName} ${displayUser.lastName}`
    : '';
  
  // First story preview thumbnail (for the ring)
  const firstStory = story?.stories[0];
  const thumbnailUrl = firstStory?.mediaUrl;
  
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {/* Story ring container */}
      <div className="relative">
        {/* Gradient ring - only show if there are unviewed stories */}
        {!isCreate && hasUnviewedStories && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full p-[3px]",
              GRADIENT_COLORS
            )}
          >
            {/* Inner white padding to create ring effect */}
            <div className="w-full h-full rounded-full bg-white" />
          </div>
        )}
        
        {/* Gray ring for viewed stories */}
        {!isCreate && !hasUnviewedStories && (
          <div className="absolute inset-0 rounded-full p-[3px] bg-gray-300">
            <div className="w-full h-full rounded-full bg-white" />
          </div>
        )}
        
        {/* Avatar/image container */}
        <div 
          className={cn(
            "relative rounded-full overflow-hidden",
            !isCreate && "p-[3px]" // Add padding to show the ring
          )}
        >
          {isCreate ? (
            // Create story button
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-gray-200">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="bg-gray-100 text-gray-600">
                  {currentUser && getInitials(currentUser.firstName, currentUser.lastName)}
                </AvatarFallback>
              </Avatar>
              {/* Plus icon overlay */}
              <motion.div 
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                whileHover={{ backgroundColor: '#1d4ed8' }}
              >
                <Plus className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          ) : (
            // Story preview avatar
            <Avatar className="w-16 h-16">
              {thumbnailUrl ? (
                <AvatarImage src={thumbnailUrl} alt={displayName} />
              ) : (
                <AvatarImage src={displayUser?.avatar} />
              )}
              <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                {displayUser && getInitials(displayUser.firstName, displayUser.lastName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        
        {/* Story count badge for multiple stories */}
        {!isCreate && story && story.stories.length > 1 && (
          <div className="absolute -bottom-1 -right-1 min-w-[20px] h-5 bg-blue-500 rounded-full flex items-center justify-center px-1.5 border-2 border-white">
            <span className="text-white text-xs font-bold">{story.stories.length}</span>
          </div>
        )}
      </div>
      
      {/* Username label */}
      <span className={cn(
        "text-xs max-w-[72px] truncate text-center",
        isCreate ? "text-gray-900 font-medium" : "text-gray-600"
      )}>
        {isCreate ? 'Create Story' : displayName}
      </span>
    </motion.button>
  );
}
