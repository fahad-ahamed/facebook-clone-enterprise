'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Smile,
  Send,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatTimeAgo } from '@/utils/dateUtils';
import { getInitials } from '@/utils/stringUtils';
import type { Story, User } from '@/types';
import { REACTIONS } from '@/types';

interface StoryViewerProps {
  stories: (Story & { isViewed?: boolean })[];
  user: User;
  initialIndex?: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onReact?: (storyId: string, type: string) => void;
  onView?: (storyId: string) => void;
}

const STORY_DURATION = 10000; // 10 seconds per story

export function StoryViewer({
  stories,
  user,
  initialIndex = 0,
  onClose,
  onNext,
  onPrev,
  onReact,
  onView
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [message, setMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentStory = stories[currentIndex];
  
  // Compute isVideo from current story - no need for state
  const isVideo = currentStory?.mediaType === 'video';
  
  // Navigation handlers - defined first since they're used in effects
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // End of stories - call onNext or close
      if (onNext) {
        onNext();
      } else {
        onClose();
      }
    }
  }, [currentIndex, stories.length, onNext, onClose]);
  
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else if (onPrev) {
      onPrev();
    }
  }, [currentIndex, onPrev]);
  
  // Video event handlers
  const handleVideoPlay = () => setIsPaused(false);
  const handleVideoPause = () => setIsPaused(true);
  const handleVideoEnded = () => handleNext();
  
  // Handle story progress and auto-advance
  useEffect(() => {
    if (isPaused || !currentStory) return;
    
    // Mark story as viewed
    if (onView && !currentStory.isViewed) {
      onView(currentStory.id);
    }
    
    const startTime = Date.now();
    const duration = isVideo ? (videoRef.current?.duration || 0) * 1000 : STORY_DURATION;
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        handleNext();
      } else {
        timerRef.current = setTimeout(updateProgress, 50);
      }
    };
    
    timerRef.current = setTimeout(updateProgress, 50);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, isPaused, currentStory, isVideo, handleNext, onView]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);
  
  const handleReaction = (type: string) => {
    if (currentStory && onReact) {
      onReact(currentStory.id, type);
    }
    setShowReactions(false);
  };
  
  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle message send - would typically call an API
      console.log('Send message:', message, 'to story:', currentStory?.id);
      setMessage('');
    }
  };
  
  // Click areas for navigation
  const handleContentClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 3) {
      handlePrev();
    } else if (x > (width * 2) / 3) {
      handleNext();
    } else {
      setIsPaused(prev => !prev);
    }
  };
  
  if (!currentStory) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      
      {/* Story container */}
      <div className="relative w-full max-w-md h-full max-h-[90vh] md:max-h-[85vh] aspect-[9/16]">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {stories.map((story, index) => (
            <div
              key={story.id}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width: index < currentIndex 
                    ? '100%' 
                    : index === currentIndex 
                      ? `${progress}%` 
                      : '0%'
                }}
              />
            </div>
          ))}
        </div>
        
        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gray-700 text-white text-xs">
                {getInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium drop-shadow-md">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-white/70 text-xs">
                {formatTimeAgo(currentStory.createdAt)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Pause/Play indicator */}
            <AnimatePresence>
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center"
                >
                  <Play className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* More options */}
            <button className="w-8 h-8 rounded-full hover:bg-black/30 flex items-center justify-center transition-colors">
              <MoreHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        {/* Navigation arrows - only show on larger screens */}
        <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10">
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors ml-2"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
        
        <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10">
          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors mr-2"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
        
        {/* Story content - clickable for navigation */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={handleContentClick}
        >
          {/* Media content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStory.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              {isVideo ? (
                <video
                  ref={videoRef}
                  src={currentStory.mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnded}
                />
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-cover"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Caption overlay */}
        {currentStory.caption && (
          <div className="absolute bottom-24 left-4 right-4 z-10">
            <p className="text-white text-sm font-medium drop-shadow-lg text-center">
              {currentStory.caption}
            </p>
          </div>
        )}
        
        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/60 to-transparent">
          {/* Reaction picker */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex justify-center gap-2 mb-3"
              >
                {REACTIONS.map(reaction => (
                  <button
                    key={reaction.type}
                    onClick={() => handleReaction(reaction.type)}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl transition-colors backdrop-blur-sm"
                  >
                    {reaction.icon}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Message input */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReactions(prev => !prev)}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                showReactions ? "bg-blue-500" : "bg-white/10 hover:bg-white/20"
              )}
            >
              <Smile className={cn("w-5 h-5", showReactions ? "text-white" : "text-white")} />
            </button>
            
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Send a message..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/30"
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
