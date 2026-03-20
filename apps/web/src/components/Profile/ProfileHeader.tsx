'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation } from '@apollo/client';
import {
  Camera,
  MoreHorizontal,
  Plus,
  MessageCircle,
  UserPlus,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { ADD_FRIEND, FOLLOW_USER } from '@/graphql/mutations/socialMutations';
import type { UserProfile } from '@/types/user';
import { toast } from '@/components/providers/ToastProvider';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const [showCoverOptions, setShowCoverOptions] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [addFriend, { loading: addingFriend }] = useMutation(ADD_FRIEND);
  const [followUser, { loading: following }] = useMutation(FOLLOW_USER);

  const handleAddFriend = async () => {
    try {
      await addFriend({
        variables: { userId: profile.id },
      });
      toast.success('Friend request sent!');
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  const handleFollow = async () => {
    try {
      await followUser({
        variables: { userId: profile.id },
      });
      toast.success(profile.isFollowing ? 'Unfollowed' : 'Following');
    } catch (error) {
      toast.error('Failed to follow user');
    }
  };

  const {
    firstName,
    lastName,
    avatar,
    coverPhoto,
    bio,
    location,
    workplace,
    education,
    relationshipStatus,
    friendCount,
    followerCount,
    followingCount,
    isFriend,
    isFollowing,
    hasPendingRequest,
  } = profile;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow">
      {/* Cover Photo */}
      <div className="relative h-[300px] md:h-[350px] group">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt="Cover photo"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500" />
        )}

        {/* Cover Photo Edit Button */}
        {isOwnProfile && (
          <button
            onClick={() => setShowCoverOptions(!showCoverOptions)}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">Edit cover photo</span>
          </button>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-16 left-8 md:left-16">
          <div className="relative">
            <div className="w-36 h-36 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-200 dark:bg-gray-600">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={`${firstName} ${lastName}`}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-500 dark:text-gray-400">
                  {firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Avatar Edit Button */}
            {isOwnProfile && (
              <button
                onClick={() => setShowAvatarOptions(!showAvatarOptions)}
                className="absolute bottom-2 right-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
        />
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Profile Info */}
      <div className="pt-20 pb-4 px-8 md:px-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          {/* Name and Stats */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {firstName} {lastName}
              {profile.isVerified && (
                <CheckCircle className="w-6 h-6 text-blue-500" />
              )}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {friendCount?.toLocaleString()} friends
            </p>

            {/* Mutual Friends */}
            {profile.mutualFriends && profile.mutualFriends.length > 0 && !isOwnProfile && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex -space-x-2">
                  {profile.mutualFriends.slice(0, 3).map((friend) => (
                    <div
                      key={friend.id}
                      className="w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-gray-800"
                    >
                      {friend.avatar ? (
                        <Image
                          src={friend.avatar}
                          alt={friend.firstName}
                          width={24}
                          height={24}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-600" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {profile.mutualFriends.length} mutual friend{profile.mutualFriends.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <>
                <Link
                  href="/profile/edit"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit profile
                </Link>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Plus className="w-5 h-5" />
                  Add story
                </button>
              </>
            ) : (
              <>
                {isFriend ? (
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    <CheckCircle className="w-5 h-5" />
                    Friends
                  </button>
                ) : hasPendingRequest ? (
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold text-gray-700 dark:text-gray-200">
                    <Lock className="w-5 h-5" />
                    Request Sent
                  </button>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    disabled={addingFriend}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    <UserPlus className="w-5 h-5" />
                    Add Friend
                  </button>
                )}
                <button
                  onClick={handleFollow}
                  disabled={following}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                    isFollowing
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
                  <MessageCircle className="w-5 h-5" />
                  Message
                </button>
                <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                  <MoreHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio and Info */}
        {(bio || location || workplace || education || relationshipStatus) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
            {bio && <p className="font-medium">{bio}</p>}
            {location && (
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Lives in <span className="font-medium">{location}</span>
              </p>
            )}
            {workplace && (
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Works at <span className="font-medium">{workplace}</span>
              </p>
            )}
            {education && (
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                Studied at <span className="font-medium">{education}</span>
              </p>
            )}
            {relationshipStatus && (
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="font-medium">{relationshipStatus}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-8 md:px-16">
        <nav className="flex gap-1 overflow-x-auto hide-scrollbar">
          {['Posts', 'About', 'Friends', 'Photos', 'Videos', 'Check-ins', 'More'].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === 'Posts'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
