'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn, formatDistanceToNow, getInitials } from '@/lib/utils';
import { useAuth, usePosts, useFriends, useNotifications, useSearch, useStories, useConversations, useMarketplace, useReels, useGroups, useEvents, usePages } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Home, Users, User, MessageCircle, Bell, Search, Menu, MoreHorizontal,
  Heart, ThumbsUp, Share2, Bookmark, Send, Image as ImageIcon, Video, 
  Smile, MapPin, Calendar, Flag, Globe, Settings, LogOut, Moon, Sun, 
  Gamepad2, Play, ShoppingBag, Briefcase, HelpCircle, ChevronDown, 
  ChevronRight, ChevronLeft, X, Plus, Check, Lock, Eye, EyeOff, 
  UserPlus, Camera, Edit, Trash2, Phone, Clock, Star, Gift, Music,
  Volume2, VolumeX, Shield, Key, Monitor, Globe2, MessageSquare,
  BookOpen, Radio, HeartHandshake, Loader2, Film, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '@/lib/api';

// ============ TYPES ============
interface UserType {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  currentCity?: string;
  hometown?: string;
  workplace?: string;
  education?: string;
  relationshipStatus?: string;
  dateOfBirth?: string;
  gender?: string;
  isVerified: boolean;
  isOnline: boolean;
  friendCount?: number;
  followerCount?: number;
  followingCount?: number;
  username?: string;
}

interface Post {
  id: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  postType: string;
  visibility: string;
  feeling?: string;
  location?: string;
  likeCount: number;
  loveCount?: number;
  hahaCount?: number;
  wowCount?: number;
  sadCount?: number;
  angryCount?: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  author: UserType;
  userReaction?: string | null;
  isSaved?: boolean;
  comments: CommentType[];
  reactions?: { type: string; userId: string }[];
}

interface CommentType {
  id: string;
  content: string;
  author: UserType;
  createdAt: string;
  likeCount: number;
}

interface StoryType {
  id: string;
  user: UserType;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
  isViewed?: boolean;
}

interface NotificationType {
  id: string;
  type: string;
  message: string;
  image?: string;
  isRead: boolean;
  createdAt: string;
  actor?: UserType;
}

interface ChatType {
  id: string;
  user: UserType;
  lastMessage: { content: string; createdAt: string; isRead: boolean };
  unreadCount: number;
  messages: MessageType[];
}

interface MessageType {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
  mediaUrl?: string;
  mediaType?: string;
}

interface FriendRequestType {
  id: string;
  user: UserType;
  mutualFriends: number;
}

// ============ DEFAULT USER ============
const defaultUser: UserType = {
  id: 'guest',
  firstName: 'Guest',
  lastName: 'User',
  email: 'guest@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
  isVerified: false,
  isOnline: true,
};

const reactions = [
  { type: 'like', icon: '👍', label: 'Like', color: '#1877F2' },
  { type: 'love', icon: '❤️', label: 'Love', color: '#F33E58' },
  { type: 'haha', icon: '😂', label: 'Haha', color: '#F7B928' },
  { type: 'wow', icon: '😮', label: 'Wow', color: '#F7B928' },
  { type: 'sad', icon: '😢', label: 'Sad', color: '#F7B928' },
  { type: 'angry', icon: '😡', label: 'Angry', color: '#E9710F' },
];

const feelings = [
  { emoji: '😊', label: 'feeling happy' },
  { emoji: '😢', label: 'feeling sad' },
  { emoji: '😍', label: 'feeling loved' },
  { emoji: '🎉', label: 'celebrating' },
  { emoji: '😎', label: 'feeling cool' },
  { emoji: '🙏', label: 'feeling blessed' },
  { emoji: '🥳', label: 'feeling excited' },
];

