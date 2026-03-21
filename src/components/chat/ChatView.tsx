'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Phone,
  Video,
  Image as ImageIcon,
  Paperclip,
  Mic,
  MicOff,
  Send,
  Smile,
  MoreVertical,
  Shield,
  CheckCheck,
  FileText,
  Video as VideoIcon,
  Music,
  Play
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatTimeAgo } from '@/utils/dateUtils';
import { getInitials } from '@/utils/stringUtils';
import type { User, Message, Chat } from '@/types';
import { MessageStatus } from './MessageStatus';
import { CallUI } from './CallUI';
import { FilePreview } from './FilePreview';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

// Dynamic import for socket.io to avoid SSR issues
const io = dynamic(() => import('socket.io-client').then(mod => mod.io), {
  ssr: false
});

type CallState = 'calling' | 'ringing' | 'connected' | 'ended';
type CallType = 'audio' | 'video';

interface AttachmentFile {
  file: File;
  preview?: string;
  type: string;
}

interface ChatViewProps {
  /** The chat/conversation data */
  chat: Chat;
  /** The current logged-in user */
  currentUser: User;
  /** Handler to go back to chat list */
  onBack: () => void;
  /** Handler to send a message */
  onSendMessage: (content: string, options?: {
    mediaUrl?: string;
    mediaType?: string;
    messageType?: string;
    fileName?: string;
    fileSize?: number;
    voiceDuration?: number;
  }) => void;
}

// Typing indicator component with animated dots
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15
            }}
            className="w-2 h-2 bg-gray-400 rounded-full"
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">typing...</span>
    </motion.div>
  );
});

// Message bubble component
const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  showStatus
}: {
  message: Message;
  isOwn: boolean;
  showStatus: boolean;
}) {
  const isVoiceMessage = message.messageType === 'voice' || message.messageType === 'audio';
  const isImage = message.messageType === 'image';
  const isVideo = message.messageType === 'video';
  const isFile = message.messageType === 'file' || message.messageType === 'document';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn('flex gap-2 max-w-[80%]', isOwn ? 'ml-auto flex-row-reverse' : '')}
    >
      {/* Avatar for other user's messages */}
      {!isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0 mt-auto">
          <AvatarImage src={message.senderId === message.senderId ? undefined : undefined} />
          <AvatarFallback className="bg-gray-300 text-xs">
            {message.senderId?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        {/* Message content */}
        <div
          className={cn(
            'rounded-2xl px-3 py-2 shadow-sm',
            isOwn
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          )}
        >
          {/* Image message */}
          {isImage && message.mediaUrl && (
            <div className="mb-2 rounded-lg overflow-hidden max-w-[250px]">
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Video message */}
          {isVideo && message.mediaUrl && (
            <div className="mb-2 rounded-lg overflow-hidden max-w-[250px] relative bg-black">
              <video
                src={message.mediaUrl}
                className="w-full object-cover max-h-[200px]"
                controls
              />
            </div>
          )}

          {/* Voice message */}
          {isVoiceMessage && message.mediaUrl && (
            <VoiceMessagePlayer
              duration={message.voiceDuration || 0}
              mediaUrl={message.mediaUrl}
              isOwn={isOwn}
            />
          )}

          {/* File message */}
          {isFile && (
            <a
              href={message.mediaUrl}
              download={message.fileName}
              className="flex items-center gap-3 p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FileText className={cn('w-5 h-5', isOwn ? 'text-blue-200' : 'text-blue-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isOwn ? 'text-white' : 'text-gray-900'
                )}>
                  {message.fileName || 'Document'}
                </p>
                <p className={cn(
                  'text-xs',
                  isOwn ? 'text-blue-200' : 'text-gray-500'
                )}>
                  {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'File'}
                </p>
              </div>
            </a>
          )}

          {/* Text content */}
          {message.content && !isVoiceMessage && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Timestamp and status */}
        <div className={cn('flex items-center gap-1 px-1', isOwn ? 'flex-row-reverse' : '')}>
          <span className="text-[10px] text-gray-400">
            {formatTimeAgo(message.createdAt)}
          </span>
          {isOwn && message.status && (
            <MessageStatus status={message.status} isOwn={isOwn} />
          )}
        </div>
      </div>
    </motion.div>
  );
});

/**
 * ChatView is the main chat interface component with full messaging features
 * including text messages, media attachments, voice recording, and real-time updates.
 */
