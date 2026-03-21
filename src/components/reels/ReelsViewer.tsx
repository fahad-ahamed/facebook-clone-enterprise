'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Play,
  Music,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber, getInitials } from '@/utils/stringUtils';
import { formatTimeAgo } from '@/utils/dateUtils';

// Reel type definition
export interface Reel {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  caption?: string | null;
  audio?: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
    isVerified?: boolean;
    isOnline?: boolean;
  };
  comments?: ReelComment[];
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface ReelComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  };
}

interface ReelsViewerProps {
  reels: Reel[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onLike?: (reelId: string) => void;
  onComment?: (reelId: string, content: string) => void;
  onShare?: (reelId: string) => void;
  onSave?: (reelId: string) => void;
  onClose?: () => void;
}

// Internal component for a single reel - gets remounted when reel changes
interface SingleReelProps {
  reel: Reel;
  onVideoEnd: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onComment: (content: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function SingleReel({
  reel,
  onVideoEnd,
  onLike,
  onSave,
  onShare,
  onComment,
  onClose,
  hasPrev,
  hasNext,
}: SingleReelProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [isSaved, setIsSaved] = useState(reel.isSaved || false);
  const [likeAnimation, setLikeAnimation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse audio info
  const audioInfo = useMemo(() => {
    if (!reel.audio) return null;
    try {
      return JSON.parse(reel.audio);
    } catch {
      return null;
    }
  }, [reel.audio]);

  // Handle video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Update progress interval
  useEffect(() => {
    if (!isPlaying || !videoRef.current) return;

    const updateProgress = () => {
      if (videoRef.current) {
        const duration = videoRef.current.duration;
        const currentTime = videoRef.current.currentTime;
        setProgress((currentTime / duration) * 100);
      }
    };

    progressIntervalRef.current = setInterval(updateProgress, 100);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'k':
        case 'K':
          setIsPlaying(prev => !prev);
          break;
        case 'm':
        case 'M':
          setIsMuted(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleVideoClick = () => {
    setIsPlaying(prev => !prev);
  };

  const handleVideoEnd = () => {
    onVideoEnd();
  };

  const handleLike = () => {
    setIsLiked(prev => !prev);
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 1000);
    onLike();
  };

  const handleSave = () => {
    setIsSaved(prev => !prev);
    onSave();
  };

  const handleComment = () => {
    if (commentText.trim()) {
      onComment(commentText);
      setCommentText('');
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
  };

  return (
    <>
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Main video container */}
      <div className="relative w-full max-w-md h-full flex items-center justify-center">
        {/* Video */}
        <div
          className="relative w-full h-full max-h-[calc(100vh-2rem)] aspect-[9/16] cursor-pointer"
          onClick={handleVideoClick}
          onDoubleClick={handleDoubleTap}
        >
          <video
            ref={videoRef}
            src={reel.videoUrl}
            poster={reel.thumbnailUrl || undefined}
            className="w-full h-full object-cover rounded-xl"
            loop={false}
            muted={isMuted}
            playsInline
            onEnded={handleVideoEnd}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Play/Pause overlay */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl"
              >
                <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Like animation */}
          <AnimatePresence>
            {likeAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.5 }}
                exit={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <motion.div
              className="h-full bg-white"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        {/* Navigation arrows (desktop) */}
        <div className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 z-20">
          {hasPrev && (
            <button
              onClick={onPrev}
              className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        <div className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 z-20">
          {hasNext && (
            <button
              onClick={onVideoEnd}
              className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        {/* Right side actions */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-4 items-center">
          {/* Like */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleLike}
              className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <Heart
                className={cn(
                  'w-7 h-7 transition-colors',
                  isLiked ? 'text-red-500 fill-red-500' : 'text-white'
                )}
              />
            </button>
            <span className="text-white text-xs font-medium mt-1">
              {formatNumber(reel.likeCount + (isLiked ? 1 : 0))}
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowComments(true)}
              className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </button>
            <span className="text-white text-xs font-medium mt-1">
              {formatNumber(reel.commentCount)}
            </span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <button
              onClick={onShare}
              className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <Share2 className="w-7 h-7 text-white" />
            </button>
            <span className="text-white text-xs font-medium mt-1">
              {formatNumber(reel.shareCount)}
            </span>
          </div>

          {/* Save */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleSave}
              className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            >
              <Bookmark
                className={cn(
                  'w-7 h-7 transition-colors',
                  isSaved ? 'text-white fill-white' : 'text-white'
                )}
              />
            </button>
            <span className="text-white text-xs font-medium mt-1">
              {formatNumber(reel.saveCount + (isSaved ? 1 : 0))}
            </span>
          </div>

          {/* Mute */}
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-7 h-7 text-white" />
            ) : (
              <Volume2 className="w-7 h-7 text-white" />
            )}
          </button>

          {/* More options */}
          <button className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors">
            <MoreHorizontal className="w-7 h-7 text-white" />
          </button>
        </div>

        {/* Bottom overlay with user info and caption */}
        <div className="absolute bottom-0 left-0 right-16 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16 rounded-b-xl">
          {/* User info */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={reel.user.avatar || undefined} />
              <AvatarFallback>
                {getInitials(reel.user.firstName, reel.user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">
                  {reel.user.firstName} {reel.user.lastName}
                </span>
                {reel.user.isVerified && (
                  <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0 h-5">
                    ✓
                  </Badge>
                )}
              </div>
              <button className="text-blue-400 text-sm font-medium hover:underline">
                Follow
              </button>
            </div>
          </div>

          {/* Caption */}
          {reel.caption && (
            <p className="text-white text-sm line-clamp-2 mb-2">
              {reel.caption}
            </p>
          )}

          {/* Audio info */}
          {audioInfo && (
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Music className="w-4 h-4" />
              <span className="truncate">
                {audioInfo.name}
                {audioInfo.artist && ` - ${audioInfo.artist}`}
              </span>
            </div>
          )}

          {/* View count */}
          <p className="text-white/60 text-xs mt-2">
            {formatNumber(reel.viewCount)} views · {formatTimeAgo(reel.createdAt)}
          </p>
        </div>
      </div>

      {/* Comments Sheet */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-30"
            onClick={() => setShowComments(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl max-h-[70vh] flex flex-col"
            >
              {/* Comments header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-lg">Comments</h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {reel.comments && reel.comments.length > 0 ? (
                  reel.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.user?.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {comment.user
                            ? getInitials(comment.user.firstName, comment.user.lastName)
                            : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-2xl px-3 py-2">
                          <p className="font-medium text-sm">
                            {comment.user?.firstName} {comment.user?.lastName}
                          </p>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <div className="flex gap-4 mt-1 px-2 text-xs text-gray-500">
                          <span>{formatTimeAgo(comment.createdAt)}</span>
                          <button className="font-medium hover:underline">Like</button>
                          <button className="font-medium hover:underline">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No comments yet</p>
                    <p className="text-sm">Be the first to comment!</p>
                  </div>
                )}
              </div>

              {/* Comment input */}
              <div className="border-t p-4 flex gap-2">
                <Input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                  placeholder="Add a comment..."
                  className="flex-1"
                />
                <Button
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Add useMemo import
import { useMemo } from 'react';

export function ReelsViewer({
  reels,
  currentIndex,
  onNext,
  onPrev,
  onLike,
  onComment,
  onShare,
  onSave,
  onClose,
}: ReelsViewerProps) {
  const currentReel = reels[currentIndex];

  // Touch/swipe handling
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (diff > 50) {
      onNext();
    } else if (diff < -50) {
      onPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowDown':
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          onNext();
          break;
        case 'Escape':
          onClose?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose]);

  if (!currentReel) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Key prop causes remount when currentIndex changes, resetting all internal state */}
      <SingleReel
        key={currentReel.id}
        reel={currentReel}
        onVideoEnd={onNext}
        onLike={() => onLike?.(currentReel.id)}
        onSave={() => onSave?.(currentReel.id)}
        onShare={() => onShare?.(currentReel.id)}
        onComment={(content) => onComment?.(currentReel.id, content)}
        onNext={onNext}
        onPrev={onPrev}
        onClose={onClose}
        hasPrev={currentIndex > 0}
        hasNext={currentIndex < reels.length - 1}
      />
    </div>
  );
}
