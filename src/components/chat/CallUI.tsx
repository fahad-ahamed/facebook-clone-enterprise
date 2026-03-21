'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import type { User } from '@/types';

type CallState = 'calling' | 'ringing' | 'connected' | 'ended';
type CallType = 'audio' | 'video';

interface CallUIProps {
  /** Current state of the call */
  callState: CallState;
  /** Type of call (audio or video) */
  callType: CallType;
  /** Duration of the call in seconds */
  callDuration: number;
  /** The other user in the call */
  otherUser: User;
  /** Handler for answering an incoming call */
  onAnswer: () => void;
  /** Handler for declining an incoming call */
  onDecline: () => void;
  /** Handler for ending the call */
  onEnd: () => void;
  /** Additional class names */
  className?: string;
}

// Waveform animation component for active calls
const WaveformAnimation = memo(function WaveformAnimation({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-green-400 rounded-full"
          animate={isActive ? {
            height: [8, 24, 16, 24, 8],
          } : { height: 8 }}
          transition={{
            duration: 0.8,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.1,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
});

// Format duration as MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * CallUI component provides a full-screen interface for audio and video calls
 * with caller info, duration timer, and call controls.
 */
export const CallUI = memo(function CallUI({
  callState,
  callType,
  callDuration,
  otherUser,
  onAnswer,
  onDecline,
  onEnd,
  className
}: CallUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Determine if this is an incoming call
  const isIncoming = callState === 'ringing';
  const isActive = callState === 'connected';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900',
        className
      )}
    >
      {/* Close button for ended calls */}
      {callState === 'ended' && (
        <button
          onClick={onEnd}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-700/50 hover:bg-gray-700 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 px-4">
        {/* User avatar with pulse animation */}
        <div className="relative">
          <motion.div
            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative"
          >
            <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl">
              <AvatarImage src={otherUser.avatar} />
              <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(otherUser.firstName, otherUser.lastName)}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Ringing animation */}
          {(callState === 'calling' || callState === 'ringing') && (
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-4 border-green-400"
            />
          )}
        </div>

        {/* User info */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">
            {otherUser.firstName} {otherUser.lastName}
          </h2>
          <p className="text-gray-400 mt-1">
            {callState === 'calling' && 'Calling...'}
            {callState === 'ringing' && 'Incoming call...'}
            {callState === 'connected' && (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {formatDuration(callDuration)}
              </span>
            )}
            {callState === 'ended' && 'Call ended'}
          </p>
        </div>

        {/* Waveform for active calls */}
        {isActive && <WaveformAnimation isActive={isActive} />}

        {/* Call controls */}
        <div className="flex items-center gap-4 mt-4">
          {/* Incoming call: Answer/Decline */}
          {isIncoming && (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAnswer}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
              >
                <Phone className="w-7 h-7 text-white" />
              </motion.button>
            </>
          )}

          {/* Active call: Controls */}
          {isActive && (
            <>
              {/* Mute toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors',
                  isMuted ? 'bg-red-500' : 'bg-gray-700'
                )}
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </motion.button>

              {/* Video toggle (for video calls) */}
              {callType === 'video' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors',
                    !isVideoEnabled ? 'bg-red-500' : 'bg-gray-700'
                  )}
                >
                  {isVideoEnabled ? (
                    <Video className="w-6 h-6 text-white" />
                  ) : (
                    <VideoOff className="w-6 h-6 text-white" />
                  )}
                </motion.button>
              )}

              {/* Speaker toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors',
                  !isSpeakerOn ? 'bg-red-500' : 'bg-gray-700'
                )}
              >
                {isSpeakerOn ? (
                  <Volume2 className="w-6 h-6 text-white" />
                ) : (
                  <VolumeX className="w-6 h-6 text-white" />
                )}
              </motion.button>

              {/* End call */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
            </>
          )}

          {/* Outgoing call: End button */}
          {callState === 'calling' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEnd}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Video preview area for video calls */}
      {callType === 'video' && isActive && isVideoEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-24 right-4 w-32 h-44 bg-gray-700 rounded-lg overflow-hidden shadow-xl"
        >
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
            <span className="text-xs text-gray-400">Your camera</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

export default CallUI;
