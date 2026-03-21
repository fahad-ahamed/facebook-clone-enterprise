'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Waves } from 'lucide-react';
import { cn } from '@/utils/cn';

interface VoiceMessagePlayerProps {
  /** Duration of the voice message in seconds */
  duration: number;
  /** URL of the audio file */
  mediaUrl: string;
  /** Whether this is the user's own message */
  isOwn?: boolean;
  /** Additional class names */
  className?: string;
}

// Format duration as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * VoiceMessagePlayer component provides playback controls
 * for voice messages with play/pause, progress bar, and duration display.
 */
export const VoiceMessagePlayer = memo(function VoiceMessagePlayer({
  duration,
  mediaUrl,
  isOwn = false,
  className
}: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Handle play/pause
  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsLoading(false);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle seek
  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  // Handle audio end
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-2xl',
      isOwn ? 'bg-blue-600' : 'bg-gray-100',
      className
    )}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={mediaUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedData={() => setIsLoading(false)}
        preload="metadata"
      />

      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlayPause}
        disabled={isLoading}
        className={cn(
          'h-9 w-9 rounded-full flex-shrink-0',
          isOwn 
            ? 'text-white hover:bg-blue-700' 
            : 'text-gray-700 hover:bg-gray-200'
        )}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </Button>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center gap-0.5">
        <Waves className={cn(
          'w-4 h-4 flex-shrink-0',
          isOwn ? 'text-blue-200' : 'text-gray-400'
        )} />
        
        {/* Progress slider */}
        <div className="flex-1 mx-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className={cn(
              'cursor-pointer',
              isOwn ? 'opacity-90' : ''
            )}
          />
        </div>
      </div>

      {/* Duration display */}
      <span className={cn(
        'text-xs font-medium flex-shrink-0 min-w-[40px] text-right',
        isOwn ? 'text-blue-100' : 'text-gray-500'
      )}>
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
});

export default VoiceMessagePlayer;
