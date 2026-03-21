'use client';

import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Video, Smile, Calendar, Newspaper } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import { CreatePostModal } from './CreatePostModal';
import type { User } from '@/types';

interface CreatePostProps {
  currentUser: User;
  friends?: User[];
  onCreatePost: (data: {
    content?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    visibility?: string;
    feeling?: string;
    location?: string;
    taggedFriends?: string[];
    backgroundColor?: string;
  }) => Promise<void>;
}

export function CreatePost({ currentUser, friends = [], onCreatePost }: CreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Main create post card */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        {/* Top row with avatar and input trigger */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 cursor-pointer">
            <AvatarImage src={currentUser.avatar} alt={`${currentUser.firstName}'s avatar`} />
            <AvatarFallback>{getInitials(currentUser.firstName, currentUser.lastName)}</AvatarFallback>
          </Avatar>
          
          <button
            onClick={handleOpenModal}
            className="flex-1 text-left bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2.5 text-gray-500 transition-colors"
          >
            What&apos;s on your mind, {currentUser.firstName}?
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-3" />

        {/* Action buttons row */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center"
          >
            <Video className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600 hidden sm:inline">Live video</span>
          </button>
          
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center"
          >
            <ImageIcon className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600 hidden sm:inline">Photo/video</span>
          </button>
          
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center"
          >
            <Smile className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600 hidden sm:inline">Feeling/activity</span>
          </button>
        </div>
      </div>

      {/* Create post modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreate={onCreatePost}
        currentUser={currentUser}
        friends={friends}
      />
    </>
  );
}

export default CreatePost;