export const ChatView = memo(function ChatView({
  chat,
  currentUser,
  onBack,
  onSendMessage
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(chat.messages || []);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [callState, setCallState] = useState<CallState | null>(null);
  const [callType, setCallType] = useState<CallType>('audio');
  const [callDuration, setCallDuration] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);

  const otherUser = chat.user;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Socket.io connection for real-time messaging
  useEffect(() => {
    const initSocket = async () => {
      const { io: socketIO } = await import('socket.io-client');
      
      socketRef.current = socketIO('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
      });

      socketRef.current.on('connect', () => {
        console.log('Chat socket connected');
      });

      socketRef.current.on('message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
      });

      socketRef.current.on('typing', ({ userId }: { userId: string }) => {
        if (userId !== currentUser.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      });

      socketRef.current.on('call-incoming', (data: { type: CallType; from: User }) => {
        setCallState('ringing');
        setCallType(data.type);
      });

      socketRef.current.on('call-ended', () => {
        setCallState('ended');
        setTimeout(() => setCallState(null), 2000);
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser.id]);

  // Send message handler
  const handleSend = useCallback(() => {
    if (!inputValue.trim() && attachments.length === 0) return;

    // Handle file attachments
    if (attachments.length > 0) {
      attachments.forEach(attachment => {
        const reader = new FileReader();
        reader.onload = () => {
          const mediaUrl = reader.result as string;
          let messageType = 'file';
          
          if (attachment.type.startsWith('image/')) messageType = 'image';
          else if (attachment.type.startsWith('video/')) messageType = 'video';
          else if (attachment.type.startsWith('audio/')) messageType = 'audio';

          onSendMessage(inputValue.trim(), {
            mediaUrl,
            mediaType: attachment.type,
            messageType,
            fileName: attachment.file.name,
            fileSize: attachment.file.size
          });
        };
        reader.readAsDataURL(attachment.file);
      });
      setAttachments([]);
    } else {
      onSendMessage(inputValue.trim());
    }

    setInputValue('');

    // Emit typing stopped
    if (socketRef.current) {
      socketRef.current.emit('typing-stop', { userId: currentUser.id });
    }
  }, [inputValue, attachments, onSendMessage, currentUser.id]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { userId: currentUser.id });
    }
  }, [currentUser.id]);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const mediaUrl = reader.result as string;
          onSendMessage('', {
            mediaUrl,
            mediaType: 'audio/webm',
            messageType: 'voice',
            voiceDuration: recordingDuration
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onSendMessage, recordingDuration]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  }, [isRecording]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    
    Array.from(files).forEach(file => {
      const attachment: AttachmentFile = {
        file,
        type: file.type
      };

      // Create preview for images/videos
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = () => {
          attachment.preview = reader.result as string;
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Start a call
  const startCall = useCallback((type: CallType) => {
    setCallType(type);
    setCallState('calling');
    
    if (socketRef.current) {
      socketRef.current.emit('call-start', { type, to: otherUser.id });
    }
  }, [otherUser.id]);

  // Answer incoming call
  const answerCall = useCallback(() => {
    setCallState('connected');
    
    if (socketRef.current) {
      socketRef.current.emit('call-answer');
    }
  }, []);

  // Decline/end call
  const endCall = useCallback(() => {
    setCallState('ended');
    
    if (socketRef.current) {
      socketRef.current.emit('call-end');
    }
    
    setTimeout(() => setCallState(null), 2000);
  }, []);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUser.avatar} />
          <AvatarFallback>{getInitials(otherUser.firstName, otherUser.lastName)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">
            {otherUser.firstName} {otherUser.lastName}
          </h3>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {otherUser.isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Active now
              </>
            ) : (
              'Offline'
            )}
          </p>
        </div>

        {/* E2E encryption indicator */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Encrypted</span>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startCall('audio')}
            className="text-gray-600 hover:text-blue-600"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startCall('video')}
            className="text-gray-600 hover:text-blue-600"
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-2">
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUser.id}
              showStatus={true}
            />
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && <TypingIndicator />}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Attachments preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t px-4 py-2 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <FilePreview
                  key={index}
                  file={{
                    name: attachment.file.name,
                    size: attachment.file.size,
                    type: attachment.type,
                    preview: attachment.preview
                  }}
                  onRemove={() => removeAttachment(index)}
                  className="w-48"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="border-t px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          {/* Attachment buttons */}
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-blue-600"
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-blue-600"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </div>

          {/* Text input or recording UI */}
          <div className="flex-1 relative">
            {isRecording ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 rounded-full bg-red-500"
                />
                <span className="text-sm text-red-600 font-medium">
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopRecording}
                  className="ml-auto text-red-600 hover:bg-red-100"
                >
                  Stop
                </Button>
              </div>
            ) : (
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Aa"
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-8 w-8 text-gray-500 hover:text-yellow-500"
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Send or voice record button */}
          {inputValue.trim() || attachments.length > 0 ? (
            <Button
              onClick={handleSend}
              size="icon"
              className="rounded-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={cn(
                'rounded-full',
                isRecording ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-blue-600'
              )}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Call UI overlay */}
      <AnimatePresence>
        {callState && (
          <CallUI
            callState={callState}
            callType={callType}
            callDuration={callDuration}
            otherUser={otherUser}
            onAnswer={answerCall}
            onDecline={endCall}
            onEnd={endCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default ChatView;