// ============ REACTION PICKER ============
function ReactionPicker({ onSelect, selectedReaction }: { 
  onSelect: (type: string) => void; 
  selectedReaction?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl p-2 flex gap-1 z-50 border"
            onMouseLeave={() => setIsOpen(false)}
          >
            {reactions.map((r) => (
              <motion.button
                key={r.type}
                whileHover={{ scale: 1.4 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onSelect(r.type); setIsOpen(false); }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100 transition-colors",
                  selectedReaction === r.type && "bg-blue-50 ring-2 ring-blue-400"
                )}
              >
                {r.icon}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseEnter={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all active:scale-95",
          selectedReaction ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-100"
        )}
      >
        {selectedReaction ? (
          <span className="text-lg">{reactions.find(r => r.type === selectedReaction)?.icon}</span>
        ) : (
          <ThumbsUp className="w-5 h-5" />
        )}
        <span className="font-medium text-sm">
          {selectedReaction ? reactions.find(r => r.type === selectedReaction)?.label : 'Like'}
        </span>
      </button>
    </div>
  );
}

// ============ POST ITEM ============
function PostItem({ post, currentUser, onReaction, onComment, onShare, onSave, onDelete }: { 
  post: Post; 
  currentUser: UserType;
  onReaction: (postId: string, reaction: string) => void;
  onComment: (postId: string, comment: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onDelete: (postId: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [reaction, setReaction] = useState<string | null>(post.userReaction || null);
  const [counts, setCounts] = useState({
    like: post.likeCount || 0,
    love: post.loveCount || 0,
    haha: post.hahaCount || 0,
    wow: post.wowCount || 0,
    sad: post.sadCount || 0,
    angry: post.angryCount || 0,
    comment: post.commentCount || 0,
    share: post.shareCount || 0
  });
  const [showMenu, setShowMenu] = useState(false);
  const [newComments, setNewComments] = useState<CommentType[]>([]);

  const totalReactions = counts.like + counts.love + counts.haha + counts.wow + counts.sad + counts.angry;

  const handleReaction = (type: string) => {
    if (reaction === type) {
      setReaction(null);
      setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type as keyof typeof prev] - 1) }));
      onReaction(post.id, '');
    } else {
      if (reaction) {
        setCounts(prev => ({ ...prev, [reaction]: Math.max(0, prev[reaction as keyof typeof prev] - 1) }));
      }
      setReaction(type);
      setCounts(prev => ({ ...prev, [type]: prev[type as keyof typeof prev] + 1 }));
      onReaction(post.id, type);
    }
  };

  const handleComment = () => {
    if (commentText.trim()) {
      const newComment: CommentType = {
        id: `nc-${Date.now()}`,
        content: commentText,
        author: currentUser,
        createdAt: new Date().toISOString(),
        likeCount: 0
      };
      setNewComments([...newComments, newComment]);
      setCounts(prev => ({ ...prev, comment: prev.comment + 1 }));
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  const allComments = [...(post.comments || []), ...newComments];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white mb-0.5"
    >
      {/* Post Header */}
      <div className="flex items-start justify-between p-3">
        <div className="flex items-center gap-3 cursor-pointer">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback>{getInitials(post.author.firstName, post.author.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[15px] hover:underline">{post.author.firstName} {post.author.lastName}</span>
              {post.author.isVerified && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{formatDistanceToNow(post.createdAt)}</span>
              <span>·</span>
              {post.visibility === 'public' ? <Globe className="w-3 h-3" /> : 
               post.visibility === 'friends' ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {post.location && (
                <>
                  <span>·</span>
                  <MapPin className="w-3 h-3" />
                  <span>{post.location}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border py-2 w-56 z-50"
            >
              <button 
                onClick={() => { setIsSaved(!isSaved); onSave(post.id); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100"
              >
                <Bookmark className="w-5 h-5 text-gray-600" />
                <span>{isSaved ? 'Remove from saved' : 'Save post'}</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100">
                <EyeOff className="w-5 h-5 text-gray-600" />
                <span>Hide post</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100">
                <Flag className="w-5 h-5 text-gray-600" />
                <span>Report post</span>
              </button>
              {post.author.id === currentUser.id && (
                <button 
                  onClick={() => { onDelete(post.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete post</span>
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Post Content */}
      {post.content && (
        <div className="px-3 pb-2">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
          {post.feeling && (
            <span className="text-gray-500 text-sm mt-1 inline-block">
              {feelings.find(f => f.label === post.feeling)?.emoji} {post.feeling}
            </span>
          )}
        </div>
      )}
      
      {/* Post Media */}
      {post.mediaUrl && (
        <div className="relative bg-black">
          {post.mediaType === 'video' ? (
            <video
              src={post.mediaUrl}
              controls
              className="w-full max-h-[500px] object-cover"
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt=""
              className="w-full max-h-[500px] object-cover cursor-pointer"
            />
          )}
        </div>
      )}
      
      {/* Post Stats */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1 cursor-pointer hover:underline">
          {totalReactions > 0 && (
            <>
              <div className="flex -space-x-0.5">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <ThumbsUp className="w-3 h-3 text-white" />
                </div>
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <Heart className="w-3 h-3 text-white" />
                </div>
              </div>
              <span className="text-sm text-gray-500 ml-1">{totalReactions.toLocaleString()}</span>
            </>
          )}
        </div>
        <div className="flex gap-3 text-sm text-gray-500">
          <button onClick={() => setShowComments(!showComments)} className="hover:underline">
            {counts.comment} comment{counts.comment !== 1 ? 's' : ''}
          </button>
          <button onClick={() => { setCounts(prev => ({ ...prev, share: prev.share + 1 })); onShare(post.id); }} className="hover:underline">
            {counts.share} share{counts.share !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
      
      <Separator />
      
      {/* Post Actions */}
      <div className="flex justify-around py-1 px-2">
        <ReactionPicker onSelect={handleReaction} selectedReaction={reaction} />
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Comment</span>
        </button>
        <button
          onClick={() => { setCounts(prev => ({ ...prev, share: prev.share + 1 })); onShare(post.id); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-medium text-sm">Share</span>
        </button>
      </div>
      
      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t px-3 py-2"
          >
            {allComments.length > 0 && (
              <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                {allComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="w-8 h-8 mt-0.5">
                      <AvatarImage src={comment.author.avatar} />
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-2xl px-3 py-2">
                        <p className="font-semibold text-sm">{comment.author.firstName} {comment.author.lastName}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex gap-4 mt-1 px-2 text-xs text-gray-500">
                        <span>{formatDistanceToNow(comment.createdAt)}</span>
                        <button className="font-semibold hover:underline">Like</button>
                        <button className="font-semibold hover:underline">Reply</button>
                        {comment.likeCount > 0 && <span>♥ {comment.likeCount}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Comment Input */}
            <div className="flex gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.avatar} />
              </Avatar>
              <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5">
                <input
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <button className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                  <Smile className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ STORY RING ============
function StoryRing({ story, onClick, isCreate }: { story: StoryType; onClick: () => void; isCreate?: boolean }) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-[104px] h-[184px] rounded-xl overflow-hidden cursor-pointer bg-gray-200"
    >
      {isCreate ? (
        <>
          <img src={story.user.avatar} alt="" className="w-full h-3/4 object-cover" />
          <div className="absolute bottom-0 w-full h-1/4 bg-white flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium mt-3">Create story</span>
          </div>
        </>
      ) : (
        <>
          {story.mediaType === 'video' ? (
            <video src={story.mediaUrl} className="w-full h-full object-cover" />
          ) : (
            <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
          <div className="absolute top-2.5 left-2.5">
            <div className={cn(
              "w-9 h-9 rounded-full p-0.5",
              story.isViewed ? "bg-gray-400" : "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
            )}>
              <Avatar className="w-full h-full border-2 border-white">
                <AvatarImage src={story.user.avatar} />
                <AvatarFallback>{story.user.firstName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <p className="text-white text-xs font-medium drop-shadow truncate">
              {story.user.firstName} {story.user.lastName}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ============ STORY VIEWER ============
function StoryViewer({ story, onClose, onNext, onPrev }: { 
  story: StoryType; 
  onClose: () => void; 
  onNext: () => void; 
  onPrev: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          onNext();
          return 100;
        }
        return p + 0.5;
      });
    }, 50);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[100] flex items-center justify-center"
    >
      <div className="absolute top-0 left-0 right-0 z-10 p-2">
        <div className="h-0.5 bg-white/30 rounded-full overflow-hidden">
          <motion.div className="h-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Avatar className="w-9 h-9 border-2 border-white">
            <AvatarImage src={story.user.avatar} />
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm">{story.user.firstName} {story.user.lastName}</p>
            <p className="text-white/70 text-xs">{formatDistanceToNow(story.createdAt)}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      {story.mediaType === 'video' ? (
        <video src={story.mediaUrl} autoPlay className="max-h-full max-w-full object-contain" />
      ) : (
        <img src={story.mediaUrl} alt="" className="max-h-full max-w-full object-contain" />
      )}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full px-4 py-2.5 flex items-center">
            <input placeholder="Send message..." className="flex-1 bg-transparent text-white placeholder-white/70 outline-none text-sm" />
          </div>
          <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </button>
          <button className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </motion.div>
  );
}

// ============ CHAT VIEW ============
function ChatView({ chat, currentUser, onBack, onSendMessage }: { 
  chat: ChatType; 
  currentUser: UserType; 
  onBack: () => void;
  onSendMessage: (content: string, mediaUrl?: string, mediaType?: string) => void;
}) {
  const [messages, setMessages] = useState<MessageType[]>([
    { id: 'm1', content: 'Hey there! 👋', senderId: chat.user.id, createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: true },
    { id: 'm2', content: 'Hi! How are you?', senderId: currentUser.id, createdAt: new Date(Date.now() - 3000000).toISOString(), isRead: true },
    { id: 'm3', content: chat.lastMessage.content, senderId: chat.user.id, createdAt: chat.lastMessage.createdAt, isRead: chat.lastMessage.isRead },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (newMessage.trim()) {
      const msg: MessageType = {
        id: `m-${Date.now()}`,
        content: newMessage,
        senderId: currentUser.id,
        createdAt: new Date().toISOString(),
        isRead: true
      };
      setMessages([...messages, msg]);
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const mediaUrl = reader.result as string;
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        const msg: MessageType = {
          id: `m-${Date.now()}`,
          content: '',
          senderId: currentUser.id,
          createdAt: new Date().toISOString(),
          isRead: true,
          mediaUrl,
          mediaType
        };
        setMessages([...messages, msg]);
        onSendMessage('', mediaUrl, mediaType);
      };
      reader.readAsDataURL(file);
    }
    setShowAttach(false);
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 bg-white z-[60] flex flex-col"
    >
      <div className="flex items-center gap-3 p-3 border-b">
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-9 h-9">
          <AvatarImage src={chat.user.avatar} />
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{chat.user.firstName} {chat.user.lastName}</p>
          <p className="text-xs text-green-500">Active now</p>
        </div>
        <button className="w-9 h-9 rounded-full flex items-center justify-center">
          <Phone className="w-5 h-5 text-gray-600" />
        </button>
        <button className="w-9 h-9 rounded-full flex items-center justify-center">
          <Video className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-2 mb-2", msg.senderId === currentUser.id ? "flex-row-reverse" : "flex-row")}
          >
            {msg.senderId !== currentUser.id && (
              <Avatar className="w-8 h-8 mt-0.5">
                <AvatarImage src={chat.user.avatar} />
              </Avatar>
            )}
            <div className={cn(
              "max-w-[70%] rounded-2xl px-3 py-2",
              msg.senderId === currentUser.id ? "bg-blue-600 text-white" : "bg-gray-100"
            )}>
              {msg.mediaUrl && (
                msg.mediaType === 'video' ? (
                  <video src={msg.mediaUrl} controls className="max-w-full rounded-lg mb-1" />
                ) : (
                  <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg mb-1" />
                )
              )}
              {msg.content && <p className="text-sm">{msg.content}</p>}
              <p className={cn("text-xs mt-1", msg.senderId === currentUser.id ? "text-blue-100" : "text-gray-400")}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="p-3 border-t">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-end gap-2">
            <button 
              onClick={() => setShowAttach(!showAttach)}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-500" />
            </button>
            <textarea
              placeholder="Aa"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              className="flex-1 bg-transparent outline-none resize-none max-h-32 text-sm"
              rows={1}
            />
            <button className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
              <Smile className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              newMessage.trim() ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {showAttach && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 mt-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
            >
              <ImageIcon className="w-5 h-5 text-green-500" />
              Photo/Video
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============ AUTH SCREEN ============
interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (data: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
  }) => void;
  loading: boolean;
}

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function AuthScreen({ onLogin, onRegister, loading }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Email verification states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [displayCode, setDisplayCode] = useState('');
  const [pendingUserData, setPendingUserData] = useState<AuthScreenProps['onRegister'] extends (data: infer D) => void ? D : never | null>(null);
  const [verifying, setVerifying] = useState(false);
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [displayResetCode, setDisplayResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLogin) {
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }
      if (!EMAIL_REGEX.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
      await onLogin(email, password);
    } else {
      if (!email || !password || !firstName || !lastName) {
        setError('Please fill in all fields');
        return;
      }
      if (!EMAIL_REGEX.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      
      const userData = { email, password, firstName, lastName, dateOfBirth, gender };
      
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        if (data.requiresVerification) {
          setPendingUserData(userData);
          setDisplayCode(data.verificationCode);
          setShowVerification(true);
        } else if (data.user) {
          onRegister(userData);
        }
      } catch (err) {
        setError('Registration failed. Please try again.');
      }
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    
    setVerifying(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Verification successful, now login directly
        setShowVerification(false);
        // Call login with the email and password from the registration form
        if (password) {
          onLogin(email, password);
        }
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (data.verificationCode) {
        setDisplayCode(data.verificationCode);
        setError('');
      }
    } catch (err) {
      setError('Failed to resend code');
    }
  };

  const handleForgotPassword = async () => {
    if (resetStep === 'email') {
      if (!resetEmail || !EMAIL_REGEX.test(resetEmail)) {
        setError('Please enter a valid email address');
        return;
      }
      
      setResetting(true);
      setError('');
      
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail }),
        });
        const data = await res.json();
        
        if (data.resetCode) {
          setDisplayResetCode(data.resetCode);
          setResetStep('code');
        } else {
          setError('If an account exists, a reset code has been sent');
          setResetStep('code');
        }
      } catch (err) {
        setError('Failed to send reset code');
      } finally {
        setResetting(false);
      }
    } else if (resetStep === 'code') {
      if (!resetCode || resetCode.length !== 6) {
        setError('Please enter a 6-digit code');
        return;
      }
      setResetStep('password');
    } else if (resetStep === 'password') {
      if (!newPassword || newPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      
      setResetting(true);
      setError('');
      
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }),
        });
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setResetSuccess(true);
          setTimeout(() => {
            setShowForgotPassword(false);
            setResetStep('email');
            setResetEmail('');
            setResetCode('');
            setNewPassword('');
            setDisplayResetCode('');
            setResetSuccess(false);
          }, 2000);
        }
      } catch (err) {
        setError('Failed to reset password');
      } finally {
        setResetting(false);
      }
    }
  };

  // Verification Screen
  if (showVerification) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Mail className="w-8 h-8 text-[#1877F2]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Verify your email</h2>
              <p className="text-gray-500 text-sm mt-2">
                We've sent a 6-digit code to<br />
                <span className="font-medium text-gray-700">{email}</span>
              </p>
            </div>

            {/* Demo: Show the code */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800 text-center">
                <strong>Demo Mode:</strong> Your verification code is<br />
                <span className="text-2xl font-bold text-yellow-900">{displayCode}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Enter 6-digit code</label>
                <Input
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-xl tracking-widest"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

              <Button
                onClick={handleVerifyCode}
                disabled={verifying || verificationCode.length !== 6}
                className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold"
              >
                {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
              </Button>

              <div className="text-center">
                <button
                  onClick={handleResendCode}
                  className="text-sm text-[#1877F2] hover:underline"
                >
                  Resend code
                </button>
              </div>

              <button
                onClick={() => setShowVerification(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to registration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Key className="w-8 h-8 text-[#1877F2]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
              {resetStep === 'email' && (
                <p className="text-gray-500 text-sm mt-2">Enter your email to receive a reset code</p>
              )}
              {resetStep === 'code' && (
                <p className="text-gray-500 text-sm mt-2">Enter the 6-digit code sent to your email</p>
              )}
              {resetStep === 'password' && (
                <p className="text-gray-500 text-sm mt-2">Create a new password</p>
              )}
            </div>

            {/* Demo: Show the reset code */}
            {resetStep === 'code' && displayResetCode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 text-center">
                  <strong>Demo Mode:</strong> Your reset code is<br />
                  <span className="text-2xl font-bold text-yellow-900">{displayResetCode}</span>
                </p>
              </div>
            )}

            {resetSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Password reset successfully!</p>
                <p className="text-green-600 text-sm">Redirecting to login...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resetStep === 'email' && (
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="h-12"
                  />
                )}

                {resetStep === 'code' && (
                  <Input
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 text-center text-xl tracking-widest"
                    maxLength={6}
                  />
                )}

                {resetStep === 'password' && (
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="text-red-500 text-sm text-center">{error}</div>
                )}

                <Button
                  onClick={handleForgotPassword}
                  disabled={resetting}
                  className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold"
                >
                  {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    resetStep === 'password' ? 'Reset Password' : 
                    resetStep === 'code' ? 'Continue' : 'Send Reset Code'
                  )}
                </Button>

                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetStep('email');
                    setError('');
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1877F2] rounded-full mb-4">
            <span className="text-white text-4xl font-bold">f</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Facebook Clone</h1>
          <p className="text-gray-500 mt-1">Connect with friends and the world</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12"
                  />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">Date of birth</label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-10"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </>
            )}
            
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 mb-3"
            />
            
            <div className="relative mb-3">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
              </button>
            </div>

            {error && (
              <div className="text-red-500 text-sm mb-3 text-center">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white text-lg font-semibold"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Log In' : 'Sign Up')}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button 
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-[#1877F2] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Separator className="my-4" />

          <Button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            variant="outline"
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-white border-0 text-lg font-semibold"
          >
            {isLogin ? 'Create New Account' : 'Back to Login'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ EDIT PROFILE MODAL ============
function EditProfileModal({ user, isOpen, onClose, onSave }: {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<UserType>) => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio || '');
  const [currentCity, setCurrentCity] = useState(user.currentCity || '');
  const [hometown, setHometown] = useState(user.hometown || '');
  const [workplace, setWorkplace] = useState(user.workplace || '');
  const [education, setEducation] = useState(user.education || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [gender, setGender] = useState(user.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [coverPhoto, setCoverPhoto] = useState(user.coverPhoto || '');
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'photos'>('basic');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({
      firstName,
      lastName,
      bio,
      currentCity,
      hometown,
      workplace,
      education,
      phone,
      gender,
      dateOfBirth,
      avatar,
      coverPhoto
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        {/* Profile Photo Section */}
        <div className="relative mb-4">
          {/* Cover Photo */}
          <div className="h-32 bg-gray-200 rounded-t-lg overflow-hidden relative">
            {coverPhoto && (
              <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
            )}
            <button 
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-lg hover:bg-gray-100"
            >
              <Camera className="w-4 h-4" /> Edit cover
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
          </div>
          
          {/* Profile Picture */}
          <div className="absolute -bottom-10 left-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={avatar} />
                <AvatarFallback>{firstName?.charAt(0)}{lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <button 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center border-2 border-white hover:bg-gray-300"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mt-8 mb-4">
          {[
            { id: 'basic', label: 'Basic Info' },
            { id: 'contact', label: 'Contact' },
            { id: 'photos', label: 'Photos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "px-4 py-2 text-sm font-medium relative",
                activeTab === tab.id ? "text-[#1877F2]" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1877F2]" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {activeTab === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">First Name</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Last Name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Bio</label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Date of Birth</label>
                <Input 
                  type="date" 
                  value={dateOfBirth ? dateOfBirth.split('T')[0] : ''} 
                  onChange={(e) => setDateOfBirth(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Current City</label>
                <Input value={currentCity} onChange={(e) => setCurrentCity(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Hometown</label>
                <Input value={hometown} onChange={(e) => setHometown(e.target.value)} />
              </div>
            </>
          )}

          {activeTab === 'contact' && (
            <>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Add phone number" />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Workplace</label>
                <Input value={workplace} onChange={(e) => setWorkplace(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Education</label>
                <Input value={education} onChange={(e) => setEducation(e.target.value)} />
              </div>
            </>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatar} />
                    <AvatarFallback>{firstName?.charAt(0)}{lastName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="outline" 
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Change Photo
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Cover Photo</label>
                <div className="relative h-32 bg-gray-200 rounded-lg overflow-hidden">
                  {coverPhoto && (
                    <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Change Cover
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1 bg-[#1877F2] hover:bg-[#166FE5]">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ CREATE STORY MODAL ============
function CreateStoryModal({ isOpen, onClose, onCreate }: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (mediaUrl: string, mediaType: 'image' | 'video') => void;
}) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setPreview(url);
        setMediaUrl(url);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (mediaUrl) {
      onCreate(mediaUrl, mediaType);
      setMediaUrl('');
      setPreview('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {preview ? (
            <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
              {mediaType === 'video' ? (
                <video src={preview} controls className="w-full h-full object-cover" />
              ) : (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => { setPreview(''); setMediaUrl(''); }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[9/16] bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-12 h-12 text-gray-400" />
              <span className="text-gray-500">Add Photo or Video</span>
            </button>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={!mediaUrl} className="flex-1 bg-[#1877F2]">Share Story</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN APP ============
export default function FacebookClone() {
  // API Hooks
  const { user: authUser, loading: authLoading, login, logout, setUser } = useAuth();
  const { posts: apiPosts, loading: postsLoading, createPost: apiCreatePost, reactToPost: apiReactToPost, commentOnPost: apiCommentOnPost, deletePost: apiDeletePost, refresh: refreshPosts } = usePosts();
  const { requests: friendRequests, suggestions: friendSuggestions, acceptRequest, rejectRequest, refresh: refreshFriends } = useFriends();
  const { notifications: apiNotifications, unreadCount: apiUnreadCount, markAsRead, refresh: refreshNotifications } = useNotifications();
  const { results: searchResults, search } = useSearch();
  const { stories: apiStories, create: createStory } = useStories('feed');
  const { conversations } = useConversations();
  const { listings } = useMarketplace();
  const { reels } = useReels('feed');
  
  // Current user
  const currentUser: UserType = authUser ? {
    ...authUser,
    friendCount: 1547,
    followerCount: 12000,
    followingCount: 890
  } as UserType : defaultUser;

  // UI States
  const [currentPage, setCurrentPage] = useState('home');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState('main');
  const [showChat, setShowChat] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  
  // Create Post States
  const [postContent, setPostContent] = useState('');
  const [postFeeling, setPostFeeling] = useState<string | null>(null);
  const [postVisibility, setPostVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video'>('image');
  const [postMediaPreview, setPostMediaPreview] = useState('');
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings States
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoplayVideos, setAutoplayVideos] = useState(true);

  // Transform API posts
  const posts: Post[] = React.useMemo(() => {
    if (apiPosts.length > 0) {
      return apiPosts.map(p => {
        const reactionCounts: Record<string, number> = {
          like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0
        };
        (p.reactions || []).forEach((r: { type: string }) => {
          if (reactionCounts[r.type] !== undefined) {
            reactionCounts[r.type]++;
          }
        });

        return {
          ...p,
          postType: p.postType || 'status',
          visibility: p.visibility || 'public',
          likeCount: p.likeCount || reactionCounts.like || 0,
          loveCount: reactionCounts.love || 0,
          hahaCount: reactionCounts.haha || 0,
          wowCount: reactionCounts.wow || 0,
          sadCount: reactionCounts.sad || 0,
          angryCount: reactionCounts.angry || 0,
          isSaved: false,
          comments: (p.comments || []).map((c: api.Comment) => ({
            id: c.id,
            content: c.content,
            author: c.author as UserType,
            createdAt: c.createdAt,
            likeCount: c.likeCount || 0
          }))
        };
      });
    }
    return [];
  }, [apiPosts]);

  // Transform notifications
  const notifications: NotificationType[] = React.useMemo(() => {
    return (apiNotifications || []).map(n => ({
      ...n,
      type: n.type || 'like',
      actor: n.actor as UserType
    }));
  }, [apiNotifications]);

  // Transform stories
  const stories: StoryType[] = React.useMemo(() => {
    const storyList: StoryType[] = [
      { id: 'create', user: currentUser, mediaUrl: '', createdAt: new Date().toISOString(), isViewed: false }
    ];
    
    (apiStories || []).forEach((group: { user: api.User; stories: api.Story[] }) => {
      group.stories.forEach((s: api.Story) => {
        storyList.push({
          id: s.id,
          user: s.user as UserType,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType as 'image' | 'video',
          createdAt: s.createdAt,
          isViewed: s.isViewed
        });
      });
    });
    
    if (storyList.length === 1) {
      const mockUsers: UserType[] = [
        { id: '2', firstName: 'Sarah', lastName: 'Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', isVerified: true, isOnline: true, email: '' },
        { id: '3', firstName: 'Mike', lastName: 'Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', isVerified: false, isOnline: true, email: '' },
        { id: '4', firstName: 'Emily', lastName: 'Rose', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', isVerified: true, isOnline: false, email: '' },
      ];
      mockUsers.forEach((user, i) => {
        storyList.push({
          id: `mock-${i}`,
          user,
          mediaUrl: `https://picsum.photos/seed/story${i}/400/700`,
          createdAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString(),
          isViewed: i > 0
        });
      });
    }
    
    return storyList;
  }, [apiStories, currentUser]);

  // Transform chats
  const chats: ChatType[] = React.useMemo(() => {
    if (conversations && conversations.length > 0) {
      return conversations.map((c: api.Conversation) => ({
        id: c.id,
        user: (c.otherUser || c.members?.[0]) as UserType,
        lastMessage: c.lastMessage || { content: 'Start a conversation', createdAt: new Date().toISOString(), isRead: true },
        unreadCount: c.unreadCount || 0,
        messages: c.messages || []
      }));
    }
    const mockUsers: UserType[] = [
      { id: '2', firstName: 'Sarah', lastName: 'Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', isVerified: true, isOnline: true, email: '' },
      { id: '3', firstName: 'Mike', lastName: 'Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', isVerified: false, isOnline: true, email: '' },
      { id: '4', firstName: 'Emily', lastName: 'Rose', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', isVerified: true, isOnline: false, email: '' },
    ];
    return [
      { id: '1', user: mockUsers[0], lastMessage: { content: 'Hey! How are you?', createdAt: new Date().toISOString(), isRead: false }, unreadCount: 3, messages: [] },
      { id: '2', user: mockUsers[1], lastMessage: { content: 'See you tomorrow!', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: true }, unreadCount: 0, messages: [] },
      { id: '3', user: mockUsers[2], lastMessage: { content: 'Thanks!', createdAt: new Date(Date.now() - 7200000).toISOString(), isRead: true }, unreadCount: 0, messages: [] },
    ];
  }, [conversations]);

  // Computed
  const unreadNotifications = apiUnreadCount || notifications.filter(n => !n.isRead).length;
  const unreadMessages = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const friendRequestCount = (friendRequests || []).length;

  // Auth handlers
  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleRegister = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    try {
      const res = await api.register(data);
      if (res.user) {
        setUser(res.user);
      }
    } catch (error) {
      console.error('Register error:', error);
    }
  };

  // Handlers
  const handleReaction = async (postId: string, reaction: string) => {
    try {
      await apiReactToPost(postId, reaction);
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const handleComment = async (postId: string, comment: string) => {
    try {
      await apiCommentOnPost(postId, comment);
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleShare = async (postId: string) => {
    try {
      await api.sharePost(postId);
      refreshPosts();
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleSave = async (postId: string) => {
    try {
      await api.savePost(postId);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await apiDeletePost(postId);
      refreshPosts();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handlePostFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setPostMediaPreview(url);
        setPostMediaUrl(url);
        setPostMediaType(file.type.startsWith('video') ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (postContent.trim() || postMediaUrl) {
      try {
        await apiCreatePost({
          content: postContent,
          mediaUrl: postMediaUrl || undefined,
          mediaType: postMediaType,
          postType: postMediaUrl ? (postMediaType === 'video' ? 'video' : 'photo') : 'status',
          visibility: postVisibility,
          feeling: postFeeling || undefined,
        });
        setPostContent('');
        setPostFeeling(null);
        setPostMediaUrl('');
        setPostMediaPreview('');
        setShowCreatePost(false);
        refreshPosts();
      } catch (error) {
        console.error('Create post error:', error);
      }
    }
  };

  const handleCreateStory = async (mediaUrl: string, mediaType: 'image' | 'video') => {
    try {
      await createStory({
        mediaType,
        mediaUrl,
        visibility: 'friends'
      });
    } catch (error) {
      console.error('Create story error:', error);
    }
  };

  const handleUpdateProfile = async (data: Partial<UserType>) => {
    try {
      await api.updateUser(data);
      // Refresh user data
      const res = await api.getCurrentUser();
      if (res.user) {
        setUser(res.user);
      }
    } catch (error) {
      console.error('Update profile error:', error);
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject' = 'accept') => {
    try {
      if (action === 'accept') {
        await acceptRequest(requestId);
      } else {
        await rejectRequest(requestId);
      }
      refreshFriends();
    } catch (error) {
      console.error('Friend request error:', error);
    }
  };

  const markNotificationRead = (id: string) => {
    markAsRead(id);
  };

  const markAllNotificationsRead = () => {
    markAsRead();
  };

  const handleLogout = async () => {
    await logout();
    setShowSettings(false);
  };

  // Show auth screen if not logged in
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1877F2]" />
      </div>
    );
  }

  if (!authUser) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} loading={authLoading} />;
  }

  // ============ RENDER FUNCTIONS ============
  
  const renderHeader = () => (
    <motion.header 
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm"
      initial={{ y: -60 }}
      animate={{ y: 0 }}
    >
      <div className="flex items-center justify-between px-3 h-12">
        {showSearch ? (
          <motion.div className="flex-1 flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)} className="w-9 h-9">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search Facebook"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); search(e.target.value); }}
                className="pl-9 bg-gray-100 border-0 rounded-full h-9"
                autoFocus
              />
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#1877F2] rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">f</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSearch(true)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={() => setShowChat('list')} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center relative">
                <MessageCircle className="w-5 h-5 text-gray-600" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadMessages}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.header>
  );

  const renderBottomNav = () => (
    <motion.nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t"
      initial={{ y: 60 }}
      animate={{ y: 0 }}
    >
      <div className="flex justify-around items-center h-12 px-1">
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'friends', icon: Users, label: 'Friends', badge: friendRequestCount },
          { id: 'watch', icon: Play, label: 'Watch' },
          { id: 'marketplace', icon: ShoppingBag, label: 'Market' },
          { id: 'notifications', icon: Bell, label: 'Alerts', badge: unreadNotifications },
          { id: 'menu', icon: Menu, label: 'Menu' },
        ].map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => id === 'menu' ? setShowSettings(true) : setCurrentPage(id)}
            className="flex flex-col items-center justify-center px-3 py-1 relative"
          >
            <div className="relative">
              <Icon className={cn("w-6 h-6", currentPage === id ? "text-[#1877F2]" : "text-gray-500")} />
              {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={cn("text-[10px] mt-0.5", currentPage === id ? "text-[#1877F2] font-medium" : "text-gray-500")}>
              {label}
            </span>
            {currentPage === id && (
              <motion.div layoutId="activeTab" className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#1877F2] rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    </motion.nav>
  );

  const renderStories = () => (
    <div className="bg-white border-b">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide p-2">
        {stories.map((story, index) => (
          <StoryRing 
            key={story.id} 
            story={story} 
            onClick={() => index === 0 ? setShowCreateStory(true) : setShowStoryViewer(story.id)} 
            isCreate={index === 0} 
          />
        ))}
      </div>
    </div>
  );

  const renderCreatePost = () => (
    <div className="bg-white p-3 border-b">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={currentUser.avatar} />
        </Avatar>
        <button
          onClick={() => setShowCreatePost(true)}
          className="flex-1 h-10 bg-gray-100 rounded-full px-4 text-left text-gray-500 hover:bg-gray-200 transition-colors text-[15px]"
        >
          What's on your mind, {currentUser.firstName}?
        </button>
      </div>
      <Separator className="my-2" />
      <div className="flex justify-around">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100">
          <Video className="w-6 h-6 text-red-500" />
          <span className="text-xs font-medium text-gray-600">Live</span>
        </button>
        <button onClick={() => setShowCreatePost(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100">
          <ImageIcon className="w-6 h-6 text-green-500" />
          <span className="text-xs font-medium text-gray-600">Photo</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100">
          <Smile className="w-6 h-6 text-yellow-500" />
          <span className="text-xs font-medium text-gray-600">Feeling</span>
        </button>
      </div>
    </div>
  );

  const renderHome = () => (
    <div>
      {renderStories()}
      {renderCreatePost()}
      <div className="bg-white p-3 border-b">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
            <Video className="w-5 h-5" />
            Create Room
          </button>
          {chats.filter(c => c.user.isOnline).slice(0, 5).map((c) => (
            <div key={c.id} className="relative flex-shrink-0">
              <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80">
                <AvatarImage src={c.user.avatar} />
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
          ))}
        </div>
      </div>
      {postsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#1877F2]" />
        </div>
      ) : posts.length > 0 ? (
        posts.map(post => (
          <PostItem 
            key={post.id} 
            post={post} 
            currentUser={currentUser}
            onReaction={handleReaction}
            onComment={handleComment}
            onShare={handleShare}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <div className="bg-white p-8 text-center text-gray-500">
          <p>No posts yet. Create your first post!</p>
        </div>
      )}
    </div>
  );

  const renderFriends = () => {
    const displayRequests = (friendRequests || []).map((user) => ({
      id: user.id,
      user: user as UserType,
      mutualFriends: Math.floor(Math.random() * 20) + 1
    }));
    
    return (
      <div className="bg-white min-h-screen p-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Friends</h1>
          <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {displayRequests.length > 0 && (
          <div className="mb-4">
            <h2 className="font-semibold text-lg mb-2">Friend Requests</h2>
            <div className="space-y-3">
              {displayRequests.map((request) => (
                <div key={request.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={request.user.avatar} />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{request.user.firstName} {request.user.lastName}</p>
                    <p className="text-sm text-gray-500">{request.mutualFriends} mutual friends</p>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => handleFriendRequest(request.id, 'accept')} 
                        className="flex-1 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-medium active:scale-95 transition-transform"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => handleFriendRequest(request.id, 'reject')} 
                        className="flex-1 py-2 bg-gray-200 rounded-lg text-sm font-medium active:scale-95 transition-transform"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <h2 className="font-semibold text-lg mb-2">People you may know</h2>
        <div className="grid grid-cols-2 gap-2">
          {(friendSuggestions || []).slice(0, 6).map((friend) => (
            <div key={friend.id} className="bg-white border rounded-xl overflow-hidden">
              <img src={`https://picsum.photos/seed/user${friend.id}/200/150`} className="w-full h-28 object-cover" alt="" />
              <div className="p-2">
                <p className="font-semibold text-sm truncate">{friend.firstName} {friend.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{Math.floor(Math.random() * 20) + 1} mutual friends</p>
                <button 
                  onClick={async () => {
                    try {
                      await api.sendFriendRequest(friend.id);
                      refreshFriends();
                    } catch (error) {
                      console.error('Add friend error:', error);
                    }
                  }}
                  className="w-full mt-2 py-1.5 bg-[#1877F2] text-white rounded-lg text-xs font-medium active:scale-95 transition-transform"
                >
                  Add Friend
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWatch = () => (
    <div className="bg-black min-h-screen p-3">
      <h1 className="text-2xl font-bold text-white mb-3">Watch</h1>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['For You', 'Live', 'Gaming', 'Following'].map((tab, i) => (
          <button key={tab} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", i === 0 ? "bg-white text-black" : "bg-white/10 text-white")}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {(reels || []).slice(0, 5).map((reel) => (
          <div key={reel.id} className="rounded-xl overflow-hidden">
            <div className="relative aspect-video">
              <img src={reel.thumbnailUrl || `https://picsum.photos/seed/reel${reel.id}/800/450`} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30">
                  <Play className="w-7 h-7 text-white ml-1" fill="white" />
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8"><AvatarImage src={reel.user.avatar} /></Avatar>
                  <div>
                    <p className="text-white text-sm font-medium">{reel.user.firstName} {reel.user.lastName}</p>
                    <p className="text-white/70 text-xs">{reel.viewCount} views</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div className="bg-white min-h-screen p-3">
      <h1 className="text-2xl font-bold mb-3">Marketplace</h1>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search Marketplace" className="pl-9 bg-gray-100 border-0 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(listings || [
          { id: '1', title: 'iPhone 14 Pro', price: 999, images: ['https://picsum.photos/seed/item1/300/300'] },
          { id: '2', title: 'MacBook Pro', price: 1499, images: ['https://picsum.photos/seed/item2/300/300'] },
          { id: '3', title: 'PS5 Console', price: 450, images: ['https://picsum.photos/seed/item3/300/300'] },
          { id: '4', title: 'Nike Shoes', price: 180, images: ['https://picsum.photos/seed/item4/300/300'] },
        ]).map((item) => (
          <div key={item.id} className="bg-white rounded-xl overflow-hidden border shadow-sm">
            <img src={item.images?.[0] || `https://picsum.photos/seed/${item.id}/300/300`} className="w-full aspect-square object-cover" alt="" />
            <div className="p-2">
              <p className="font-bold text-base">${item.price}</p>
              <p className="text-xs text-gray-500 truncate">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="bg-white min-h-screen p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={markAllNotificationsRead} className="text-[#1877F2] text-sm font-medium">Mark all as read</button>
      </div>
      <div className="flex gap-2 mb-4">
        {['All', 'Unread'].map((tab, i) => (
          <button key={tab} className={cn("px-4 py-2 rounded-full text-sm font-medium", i === 0 ? "bg-[#1877F2] text-white" : "bg-gray-100 text-gray-600")}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={cn("flex gap-3 p-3 rounded-xl cursor-pointer", !notif.isRead && "bg-blue-50")}
            >
              <Avatar className="w-14 h-14">
                <AvatarImage src={notif.image || notif.actor?.avatar} />
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", !notif.isRead && "font-semibold")}>{notif.message}</p>
                <p className="text-xs text-[#1877F2] font-medium mt-0.5">{formatDistanceToNow(notif.createdAt)}</p>
              </div>
              {!notif.isRead && <div className="w-2.5 h-2.5 bg-[#1877F2] rounded-full mt-2" />}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <Sheet open={showSettings} onOpenChange={setShowSettings}>
      <SheetContent side="left" className="w-80 p-0">
        <div className="h-full overflow-y-auto">
          <SheetHeader className="p-4 border-b sticky top-0 bg-white z-10">
            <SheetTitle className="text-xl">Menu</SheetTitle>
          </SheetHeader>
          
          {settingsSection === 'main' && (
            <div className="p-3 space-y-1">
              <button onClick={() => { setShowSettings(false); setCurrentPage('profile'); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 w-full">
                <Avatar className="w-12 h-12"><AvatarImage src={currentUser.avatar} /></Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{currentUser.firstName} {currentUser.lastName}</p>
                  <p className="text-sm text-gray-500">See your profile</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              
              <Separator className="my-2" />
              
              <div className="grid grid-cols-4 gap-1 py-2">
                {[
                  { icon: Users, label: 'Friends', color: 'from-blue-400 to-blue-600' },
                  { icon: Clock, label: 'Memories', color: 'from-purple-400 to-purple-600' },
                  { icon: Bookmark, label: 'Saved', color: 'from-purple-500 to-pink-500' },
                  { icon: Users, label: 'Groups', color: 'from-blue-400 to-blue-600' },
                ].map(({ icon: Icon, label, color }) => (
                  <button key={label} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100">
                    <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center", color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] text-gray-600">{label}</span>
                  </button>
                ))}
              </div>
              
              <Separator className="my-2" />
              
              {[
                { icon: Video, label: 'Video' },
                { icon: ShoppingBag, label: 'Marketplace' },
                { icon: Calendar, label: 'Events' },
                { icon: Flag, label: 'Pages' },
                { icon: Gamepad2, label: 'Gaming' },
                { icon: Star, label: 'Favorites' },
              ].map(({ icon: Icon, label }) => (
                <button key={label} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="flex-1 text-left font-medium">{label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
              
              <Separator className="my-2" />
              
              <p className="text-xs font-semibold text-gray-500 px-3 py-2">HELP & SETTINGS</p>
              
              {[
                { icon: Settings, label: 'Settings & privacy', section: 'settings' },
                { icon: HelpCircle, label: 'Help Center' },
                { icon: MessageSquare, label: 'Give feedback' },
              ].map(({ icon: Icon, label, section }) => (
                <button key={label} onClick={() => section && setSettingsSection(section)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100">
                  <Icon className="w-6 h-6 text-gray-600" />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
              
              <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 text-red-500">
                <LogOut className="w-6 h-6" />
                <span>Log Out</span>
              </button>
              
              <p className="text-center text-xs text-gray-400 py-4">FACEBOOK © 2024</p>
            </div>
          )}
          
          {settingsSection === 'settings' && (
            <div className="p-4">
              <button onClick={() => setSettingsSection('main')} className="flex items-center gap-2 mb-4 text-gray-600">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h2 className="text-lg font-bold mb-4">Settings & Privacy</h2>
              
              <div className="space-y-4">
                {/* Personal Information Section */}
                <div className="space-y-2">
                  <p className="font-semibold text-gray-500 text-xs">PERSONAL INFORMATION</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium">{currentUser.email || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium">{currentUser.phone || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Gender</p>
                        <p className="text-sm font-medium capitalize">{currentUser.gender || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Date of birth</p>
                        <p className="text-sm font-medium">
                          {currentUser.dateOfBirth 
                            ? new Date(currentUser.dateOfBirth).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })
                            : 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-500 text-xs">ACCOUNT</p>
                  <button 
                    onClick={() => { setShowSettings(false); setShowEditProfile(true); }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <Edit className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left font-medium text-sm">Edit profile</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Key className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left font-medium text-sm">Password and security</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold text-gray-500 text-xs">PREFERENCES</p>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-gray-600" />
                      <span>Dark mode</span>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-600" />
                      <span>Notifications</span>
                    </div>
                    <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-gray-600" />
                      <span>Sound</span>
                    </div>
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Play className="w-5 h-5 text-gray-600" />
                      <span>Autoplay videos</span>
                    </div>
                    <Switch checked={autoplayVideos} onCheckedChange={setAutoplayVideos} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  const renderCreatePostModal = () => (
    <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center">Create post</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10"><AvatarImage src={currentUser.avatar} /></Avatar>
            <div>
              <p className="font-semibold">{currentUser.firstName} {currentUser.lastName}</p>
              <button className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-lg">
                {postVisibility === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span className="capitalize">{postVisibility}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
          <Textarea
            placeholder={`What's on your mind, ${currentUser.firstName}?`}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="min-h-32 border-0 text-lg resize-none focus:ring-0 p-0"
            autoFocus
          />
          {postFeeling && (
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 w-fit mb-2 mt-2">
              <span className="text-lg">{feelings.find(f => f.label === postFeeling)?.emoji}</span>
              <span className="text-sm">{postFeeling}</span>
              <button onClick={() => setPostFeeling(null)}><X className="w-4 h-4 text-gray-500" /></button>
            </div>
          )}
          
          {/* Media Preview */}
          {postMediaPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden">
              {postMediaType === 'video' ? (
                <video src={postMediaPreview} controls className="w-full max-h-60 object-cover" />
              ) : (
                <img src={postMediaPreview} alt="" className="w-full max-h-60 object-cover" />
              )}
              <button
                onClick={() => { setPostMediaPreview(''); setPostMediaUrl(''); }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 mx-4 mb-4 border rounded-xl">
          <span className="font-medium text-sm">Add to your post</span>
          <div className="flex gap-1">
            <input
              ref={postFileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handlePostFileSelect}
              className="hidden"
            />
            <button 
              onClick={() => postFileInputRef.current?.click()} 
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ImageIcon className="w-6 h-6 text-green-500" />
            </button>
            <button onClick={() => setShowFeelingPicker(!showFeelingPicker)} className="p-2 rounded-full hover:bg-gray-100">
              <Smile className="w-6 h-6 text-yellow-500" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <MapPin className="w-6 h-6 text-red-500" />
            </button>
          </div>
        </div>
        {showFeelingPicker && (
          <div className="px-4 mb-4">
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl">
              {feelings.map((feeling) => (
                <button
                  key={feeling.label}
                  onClick={() => { setPostFeeling(feeling.label); setShowFeelingPicker(false); }}
                  className={cn("flex items-center gap-2 p-2 rounded-lg text-sm", postFeeling === feeling.label ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100")}
                >
                  <span className="text-lg">{feeling.emoji}</span>
                  <span className="truncate">{feeling.label.replace('feeling ', '')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="px-4 pb-4">
          <Button 
            onClick={handleCreatePost} 
            disabled={!postContent.trim() && !postMediaUrl} 
            className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold disabled:opacity-50"
          >
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderProfile = () => (
    <div className="bg-white min-h-screen">
      <div className="relative h-48 bg-gray-200">
        {currentUser.coverPhoto && <img src={currentUser.coverPhoto} className="w-full h-full object-cover" alt="" />}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-3 right-3 bg-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-lg"
        >
          <Camera className="w-4 h-4" /> Edit cover photo
        </button>
      </div>
      <div className="relative px-4">
        <div className="relative -mt-20 w-36 h-36">
          <Avatar className="w-36 h-36 border-4 border-white shadow-lg">
            <AvatarImage src={currentUser.avatar} className="object-cover" />
          </Avatar>
          <button className="absolute bottom-1 right-1 w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center shadow">
            <Camera className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-bold">{currentUser.firstName} {currentUser.lastName}</h1>
          {currentUser.isVerified && <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
        </div>
        <p className="text-gray-500 text-sm mt-1">{currentUser.bio}</p>
        <div className="flex gap-2 mt-3">
          <button 
            onClick={() => setShowCreateStory(true)}
            className="flex-1 h-9 bg-[#1877F2] text-white rounded-lg font-medium text-sm flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add to story
          </button>
          <button 
            onClick={() => setShowEditProfile(true)}
            className="flex-1 h-9 bg-gray-200 rounded-lg font-medium text-sm flex items-center justify-center gap-1"
          >
            <Edit className="w-4 h-4" /> Edit profile
          </button>
        </div>
      </div>
      <Separator />
      <div className="p-4 flex gap-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <span className="font-semibold">{currentUser.friendCount?.toLocaleString()}</span>
          <span className="text-gray-500">friends</span>
        </div>
      </div>
      <Separator />
      <div className="p-4 space-y-3">
        {currentUser.workplace && <div className="flex items-center gap-3"><Briefcase className="w-5 h-5 text-gray-500" /><span className="text-sm">Works at <strong>{currentUser.workplace}</strong></span></div>}
        {currentUser.education && <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-gray-500" /><span className="text-sm">Studied at <strong>{currentUser.education}</strong></span></div>}
        {currentUser.currentCity && <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-gray-500" /><span className="text-sm">Lives in <strong>{currentUser.currentCity}</strong></span></div>}
        {currentUser.hometown && <div className="flex items-center gap-3"><Home className="w-5 h-5 text-gray-500" /><span className="text-sm">From <strong>{currentUser.hometown}</strong></span></div>}
      </div>
      <Separator />
      <div className="p-4">
        <div className="flex border-b mb-4">
          {['Posts', 'About', 'Friends', 'Photos'].map((tab, i) => (
            <button key={tab} className={cn("px-4 py-3 text-sm font-medium relative", i === 0 ? "text-[#1877F2]" : "text-gray-500")}>
              {tab}
              {i === 0 && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1877F2]" />}
            </button>
          ))}
        </div>
        {posts.filter(p => p.author.id === currentUser.id).map(post => (
          <PostItem key={post.id} post={post} currentUser={currentUser} onReaction={handleReaction} onComment={handleComment} onShare={handleShare} onSave={handleSave} onDelete={handleDelete} />
        ))}
        {posts.filter(p => p.author.id === currentUser.id).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No posts yet</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-gray-100">
      {renderHeader()}
      <main className="pt-12 pb-12">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && <div key="home">{renderHome()}</div>}
          {currentPage === 'friends' && <div key="friends">{renderFriends()}</div>}
          {currentPage === 'watch' && <div key="watch">{renderWatch()}</div>}
          {currentPage === 'marketplace' && <div key="marketplace">{renderMarketplace()}</div>}
          {currentPage === 'notifications' && <div key="notifications">{renderNotifications()}</div>}
          {currentPage === 'profile' && <div key="profile">{renderProfile()}</div>}
        </AnimatePresence>
      </main>
      {renderBottomNav()}
      {renderSettings()}
      {renderCreatePostModal()}
      
      {/* Edit Profile Modal */}
      <EditProfileModal
        key={showEditProfile ? 'open' : 'closed'}
        user={currentUser}
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSave={handleUpdateProfile}
      />
      
      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onCreate={handleCreateStory}
      />
      
      {/* Story Viewer */}
      <AnimatePresence>
        {showStoryViewer && (
          <StoryViewer
            key={showStoryViewer}
            story={stories.find(s => s.id === showStoryViewer)!}
            onClose={() => setShowStoryViewer(null)}
            onNext={() => {
              const idx = stories.findIndex(s => s.id === showStoryViewer);
              setShowStoryViewer(stories[(idx + 1) % stories.length].id);
            }}
            onPrev={() => {
              const idx = stories.findIndex(s => s.id === showStoryViewer);
              setShowStoryViewer(stories[idx === 0 ? stories.length - 1 : idx - 1].id);
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Chat View */}
      <AnimatePresence>
        {showChat && showChat !== 'list' && (
          <ChatView 
            chat={chats.find(c => c.id === showChat)!} 
            currentUser={currentUser} 
            onBack={() => setShowChat(null)} 
            onSendMessage={(content, mediaUrl, mediaType) => {
              console.log('Send message:', content, mediaUrl, mediaType);
              // Here you would call the API to send the message
            }}
          />
        )}
        {showChat === 'list' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 bg-white z-[60]"
          >
            <div className="flex items-center gap-3 p-3 border-b">
              <button onClick={() => setShowChat(null)} className="w-9 h-9 rounded-full flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold flex-1">Chats</h1>
              <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                <Edit className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search" className="pl-9 bg-gray-100 border-0 rounded-full" />
              </div>
              <div className="space-y-1">
                {chats.map((chat) => (
                  <button key={chat.id} onClick={() => setShowChat(chat.id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100">
                    <div className="relative">
                      <Avatar className="w-14 h-14"><AvatarImage src={chat.user.avatar} /></Avatar>
                      {chat.user.isOnline && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold">{chat.user.firstName} {chat.user.lastName}</p>
                      <p className={cn("text-sm truncate", chat.unreadCount > 0 ? "font-semibold text-blue-600" : "text-gray-500")}>
                        {chat.lastMessage.content}
                      </p>
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{chat.unreadCount}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
