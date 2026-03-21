// Profile header component - displays cover photo, avatar, name, bio, and actions
// Added support for own profile vs other profiles

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  UserPlus,
  MessageCircle,
  UserCheck,
  MoreHorizontal,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Lock,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials, formatNumber } from '@/utils/stringUtils';
import type { User } from '@/types';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  onEdit: () => void;
  onAddFriend?: () => void;
  onMessage?: () => void;
  onFollow?: () => void;
  isFriend?: boolean;
  isFollowing?: boolean;
  isLoading?: boolean;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  onEdit,
  onAddFriend,
  onMessage,
  onFollow,
  isFriend = false,
  isFollowing = false,
  isLoading = false,
}: ProfileHeaderProps) {
  const [showCoverMenu, setShowCoverMenu] = useState(false);

  const getBadgeColor = () => {
    switch (user.badgeType) {
      case 'blue':
        return 'bg-blue-500';
      case 'gold':
        return 'bg-yellow-500';
      case 'gray':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Cover Photo */}
      <div className="relative h-48 md:h-64 lg:h-80 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 group">
        {user.coverPhoto && (
          <img
            src={user.coverPhoto}
            alt="Cover photo"
            className="w-full h-full object-cover"
          />
        )}

        {/* Cover edit button - only for own profile */}
        {isOwnProfile && (
          <motion.button
            initial={{ opacity: 0 }}
            whileHover={{ scale: 1.02 }}
            className="absolute bottom-4 right-4 bg-white/90 hover:bg-white rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-medium shadow transition-all"
            onClick={onEdit}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Cover Photo</span>
            <span className="sm:hidden">Edit</span>
          </motion.button>
        )}

        {/* Profile locked indicator */}
        {user.isProfileLocked && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Profile Locked
          </div>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="relative px-4 pb-4">
        {/* Avatar */}
        <div className="absolute -top-16 left-4 md:left-8">
          <div className="relative">
            <Avatar className="w-32 h-32 md:w-36 md:h-36 border-4 border-white shadow-xl">
              <AvatarImage src={user.avatar} className="object-cover" />
              <AvatarFallback className="text-3xl bg-gray-200">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>

            {/* Online indicator */}
            {user.isOnline && (
              <div className="absolute bottom-3 right-3 w-5 h-5 bg-green-500 rounded-full border-3 border-white" />
            )}

            {/* Edit avatar button - only for own profile */}
            {isOwnProfile && (
              <button
                onClick={onEdit}
                className="absolute bottom-1 right-1 bg-gray-100 hover:bg-gray-200 rounded-full p-2 shadow transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons - positioned to the right on desktop */}
        <div className="flex justify-end pt-4 gap-2">
          {isOwnProfile ? (
            <>
              <Button
                variant="outline"
                onClick={onEdit}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                Edit Profile
              </Button>
            </>
          ) : (
            <>
              {isFriend ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled
                >
                  <UserCheck className="w-4 h-4" />
                  Friends
                </Button>
              ) : (
                <Button
                  onClick={onAddFriend}
                  disabled={isLoading}
                  className="gap-2 bg-[#1877F2] hover:bg-[#166FE5]"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onMessage}
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </Button>
              <Button
                variant={isFollowing ? 'outline' : 'default'}
                onClick={onFollow}
                disabled={isLoading}
                className={cn(
                  "gap-2",
                  !isFollowing && "bg-[#1877F2] hover:bg-[#166FE5]"
                )}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </>
          )}
        </div>

        {/* Name and Info */}
        <div className="mt-14 md:mt-6 md:ml-44">
          {/* Name */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            {user.badgeType && (
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                getBadgeColor()
              )}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>

          {/* Username */}
          {user.username && (
            <p className="text-gray-500 text-sm mt-1">@{user.username}</p>
          )}

          {/* Bio */}
          {user.bio && (
            <p className="text-gray-700 mt-2 max-w-lg">{user.bio}</p>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
            {user.friendCount !== undefined && (
              <span className="font-semibold">
                {formatNumber(user.friendCount)} <span className="font-normal">friends</span>
              </span>
            )}
            {user.followerCount !== undefined && (
              <span className="font-semibold">
                {formatNumber(user.followerCount)} <span className="font-normal">followers</span>
              </span>
            )}
            {user.followingCount !== undefined && (
              <span className="font-semibold">
                {formatNumber(user.followingCount)} <span className="font-normal">following</span>
              </span>
            )}
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap gap-3 mt-4 text-sm text-gray-600">
            {user.currentCity && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>Lives in <strong>{user.currentCity}</strong></span>
              </div>
            )}
            {user.hometown && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>From <strong>{user.hometown}</strong></span>
              </div>
            )}
            {user.workplace && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                <span>Works at <strong>{user.workplace}</strong></span>
              </div>
            )}
            {user.education && (
              <div className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4" />
                <span>Studied at <strong>{user.education}</strong></span>
              </div>
            )}
            {user.country && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span><strong>{user.country}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View as visitor button for own profile */}
      {isOwnProfile && (
        <div className="px-4 py-3 border-t bg-gray-50">
          <Button variant="link" className="text-[#1877F2] p-0 h-auto text-sm">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            View as visitor
          </Button>
        </div>
      )}
    </div>
  );
}
