'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Story } from '@/types/story';

// Mock stories data
const mockStories: (Story & { isOwn?: boolean })[] = [
  {
    id: 'own',
    isOwn: true,
    user: {
      id: 'me',
      firstName: 'Your',
      lastName: 'Story',
      avatar: '/avatars/me.jpg',
    },
    items: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '1',
    user: {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      avatar: '/avatars/john.jpg',
    },
    items: [{ id: 's1', mediaUrl: '/stories/story1.jpg' }],
    createdAt: new Date().toISOString(),
    hasUnseen: true,
  },
  {
    id: '2',
    user: {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      avatar: '/avatars/jane.jpg',
    },
    items: [{ id: 's2', mediaUrl: '/stories/story2.jpg' }],
    createdAt: new Date().toISOString(),
    hasUnseen: true,
  },
  {
    id: '3',
    user: {
      id: '3',
      firstName: 'Mike',
      lastName: 'Johnson',
      avatar: '/avatars/mike.jpg',
    },
    items: [{ id: 's3', mediaUrl: '/stories/story3.jpg' }],
    createdAt: new Date().toISOString(),
    hasUnseen: false,
  },
  {
    id: '4',
    user: {
      id: '4',
      firstName: 'Sarah',
      lastName: 'Williams',
      avatar: '/avatars/sarah.jpg',
    },
    items: [{ id: 's4', mediaUrl: '/stories/story4.jpg' }],
    createdAt: new Date().toISOString(),
    hasUnseen: true,
  },
  {
    id: '5',
    user: {
      id: '5',
      firstName: 'David',
      lastName: 'Brown',
      avatar: '/avatars/david.jpg',
    },
    items: [{ id: 's5', mediaUrl: '/stories/story5.jpg' }],
    createdAt: new Date().toISOString(),
    hasUnseen: false,
  },
];

export function StoriesSection() {
  const [stories] = useState(mockStories);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const newPosition = direction === 'left' 
      ? scrollPosition - scrollAmount 
      : scrollPosition + scrollAmount;
    
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = containerRef.current 
    ? scrollPosition < containerRef.current.scrollWidth - containerRef.current.clientWidth 
    : true;

  return (
    <>
      <div className="relative mb-4">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}
        
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Stories Container */}
        <div
          ref={containerRef}
          className="flex gap-2 overflow-x-auto hide-scrollbar py-2 px-1"
          onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
        >
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onClick={() => setActiveStory(story.id)}
            />
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {activeStory && (
        <StoryViewer
          story={stories.find((s) => s.id === activeStory)!}
          onClose={() => setActiveStory(null)}
        />
      )}
    </>
  );
}

import React from 'react';

interface StoryCardProps {
  story: Story & { isOwn?: boolean };
  onClick: () => void;
}

function StoryCard({ story, onClick }: StoryCardProps) {
  const { user, hasUnseen, isOwn } = story;

  if (isOwn) {
    return (
      <button
        onClick={onClick}
        className="relative flex-shrink-0 w-28 h-48 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow group"
      >
        {/* Create Story Button */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center ring-4 ring-white dark:ring-gray-800 -mt-4">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium mt-2">Create Story</span>
        </div>
        
        {/* User Avatar Background */}
        <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt="Your avatar"
              width={112}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-600" />
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 w-28 h-48 rounded-xl overflow-hidden shadow group"
    >
      {/* Story Background */}
      <Image
        src={story.items[0]?.mediaUrl || '/placeholder-story.jpg'}
        alt={`${user.firstName}'s story`}
        width={112}
        height={192}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      {/* Ring around avatar */}
      <div className={`absolute top-3 left-3 rounded-full p-0.5 ${
        hasUnseen 
          ? 'bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500' 
          : 'bg-gray-300 dark:bg-gray-600'
      }`}>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-white dark:bg-gray-800 p-0.5">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.firstName}
              width={36}
              height={36}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-600 rounded-full" />
          )}
        </div>
      </div>

      {/* User Name */}
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white text-xs font-medium truncate">
          {user.firstName} {user.lastName}
        </p>
      </div>
    </button>
  );
}

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
}

function StoryViewer({ story, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Story Content */}
      <div className="relative max-w-md w-full h-full max-h-[80vh] flex flex-col">
        {/* Progress Bar */}
        <div className="absolute top-4 left-4 right-4 flex gap-1">
          {story.items.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded overflow-hidden"
            >
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  index < currentIndex ? 'w-full' : index === currentIndex ? 'w-1/2' : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* User Info */}
        <div className="absolute top-10 left-4 right-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {story.user.avatar && (
              <Image
                src={story.user.avatar}
                alt={story.user.firstName}
                width={40}
                height={40}
                className="object-cover"
              />
            )}
          </div>
          <div>
            <p className="text-white font-semibold">
              {story.user.firstName} {story.user.lastName}
            </p>
            <p className="text-white/70 text-xs">2h ago</p>
          </div>
        </div>

        {/* Story Media */}
        <div 
          className="flex-1 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {story.items[currentIndex]?.mediaUrl && (
            <Image
              src={story.items[currentIndex].mediaUrl}
              alt="Story"
              width={400}
              height={700}
              className="max-h-full object-contain"
            />
          )}
        </div>

        {/* Navigation Areas */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(Math.max(0, currentIndex - 1));
          }}
          className="absolute left-0 top-0 bottom-0 w-1/3 cursor-w-resize"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentIndex < story.items.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              onClose();
            }
          }}
          className="absolute right-0 top-0 bottom-0 w-1/3 cursor-e-resize"
        />
      </div>
    </div>
  );
}
