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
  UserPlus, UserMinus, Camera, Edit, Trash2, Phone, Clock, Star, Gift, Music,
  Volume2, VolumeX, Shield, Key, Monitor, Globe2, MessageSquare,
  BookOpen, Radio, HeartHandshake, Loader2, Film, Mail, ArrowLeft, Home as HomeIcon,
  AtSign, UsersRound, Copy, Link2, Wifi, WifiOff
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

// ============ SHARE MODAL ============
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  currentUser: UserType;
  onShare: (postId: string, message: string, shareType: string) => void;
}

function ShareModal({ isOpen, onClose, post, currentUser, onShare }: ShareModalProps) {
  const [shareMessage, setShareMessage] = useState('');
  const [shareType, setShareType] = useState<'timeline' | 'message' | 'group'>('timeline');
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    onShare(post.id, shareMessage, shareType);
    setShareMessage('');
    onClose();
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center">Share</DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
          {/* Share Options */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setShareType('timeline')}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                shareType === 'timeline' ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium">Your Timeline</span>
            </button>
            
            <button
              onClick={() => setShareType('message')}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                shareType === 'message' ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium">In a Message</span>
            </button>
            
            <button
              onClick={() => setShareType('group')}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                shareType === 'group' ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <UsersRound className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-medium">To a Group</span>
            </button>
          </div>

          {/* Write Something */}
          <div className="flex gap-2 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={currentUser.avatar} />
            </Avatar>
            <Textarea
              placeholder="Write something about this..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              className="flex-1 min-h-[80px] resize-none"
            />
          </div>

          {/* Post Preview */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.author.avatar} />
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{post.author.firstName} {post.author.lastName}</p>
              </div>
            </div>
            {post.content && (
              <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
            )}
            {post.mediaUrl && (
              <div className="mt-2 h-24 rounded-lg overflow-hidden bg-gray-200">
                {post.mediaType === 'video' ? (
                  <video src={post.mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            )}
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 p-3 border rounded-xl hover:bg-gray-50 mb-4"
          >
            {copied ? <Check className="w-5 h-5 text-green-600" /> : <Link2 className="w-5 h-5 text-gray-600" />}
            <span className="font-medium text-sm">{copied ? 'Link copied!' : 'Copy link'}</span>
          </button>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleShare} className="flex-1 bg-[#1877F2] hover:bg-[#166FE5]">
              {shareType === 'timeline' ? 'Share Now' : shareType === 'message' ? 'Send' : 'Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ REACTION VIEWERS DIALOG ============
interface ReactionUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  reactionType: string;
}

interface ReactionViewersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  reactionCounts: {
    like: number;
    love: number;
    haha: number;
    wow: number;
    sad: number;
    angry: number;
  };
}

function ReactionViewersDialog({ isOpen, onClose, postId, reactionCounts }: ReactionViewersDialogProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [reactionUsers, setReactionUsers] = useState<ReactionUser[]>([]);
  const [loading, setLoading] = useState(false);

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  // Generate mock reaction users based on counts
  useEffect(() => {
    if (!isOpen) return;
    
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setLoading(true);
      // Simulate API call - in real app, fetch from API
      const mockUsers: ReactionUser[] = [];
      const names = ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown', 'Charlie Davis', 'Emma Johnson', 'Michael Lee', 'Sarah Miller'];
      
      Object.entries(reactionCounts).forEach(([type, count]) => {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const name = names[Math.floor(Math.random() * names.length)];
          mockUsers.push({
            id: `user-${type}-${i}`,
            firstName: name.split(' ')[0],
            lastName: name.split(' ')[1],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            reactionType: type
          });
        }
      });
      
      setReactionUsers(mockUsers);
      setLoading(false);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [isOpen, reactionCounts]);

  const filteredUsers = activeTab === 'all' 
    ? reactionUsers 
    : reactionUsers.filter(u => u.reactionType === activeTab);

  const tabs = [
    { key: 'all', label: 'All', count: totalReactions },
    { key: 'like', label: '👍', count: reactionCounts.like },
    { key: 'love', label: '❤️', count: reactionCounts.love },
    { key: 'haha', label: '😂', count: reactionCounts.haha },
    { key: 'wow', label: '😮', count: reactionCounts.wow },
    { key: 'sad', label: '😢', count: reactionCounts.sad },
    { key: 'angry', label: '😡', count: reactionCounts.angry },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center">Reactions</DialogTitle>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.key 
                  ? "border-[#1877F2] text-[#1877F2]" 
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <span>{tab.label}</span>
              <span className="text-xs text-gray-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* User List */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#1877F2]" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="p-2">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.firstName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                  </div>
                  <span className="text-lg">
                    {reactions.find(r => r.type === user.reactionType)?.icon}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No reactions yet</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ ENHANCED VIDEO PLAYER ============
interface VideoPlayerProps {
  src: string;
  className?: string;
}

function VideoPlayer({ src, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [quality, setQuality] = useState<'auto' | '1080p' | '720p' | '480p' | '360p'>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState<string>('Unknown');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Detect network speed
  useEffect(() => {
    const detectNetwork = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        const downlink = connection.downlink; // Mbps
        if (downlink >= 10) {
          setNetworkSpeed('Fast (4G/WiFi)');
          if (quality === 'auto') setQuality('720p');
        } else if (downlink >= 5) {
          setNetworkSpeed('Good (4G)');
          if (quality === 'auto') setQuality('480p');
        } else if (downlink >= 1) {
          setNetworkSpeed('Slow (3G)');
          if (quality === 'auto') setQuality('360p');
        } else {
          setNetworkSpeed('Very Slow');
          if (quality === 'auto') setQuality('360p');
        }
      } else {
        setNetworkSpeed('Unknown');
      }
    };

    detectNetwork();

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', detectNetwork);
      return () => connection.removeEventListener('change', detectNetwork);
    }
  }, [quality]);

  const qualities = [
    { key: 'auto', label: 'Auto' },
    { key: '1080p', label: '1080p HD' },
    { key: '720p', label: '720p HD' },
    { key: '480p', label: '480p' },
    { key: '360p', label: '360p' },
  ];

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        src={src}
        controls
        className={className}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={() => {
          if (videoRef.current) {
            setIsMuted(videoRef.current.muted);
          }
        }}
      />
      
      {/* Quality Selector Overlay */}
      <div className="absolute bottom-12 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-white text-xs font-medium hover:bg-black/80"
          >
            <Wifi className="w-3 h-3" />
            {quality === 'auto' ? 'Auto' : quality}
          </button>
          
          {showQualityMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full right-0 mb-1 bg-black/90 rounded-lg py-1 min-w-[120px]"
            >
              {/* Network Speed Indicator */}
              <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700 mb-1">
                Network: {networkSpeed}
              </div>
              
              {qualities.map((q) => (
                <button
                  key={q.key}
                  onClick={() => {
                    setQuality(q.key as any);
                    setShowQualityMenu(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs text-white hover:bg-white/10",
                    quality === q.key && "bg-blue-500/30"
                  )}
                >
                  {q.label}
                  {q.key === 'auto' && ' (Adaptive)'}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ POST ITEM ============
function PostItem({ post, currentUser, onReaction, onComment, onShare, onSave, onDelete }: { 
  post: Post; 
  currentUser: UserType;
  onReaction: (postId: string, reaction: string) => void;
  onComment: (postId: string, comment: string) => void;
  onShare: (postId: string, message?: string, shareType?: string) => void;
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReactionViewers, setShowReactionViewers] = useState(false);

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
            <VideoPlayer
              src={post.mediaUrl}
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
        <button 
          onClick={() => totalReactions > 0 && setShowReactionViewers(true)}
          className={cn(
            "flex items-center gap-1",
            totalReactions > 0 && "cursor-pointer hover:underline"
          )}
        >
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
        </button>
        <div className="flex gap-3 text-sm text-gray-500">
          <button onClick={() => setShowComments(!showComments)} className="hover:underline">
            {counts.comment} comment{counts.comment !== 1 ? 's' : ''}
          </button>
          <button onClick={() => setShowShareModal(true)} className="hover:underline">
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
          onClick={() => setShowShareModal(true)}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
        currentUser={currentUser}
        onShare={(postId, message, shareType) => {
          setCounts(prev => ({ ...prev, share: prev.share + 1 }));
          onShare(postId, message, shareType);
        }}
      />

      {/* Reaction Viewers Dialog */}
      <ReactionViewersDialog
        isOpen={showReactionViewers}
        onClose={() => setShowReactionViewers(false)}
        postId={post.id}
        reactionCounts={{
          like: counts.like,
          love: counts.love,
          haha: counts.haha,
          wow: counts.wow,
          sad: counts.sad,
          angry: counts.angry,
        }}
      />
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
  const [newMessage, setNewMessage] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize messages safely - use empty array if chat is undefined
  const [messages, setMessages] = useState<MessageType[]>(() => {
    if (!chat || !chat.user) return [];
    return [
      { id: 'm1', content: 'Hey there! 👋', senderId: chat.user.id, createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: true },
      { id: 'm2', content: 'Hi! How are you?', senderId: currentUser.id, createdAt: new Date(Date.now() - 3000000).toISOString(), isRead: true },
      { id: 'm3', content: chat.lastMessage?.content || 'Hello!', senderId: chat.user.id, createdAt: chat.lastMessage?.createdAt || new Date().toISOString(), isRead: chat.lastMessage?.isRead ?? true },
    ];
  });

  // Handle case when chat is undefined
  if (!chat || !chat.user) {
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center"
      >
        <p className="text-gray-500 mb-4">Select a conversation to start chatting</p>
        <button onClick={onBack} className="px-4 py-2 bg-gray-100 rounded-lg">
          Back
        </button>
      </motion.div>
    );
  }

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
  const [codeResent, setCodeResent] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // Track if real email was sent

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [displayResetCode, setDisplayResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false); // Track if real email was sent for reset

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
          setDisplayCode(data.verificationCode || '');
          setEmailSent(data.emailSent || false);
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
    setCodeResent(false);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      // Update display code and email status
      if (data.verificationCode) {
        setDisplayCode(data.verificationCode);
      }
      setEmailSent(data.emailSent || false);
      setVerificationCode('');
      setError('');
      setCodeResent(true);
      setTimeout(() => setCodeResent(false), 3000);
    } catch (err) {
      setError('Failed to resend code. Please try again.');
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
          setResetEmailSent(data.emailSent || false);
          setResetStep('code');
        } else {
          setResetEmailSent(data.emailSent || false);
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

            {/* Show code display or email sent message */}
            {emailSent ? (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 mb-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">Email Sent!</span>
                </div>
                <p className="text-sm text-white/90">
                  A 6-digit verification code has been sent to your email address. Please check your inbox (and spam folder).
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 mb-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-xs">ℹ️</span>
                  </div>
                  <span className="font-semibold text-sm">Demo Mode - Use this code:</span>
                </div>
                <div className="bg-white/20 rounded-lg p-3 text-center">
                  <span className="text-4xl font-bold tracking-widest">{displayCode || '------'}</span>
                </div>
                <p className="text-xs text-white/80 mt-2 text-center">
                  (Configure RESEND_API_KEY in .env to send real emails)
                </p>
              </div>
            )}

            {/* Code resent success message */}
            {codeResent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-green-700 text-sm font-medium">
                  {emailSent ? 'New code sent to your email!' : 'New code generated! Check above.'}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Enter 6-digit code</label>
                <Input
                  placeholder="Enter code above"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-xl tracking-widest"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>
              )}

              <Button
                onClick={handleVerifyCode}
                disabled={verifying || verificationCode.length !== 6}
                className="w-full h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold"
              >
                {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
              </Button>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleResendCode}
                  className="text-sm text-[#1877F2] hover:underline flex items-center gap-1"
                >
                  <span>🔄</span> Resend code
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    if (displayCode) {
                      setVerificationCode(displayCode);
                    }
                  }}
                  className="text-sm text-green-600 hover:underline flex items-center gap-1"
                >
                  <span>📋</span> Auto-fill code
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

            {/* Show reset code display or email sent message */}
            {resetStep === 'code' && (
              resetEmailSent ? (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 mb-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm">Email Sent!</span>
                  </div>
                  <p className="text-sm text-white/90">
                    A password reset code has been sent to your email. Please check your inbox (and spam folder).
                  </p>
                </div>
              ) : displayResetCode ? (
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-4 mb-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xs">ℹ️</span>
                    </div>
                    <span className="font-semibold text-sm">Demo Mode - Your reset code:</span>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3 text-center">
                    <span className="text-4xl font-bold tracking-widest">{displayResetCode}</span>
                  </div>
                  <p className="text-xs text-white/80 mt-2 text-center">
                    (Configure RESEND_API_KEY in .env to send real emails)
                  </p>
                </div>
              ) : null
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
  onSave: (data: Partial<UserType>) => Promise<{ error?: string } | void>;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username || '');
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
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check username availability with debounce
  const checkUsername = async (value: string) => {
    if (!value || value === user.username) {
      setUsernameError('');
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/users/check-username?username=${value.toLowerCase()}`);
      const data = await res.json();
      if (!data.available) {
        setUsernameError('Username not available');
      } else {
        setUsernameError('');
      }
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Debounced username check
  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitized);
    setUsernameError('');
    
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }
    
    usernameCheckTimeoutRef.current = setTimeout(() => {
      checkUsername(sanitized);
    }, 500);
  };

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

  const handleSave = async () => {
    if (usernameError) return;
    
    try {
      const result = await onSave({
        firstName,
        lastName,
        username: username.toLowerCase(),
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
      
      if (result?.error === 'Username is already taken') {
        setUsernameError('Username not available');
        return;
      }
      
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    }
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
                <label className="text-sm text-gray-500 mb-1 block">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                  <Input 
                    value={username} 
                    onChange={(e) => handleUsernameChange(e.target.value)} 
                    placeholder="username"
                    className={cn("pl-7", usernameError && "border-red-500 focus:ring-red-500")}
                  />
                  {checkingUsername && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
                {usernameError ? (
                  <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Your profile URL: facebook.com/{username || 'username'}</p>
                )}
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
  const { stories: apiStories, create: createStory, refresh: refreshStories } = useStories('feed');
  const { conversations } = useConversations();
  const { listings } = useMarketplace();
  const { reels } = useReels('feed');
  
  // Friend count state - must be declared before currentUser
  const [realFriendCount, setRealFriendCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Current user
  const currentUser: UserType = authUser ? {
    ...authUser,
    friendCount: realFriendCount || authUser.friendCount || 0,
    followerCount: followerCount || authUser.followerCount || 0,
    followingCount: followingCount || authUser.followingCount || 0
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
  const [profileTab, setProfileTab] = useState('Posts');
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [friendsList, setFriendsList] = useState<UserType[]>([]);
  const [blockedUsersList, setBlockedUsersList] = useState<UserType[]>([]);
  
  // View other user's profile
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<UserType | null>(null);
  const [viewingUserPosts, setViewingUserPosts] = useState<Post[]>([]);
  const [viewingUserFriends, setViewingUserFriends] = useState<UserType[]>([]);
  const [viewingUserTab, setViewingUserTab] = useState('Posts');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [showFriendActions, setShowFriendActions] = useState<string | null>(null);
  
  // Create Post States
  const [postContent, setPostContent] = useState('');
  const [postFeeling, setPostFeeling] = useState<string | null>(null);
  const [postVisibility, setPostVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video'>('image');
  const [postMediaPreview, setPostMediaPreview] = useState('');
  const [postFileSize, setPostFileSize] = useState(0);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);

  // Settings States
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [whoCanSeePosts, setWhoCanSeePosts] = useState('friends');
  const [whoCanAddFriends, setWhoCanAddFriends] = useState('everyone');
  const [whoCanMessage, setWhoCanMessage] = useState('everyone');
  const [viewingFullImage, setViewingFullImage] = useState<string | null>(null);
  const [loggedInDevices, setLoggedInDevices] = useState([
    { id: '1', device: 'Chrome on Windows', location: 'Dhaka, Bangladesh', lastActive: new Date(), isCurrent: true },
  ]);
  
  // Password Change States
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [showPasswordChangeVisibility, setShowPasswordChangeVisibility] = useState(false);
  
  // Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Save preferences to API
  useEffect(() => {
    const savePreferences = async () => {
      try {
        await api.updateUser({
          showOnlineStatus,
          profileVisibility: whoCanSeePosts,
          allowFriendRequests: whoCanAddFriends === 'everyone',
          allowMessageRequests: whoCanMessage === 'everyone'
        });
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    };
    
    if (authUser) {
      savePreferences();
    }
  }, [showOnlineStatus, whoCanSeePosts, whoCanAddFriends, whoCanMessage]);

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
    
    // Return only real stories (no mock data)
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
    // Return empty array instead of mock data
    return [];
  }, [conversations]);

  // Fetch friend count and friends list on mount
  useEffect(() => {
    const fetchFriendData = async () => {
      try {
        const [friendsRes, blockedRes] = await Promise.all([
          api.getFriends('friends'),
          api.getBlockedUsers()
        ]);
        if (friendsRes.friends) {
          setFriendsList(friendsRes.friends);
          setRealFriendCount(friendsRes.friends.length);
        }
        if (blockedRes.blockedUsers) {
          setBlockedUsersList(blockedRes.blockedUsers);
        }
        
        // Fetch follower/following counts
        const userRes = await api.getCurrentUser();
        if (userRes.user) {
          setFollowerCount(userRes.user.followerCount || 0);
          setFollowingCount(userRes.user.followingCount || 0);
        }
      } catch (error) {
        console.error('Fetch friend data error:', error);
      }
    };
    if (authUser) {
      fetchFriendData();
    }
  }, [authUser]);

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

  const handleShare = async (postId: string, message?: string, shareType?: string) => {
    try {
      await api.sharePost(postId, message, shareType as 'timeline' | 'message' | undefined);
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
      // Store file size for display
      setPostFileSize(file.size);
      
      // Read file with original quality (no compression)
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setPostMediaPreview(url);
        setPostMediaUrl(url);
        setPostMediaType(file.type.startsWith('video') ? 'video' : 'image');
      };
      // Read as data URL to keep original quality
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
        setPostFileSize(0);
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
      // Refresh stories after creation
      refreshStories();
    } catch (error) {
      console.error('Create story error:', error);
    }
  };

  const handleUpdateProfile = async (data: Partial<UserType>): Promise<{ error?: string } | void> => {
    try {
      const res = await api.updateUser(data);
      if (res?.error) {
        return { error: res.error };
      }
      // Refresh user data
      const userRes = await api.getCurrentUser();
      if (userRes.user) {
        setUser(userRes.user);
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      if (error?.message?.includes('username')) {
        return { error: 'Username is already taken' };
      }
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

  // Profile/cover photo handlers
  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleUpdateProfile({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleUpdateProfile({ coverPhoto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Password change handler
  const handlePasswordChange = async () => {
    setPasswordChangeError('');
    setPasswordChangeSuccess(false);
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordChangeError('Please fill in all fields');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordChangeError('New password must be at least 8 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }
    
    setPasswordChangeLoading(true);
    
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setPasswordChangeError(data.error);
      } else {
        setPasswordChangeSuccess(true);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordChangeSuccess(false);
        }, 2000);
      }
    } catch (error) {
      setPasswordChangeError('Failed to change password. Please try again.');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Start or open chat with a user
  const handleStartChat = async (userId: string) => {
    try {
      // Try to find existing conversation or create a new one
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: userId })
      });
      
      const data = await res.json();
      
      if (data.conversation) {
        setShowChat(data.conversation.id);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      // Fallback: just open chat with user ID as identifier
      setShowChat(userId);
    }
  };

  // View another user's profile
  const handleViewUserProfile = async (userId: string) => {
    if (userId === currentUser.id) {
      setCurrentPage('profile');
      return;
    }
    
    // Show loading state
    setViewingUserId(userId);
    setViewingUser(null); // Reset previous data to show loading
    setViewingUserPosts([]);
    setViewingUserFriends([]);
    
    try {
      // Fetch all data in parallel
      const [userRes, postsRes, friendsRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/posts?userId=${userId}&limit=20`),
        fetch(`/api/friends?type=friends&userId=${userId}`)
      ]);
      
      const [userData, postsData, friendsData] = await Promise.all([
        userRes.json(),
        postsRes.json(),
        friendsRes.json()
      ]);
      
      if (userData.user) {
        setViewingUser(userData.user);
        setViewingUserTab('Posts');
        setViewingUserPosts(postsData.posts || []);
        setViewingUserFriends(friendsData.friends || []);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleCloseUserProfile = () => {
    setViewingUserId(null);
    setViewingUser(null);
    setViewingUserPosts([]);
    setViewingUserFriends([]);
  };

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, action: 'unfriend' })
      });
      setFriendsList(prev => prev.filter(f => f.id !== friendId));
      setRealFriendCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Block user
  const handleBlockUser = async (userId: string) => {
    try {
      await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: userId, action: 'block' })
      });
      setFriendsList(prev => prev.filter(f => f.id !== userId));
      // Refresh blocked users
      const blockRes = await fetch('/api/block');
      const blockData = await blockRes.json();
      setBlockedUsersList(blockData.blockedUsers || []);
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  // Unblock user
  const handleUnblockUser = async (userId: string) => {
    try {
      await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: userId, action: 'unblock' })
      });
      setBlockedUsersList(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
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
      className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm"
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
                className="pl-9 bg-gray-100 dark:bg-gray-700 border-0 rounded-full h-9"
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
              <button onClick={() => setShowSearch(true)} className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={() => setShowChat('list')} className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center relative">
                <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg"
      initial={{ y: 60 }}
      animate={{ y: 0 }}
    >
      <div className="flex justify-around items-center h-14 px-1">
        {[
          { id: 'home', icon: Home, label: 'Home', gradient: 'from-blue-500 to-blue-600' },
          { id: 'friends', icon: Users, label: 'Friends', badge: friendRequestCount, gradient: 'from-indigo-500 to-purple-600' },
          { id: 'watch', icon: Play, label: 'Watch', gradient: 'from-pink-500 to-rose-600' },
          { id: 'marketplace', icon: ShoppingBag, label: 'Market', gradient: 'from-cyan-500 to-teal-600' },
          { id: 'notifications', icon: Bell, label: 'Alerts', badge: unreadNotifications, gradient: 'from-orange-500 to-amber-600' },
          { id: 'menu', icon: Menu, label: 'Menu', gradient: 'from-gray-600 to-gray-800' },
        ].map(({ id, icon: Icon, label, badge, gradient }) => (
          <button
            key={id}
            onClick={() => id === 'menu' ? setShowSettings(true) : setCurrentPage(id)}
            className="flex flex-col items-center justify-center px-3 py-1.5 relative group"
          >
            <div className={cn(
              "relative p-1.5 rounded-xl transition-all duration-200",
              currentPage === id && `bg-gradient-to-br ${gradient} shadow-lg`
            )}>
              <Icon className={cn(
                "w-6 h-6 transition-all duration-200",
                currentPage === id ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:scale-110"
              )} />
              {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[10px] mt-1 transition-all duration-200",
              currentPage === id ? `font-semibold bg-gradient-to-r ${gradient} bg-clip-text text-transparent` : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
            )}>
              {label}
            </span>
            {currentPage === id && (
              <motion.div layoutId="activeTab" className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-full shadow-sm" />
            )}
          </button>
        ))}
      </div>
    </motion.nav>
  );

  const renderStories = () => (
    <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
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
    <div className="bg-white dark:bg-gray-800 p-3 border-b dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 ring-2 ring-gray-100 dark:ring-gray-700">
          <AvatarImage src={currentUser.avatar} />
        </Avatar>
        <button
          onClick={() => setShowCreatePost(true)}
          className="flex-1 h-10 bg-gray-100 dark:bg-gray-700 rounded-full px-4 text-left text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-[15px]"
        >
          What's on your mind, {currentUser.firstName}?
        </button>
      </div>
      <Separator className="my-2 dark:bg-gray-700" />
      <div className="flex justify-around">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all group">
          <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Live</span>
        </button>
        <button onClick={() => setShowCreatePost(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all group">
          <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Photo</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all group">
          <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
            <Smile className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Feeling</span>
        </button>
      </div>
    </div>
  );

  const renderHome = () => (
    <div>
      {renderStories()}
      {renderCreatePost()}
      <div className="bg-white dark:bg-gray-800 p-3 border-b dark:border-gray-700">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
            <Video className="w-5 h-5" />
            Create Room
          </button>
          {chats.filter(c => c.user.isOnline).slice(0, 5).map((c) => (
            <div key={c.id} className="relative flex-shrink-0">
              <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80">
                <AvatarImage src={c.user.avatar} />
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
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
        <div className="bg-white dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
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
    <div className="bg-white dark:bg-gray-800 min-h-screen p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold dark:text-white">Notifications</h1>
        <button onClick={markAllNotificationsRead} className="text-[#1877F2] text-sm font-medium">Mark all as read</button>
      </div>
      <div className="flex gap-2 mb-4">
        {['All', 'Unread'].map((tab, i) => (
          <button key={tab} className={cn("px-4 py-2 rounded-full text-sm font-medium", i === 0 ? "bg-[#1877F2] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300")}>
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
              className={cn("flex gap-3 p-3 rounded-xl cursor-pointer", !notif.isRead && "bg-blue-50 dark:bg-blue-900/20")}
            >
              <Avatar className="w-14 h-14">
                <AvatarImage src={notif.image || notif.actor?.avatar} />
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm dark:text-gray-200", !notif.isRead && "font-semibold")}>{notif.message}</p>
                <p className="text-xs text-[#1877F2] font-medium mt-0.5">{formatDistanceToNow(notif.createdAt)}</p>
              </div>
              {!notif.isRead && <div className="w-2.5 h-2.5 bg-[#1877F2] rounded-full mt-2" />}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="bg-white min-h-screen p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Events</h1>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['For You', 'Online', 'Local', 'Following'].map((tab, i) => (
          <button key={tab} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", i === 0 ? "bg-[#1877F2] text-white" : "bg-gray-100 text-gray-600")}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {[
          { id: '1', title: 'Tech Meetup 2024', date: 'Dec 15, 2024', location: 'San Francisco, CA', going: 234, image: 'https://picsum.photos/seed/event1/400/200' },
          { id: '2', title: 'Music Festival', date: 'Dec 20, 2024', location: 'Los Angeles, CA', going: 1520, image: 'https://picsum.photos/seed/event2/400/200' },
          { id: '3', title: 'Art Exhibition', date: 'Dec 25, 2024', location: 'New York, NY', going: 89, image: 'https://picsum.photos/seed/event3/400/200' },
        ].map((event) => (
          <div key={event.id} className="bg-white rounded-xl border overflow-hidden">
            <img src={event.image} className="w-full h-32 object-cover" alt="" />
            <div className="p-3">
              <p className="text-xs text-[#1877F2] font-medium">{event.date}</p>
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-gray-500">{event.location}</p>
              <div className="flex items-center gap-2 mt-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">{event.going} going</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-medium">Interested</button>
                <button className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">Share</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPages = () => (
    <div className="bg-white min-h-screen p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Pages</h1>
        <button className="w-9 h-9 bg-[#1877F2] rounded-full flex items-center justify-center">
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        {['Suggestions', 'Liked', 'Following'].map((tab, i) => (
          <button key={tab} className={cn("px-4 py-2 rounded-full text-sm font-medium", i === 0 ? "bg-[#1877F2] text-white" : "bg-gray-100 text-gray-600")}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {[
          { id: '1', name: 'Tech News Daily', category: 'News & Media', followers: '2.5M', image: 'https://picsum.photos/seed/page1/200/200' },
          { id: '2', name: 'Food & Travel', category: 'Lifestyle', followers: '1.2M', image: 'https://picsum.photos/seed/page2/200/200' },
          { id: '3', name: 'Sports Center', category: 'Sports', followers: '5.8M', image: 'https://picsum.photos/seed/page3/200/200' },
        ].map((page) => (
          <div key={page.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <img src={page.image} className="w-14 h-14 rounded-lg object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{page.name}</p>
              <p className="text-xs text-gray-500">{page.category} • {page.followers} followers</p>
            </div>
            <button className="px-4 py-1.5 bg-[#1877F2] text-white rounded-lg text-sm font-medium">Like</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGaming = () => (
    <div className="bg-white min-h-screen p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Gaming</h1>
        <button className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
          <Search className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['For You', 'Following', 'Live Now', 'Popular'].map((tab, i) => (
          <button key={tab} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", i === 0 ? "bg-[#1877F2] text-white" : "bg-gray-100 text-gray-600")}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {[
          { id: '1', name: 'Candy Crush Saga', players: '10M playing', image: 'https://picsum.photos/seed/game1/200/200' },
          { id: '2', name: 'FarmVille 3', players: '5M playing', image: 'https://picsum.photos/seed/game2/200/200' },
          { id: '3', name: 'Words With Friends', players: '3M playing', image: 'https://picsum.photos/seed/game3/200/200' },
        ].map((game) => (
          <div key={game.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <img src={game.image} className="w-14 h-14 rounded-xl object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{game.name}</p>
              <p className="text-xs text-gray-500">{game.players}</p>
            </div>
            <button className="px-4 py-1.5 bg-[#1877F2] text-white rounded-lg text-sm font-medium">Play</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="bg-white min-h-screen p-3">
      <h1 className="text-2xl font-bold mb-3">Favorites</h1>
      <p className="text-gray-500 text-sm mb-4">Quick access to the things you love</p>
      <div className="space-y-3">
        {[
          { id: '1', name: 'Sarah Wilson', type: 'Friend', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
          { id: '2', name: 'Tech News Daily', type: 'Page', avatar: 'https://picsum.photos/seed/fav1/100/100' },
          { id: '3', name: 'Photography Group', type: 'Group', avatar: 'https://picsum.photos/seed/fav2/100/100' },
        ].map((fav) => (
          <button key={fav.id} className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
            <Avatar className="w-12 h-12">
              <AvatarImage src={fav.avatar} />
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-semibold">{fav.name}</p>
              <p className="text-xs text-gray-500">{fav.type}</p>
            </div>
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderGroups = () => (
    <div className="bg-white min-h-screen p-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Groups</h1>
        <button className="w-9 h-9 bg-[#1877F2] rounded-full flex items-center justify-center">
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        {['Your Groups', 'Discover', 'Invites'].map((tab, i) => (
          <button key={tab} className={cn("px-4 py-2 rounded-full text-sm font-medium", i === 0 ? "bg-[#1877F2] text-white" : "bg-gray-100 text-gray-600")}>
            {tab}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {[
          { id: '1', name: 'Photography Enthusiasts', members: 15420, cover: 'https://picsum.photos/seed/group1/400/200' },
          { id: '2', name: 'Tech Startups', members: 8934, cover: 'https://picsum.photos/seed/group2/400/200' },
          { id: '3', name: 'Travel Adventures', members: 25678, cover: 'https://picsum.photos/seed/group3/400/200' },
        ].map((group) => (
          <div key={group.id} className="bg-white rounded-xl border overflow-hidden">
            <img src={group.cover} className="w-full h-24 object-cover" alt="" />
            <div className="p-3">
              <h3 className="font-semibold">{group.name}</h3>
              <p className="text-sm text-gray-500">{group.members.toLocaleString()} members</p>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">View</button>
                <button className="flex-1 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-medium">Invite</button>
              </div>
            </div>
          </div>
        ))}
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
                  { icon: Users, label: 'Friends', gradient: 'from-indigo-500 to-purple-600', page: 'friends' },
                  { icon: Clock, label: 'Memories', gradient: 'from-violet-500 to-purple-600', page: null },
                  { icon: Bookmark, label: 'Saved', gradient: 'from-fuchsia-500 to-pink-600', page: null },
                  { icon: Users, label: 'Groups', gradient: 'from-blue-500 to-cyan-600', page: 'groups' },
                ].map(({ icon: Icon, label, gradient, page }) => (
                  <button 
                    key={label} 
                    onClick={() => {
                      if (page) {
                        setShowSettings(false);
                        setCurrentPage(page);
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all group"
                  >
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all", gradient)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] text-gray-600 font-medium">{label}</span>
                  </button>
                ))}
              </div>
              
              <Separator className="my-2" />
              
              {[
                { icon: Video, label: 'Video', page: 'watch', gradient: 'from-pink-500 to-rose-600' },
                { icon: ShoppingBag, label: 'Marketplace', page: 'marketplace', gradient: 'from-cyan-500 to-teal-600' },
                { icon: Calendar, label: 'Events', page: 'events', gradient: 'from-purple-500 to-indigo-600' },
                { icon: Flag, label: 'Pages', page: 'pages', gradient: 'from-orange-500 to-amber-600' },
                { icon: Gamepad2, label: 'Gaming', page: 'gaming', gradient: 'from-green-500 to-emerald-600' },
                { icon: Star, label: 'Favorites', page: 'favorites', gradient: 'from-yellow-500 to-orange-500' },
              ].map(({ icon: Icon, label, page, gradient }) => (
                <button 
                  key={label} 
                  onClick={() => {
                    setShowSettings(false);
                    if (page) setCurrentPage(page);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all group"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="flex-1 text-left font-medium">{label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              ))}
              
              <Separator className="my-2" />
              
              <p className="text-xs font-semibold text-gray-500 px-3 py-2">HELP & SETTINGS</p>
              
              {[
                { icon: Settings, label: 'Settings & privacy', section: 'settings', gradient: 'from-gray-600 to-gray-800' },
                { icon: HelpCircle, label: 'Help Center', gradient: 'from-blue-500 to-indigo-600' },
                { icon: MessageSquare, label: 'Give feedback', gradient: 'from-teal-500 to-cyan-600' },
              ].map(({ icon: Icon, label, section, gradient }) => (
                <button key={label} onClick={() => section && setSettingsSection(section)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all group">
                  <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="flex-1 text-left font-medium">{label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              ))}
              
              <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 active:scale-[0.98] transition-all group mt-2">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <LogOut className="w-5 h-5 text-white" />
                </div>
                <span className="flex-1 text-left font-medium text-red-600">Log Out</span>
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
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <AtSign className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Username</p>
                        <p className="text-sm font-medium">@{currentUser.username || 'not_set'}</p>
                      </div>
                    </div>
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
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Edit className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left font-medium text-sm">Edit profile</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => setShowPasswordChange(true)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Key className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left font-medium text-sm">Password and security</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => setSettingsSection('devices')}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Monitor className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left font-medium text-sm">Where you're logged in</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => setSettingsSection('privacy')}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Eye className="w-5 h-5 text-gray-600" />
                    <span className="flex-1 text-left font-medium text-sm">Audience and visibility</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className="font-semibold text-gray-500 text-xs">PREFERENCES</p>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-gray-600" />
                      <span>Dark mode</span>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                      <span>Active status</span>
                    </div>
                    <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-600" />
                      <span>Notifications</span>
                    </div>
                    <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-gray-600" />
                      <span>Sound</span>
                    </div>
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
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
          
          {settingsSection === 'devices' && (
            <div className="p-4">
              <button onClick={() => setSettingsSection('settings')} className="flex items-center gap-2 mb-4 text-gray-600">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h2 className="text-lg font-bold mb-4">Where you're logged in</h2>
              
              <div className="space-y-3">
                {loggedInDevices.map((device) => (
                  <div key={device.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Monitor className="w-5 h-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">{device.device}</p>
                          <p className="text-xs text-gray-500">{device.location}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {device.isCurrent ? (
                              <span className="text-green-600 font-medium">Active now</span>
                            ) : (
                              `Last active ${formatDistanceToNow(device.lastActive.toISOString())}`
                            )}
                          </p>
                        </div>
                      </div>
                      {device.isCurrent ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          This device
                        </span>
                      ) : (
                        <button className="text-xs text-red-600 hover:underline font-medium">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {settingsSection === 'privacy' && (
            <div className="p-4">
              <button onClick={() => setSettingsSection('settings')} className="flex items-center gap-2 mb-4 text-gray-600">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <h2 className="text-lg font-bold mb-4">Audience and visibility</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe2 className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Who can see your posts</p>
                      <p className="text-xs text-gray-500">Control who sees your future posts</p>
                    </div>
                  </div>
                  <select
                    value={whoCanSeePosts}
                    onChange={(e) => setWhoCanSeePosts(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends</option>
                    <option value="only_me">Only Me</option>
                  </select>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <UserPlus className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Who can send friend requests</p>
                      <p className="text-xs text-gray-500">Control who can send you friend requests</p>
                    </div>
                  </div>
                  <select
                    value={whoCanAddFriends}
                    onChange={(e) => setWhoCanAddFriends(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends_of_friends">Friends of Friends</option>
                  </select>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageCircle className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Who can message you</p>
                      <p className="text-xs text-gray-500">Control who can send you messages</p>
                    </div>
                  </div>
                  <select
                    value={whoCanMessage}
                    onChange={(e) => setWhoCanMessage(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends</option>
                  </select>
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
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-center">Create post</DialogTitle>
        </DialogHeader>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
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
            
            {/* Media Preview with File Size */}
            {postMediaPreview && (
              <div className="relative mt-3 rounded-xl overflow-hidden">
                {postMediaType === 'video' ? (
                  <video src={postMediaPreview} controls className="w-full max-h-48 object-cover" />
                ) : (
                  <img src={postMediaPreview} alt="" className="w-full max-h-48 object-cover" />
                )}
                <button
                  onClick={() => { setPostMediaPreview(''); setPostMediaUrl(''); setPostFileSize(0); }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {/* File Size Display */}
                {postFileSize > 0 && (
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {postFileSize < 1024 * 1024 
                      ? `${(postFileSize / 1024).toFixed(1)} KB` 
                      : `${(postFileSize / (1024 * 1024)).toFixed(1)} MB`}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 mx-4 mb-2 border rounded-xl">
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
            <div className="px-4 pb-4">
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
        </div>
        
        {/* Sticky Footer */}
        <div className="p-4 border-t shrink-0 bg-white">
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

  const renderProfile = () => {
    const userPosts = posts.filter(p => p.author.id === currentUser.id);
    const userPhotos = userPosts.filter(p => p.mediaUrl && p.mediaType === 'image');
    
    const handleRemoveFriend = async (friendId: string) => {
      try {
        await api.unfriendUser(friendId);
        setFriendsList(prev => prev.filter(f => f.id !== friendId));
        setRealFriendCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Remove friend error:', error);
      }
    };
    
    const handleBlockUser = async (userId: string) => {
      try {
        await api.blockUser(userId);
        setFriendsList(prev => prev.filter(f => f.id !== userId));
        setRealFriendCount(prev => Math.max(0, prev - 1));
        const blockedRes = await api.getBlockedUsers();
        if (blockedRes.blockedUsers) {
          setBlockedUsersList(blockedRes.blockedUsers);
        }
      } catch (error) {
        console.error('Block user error:', error);
      }
    };
    
    const handleUnblockUser = async (userId: string) => {
      try {
        await api.unblockUser(userId);
        setBlockedUsersList(prev => prev.filter(u => u.id !== userId));
      } catch (error) {
        console.error('Unblock user error:', error);
      }
    };

    return (
      <div className="bg-white min-h-screen">
        {/* Hidden file inputs */}
        <input
          ref={profilePhotoInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfilePhotoSelect}
          className="hidden"
        />
        <input
          ref={coverPhotoInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverPhotoSelect}
          className="hidden"
        />
        
        <div className="relative h-48 bg-gray-200">
          {currentUser.coverPhoto && <img src={currentUser.coverPhoto} className="w-full h-full object-cover" alt="" />}
          <button 
            onClick={() => coverPhotoInputRef.current?.click()}
            className="absolute bottom-3 right-3 bg-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-lg hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-4 h-4" /> Edit cover photo
          </button>
        </div>
        <div className="relative px-4">
          <div className="relative -mt-20 w-36 h-36">
            <Avatar className="w-36 h-36 border-4 border-white shadow-lg">
              <AvatarImage src={currentUser.avatar} className="object-cover" />
            </Avatar>
            <button 
              onClick={() => profilePhotoInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center shadow hover:bg-gray-300 transition-colors"
            >
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
        <button 
          onClick={() => {
            setProfileTab('Friends');
          }}
          className="w-full p-4 flex gap-6 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="font-semibold">{currentUser.friendCount?.toLocaleString()}</span>
            <span className="text-gray-500">friends</span>
          </div>
        </button>
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
            {['Posts', 'About', 'Friends', 'Photos'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setProfileTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium relative", 
                  profileTab === tab ? "text-[#1877F2]" : "text-gray-500"
                )}
              >
                {tab}
                {profileTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1877F2]" />}
              </button>
            ))}
          </div>
          
          {/* Posts Tab */}
          {profileTab === 'Posts' && (
            <>
              {userPosts.map(post => (
                <PostItem key={post.id} post={post} currentUser={currentUser} onReaction={handleReaction} onComment={handleComment} onShare={handleShare} onSave={handleSave} onDelete={handleDelete} />
              ))}
              {userPosts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No posts yet</p>
                </div>
              )}
            </>
          )}
          
          {/* About Tab */}
          {profileTab === 'About' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Work</h3>
                {currentUser.workplace ? (
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-gray-500" />
                    <span>Works at <strong>{currentUser.workplace}</strong></span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No workplace added</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Education</h3>
                {currentUser.education ? (
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                    <span>Studied at <strong>{currentUser.education}</strong></span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No education added</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Places Lived</h3>
                {currentUser.currentCity || currentUser.hometown ? (
                  <div className="space-y-2">
                    {currentUser.currentCity && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        <span>Lives in <strong>{currentUser.currentCity}</strong></span>
                      </div>
                    )}
                    {currentUser.hometown && (
                      <div className="flex items-center gap-3">
                        <Home className="w-5 h-5 text-gray-500" />
                        <span>From <strong>{currentUser.hometown}</strong></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No places added</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Basic Info</h3>
                <div className="space-y-2">
                  {currentUser.gender && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-500" />
                      <span className="capitalize">Gender: <strong>{currentUser.gender}</strong></span>
                    </div>
                  )}
                  {currentUser.dateOfBirth && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <span>Born on <strong>{new Date(currentUser.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                    </div>
                  )}
                  {!currentUser.gender && !currentUser.dateOfBirth && (
                    <p className="text-gray-500 text-sm">No basic info added</p>
                  )}
                </div>
              </div>
              {currentUser.bio && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3">Bio</h3>
                  <p className="text-gray-700">{currentUser.bio}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Friends Tab */}
          {profileTab === 'Friends' && (
            <div>
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search friends..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-100 border-0 rounded-full h-9"
                />
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Friends</h3>
                <span className="text-gray-500 text-sm">{friendsList.filter(f => 
                  `${f.firstName} ${f.lastName}`.toLowerCase().includes(friendSearchQuery.toLowerCase())
                ).length} friends</span>
              </div>
              
              {friendsList.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {friendsList
                    .filter(f => `${f.firstName} ${f.lastName}`.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                    .map((friend) => (
                    <div key={friend.id} className="relative group">
                      <div 
                        onClick={() => handleViewUserProfile(friend.id)}
                        className="cursor-pointer"
                      >
                        <Avatar className="w-full aspect-square rounded-lg">
                          <AvatarImage src={friend.avatar} className="object-cover" />
                        </Avatar>
                        <p className="text-xs font-medium mt-1 truncate text-center">{friend.firstName} {friend.lastName}</p>
                      </div>
                      
                      {/* Actions Dropdown */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFriendActions(showFriendActions === friend.id ? null : friend.id);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-600" />
                      </button>
                      
                      {showFriendActions === friend.id && (
                        <div className="absolute top-8 right-1 bg-white rounded-lg shadow-xl border z-10 w-36 py-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFriend(friend.id);
                              setShowFriendActions(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-sm"
                          >
                            <UserMinus className="w-4 h-4" />
                            Unfriend
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlockUser(friend.id);
                              setShowFriendActions(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 text-sm text-red-600"
                          >
                            <Shield className="w-4 h-4" />
                            Block
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No friends yet</p>
                </div>
              )}
              
              {blockedUsersList.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-red-600">Blocked Users</h3>
                    <span className="text-gray-500 text-sm">{blockedUsersList.length} blocked</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {blockedUsersList.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div 
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => handleViewUserProfile(user.id)}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatar} />
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium">{user.firstName} {user.lastName}</span>
                            <p className="text-xs text-gray-500">Blocked</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnblockUser(user.id)}
                          className="text-xs px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 font-medium"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Photos Tab */}
          {profileTab === 'Photos' && (
            <div>
              <h3 className="font-semibold mb-3">Photos</h3>
              {userPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {userPhotos.map((post) => (
                    <div key={post.id} className="aspect-square">
                      <img src={post.mediaUrl} alt="" className="w-full h-full object-cover rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No photos yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ MAIN RENDER ============
  return (
    <div className={cn("min-h-screen bg-gray-100 dark:bg-gray-900", darkMode && "dark")}>
      {renderHeader()}
      <main className="pt-12 pb-12">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && <div key="home">{renderHome()}</div>}
          {currentPage === 'friends' && <div key="friends">{renderFriends()}</div>}
          {currentPage === 'watch' && <div key="watch">{renderWatch()}</div>}
          {currentPage === 'marketplace' && <div key="marketplace">{renderMarketplace()}</div>}
          {currentPage === 'notifications' && <div key="notifications">{renderNotifications()}</div>}
          {currentPage === 'profile' && <div key="profile">{renderProfile()}</div>}
          {currentPage === 'events' && <div key="events">{renderEvents()}</div>}
          {currentPage === 'pages' && <div key="pages">{renderPages()}</div>}
          {currentPage === 'gaming' && <div key="gaming">{renderGaming()}</div>}
          {currentPage === 'favorites' && <div key="favorites">{renderFavorites()}</div>}
          {currentPage === 'groups' && <div key="groups">{renderGroups()}</div>}
        </AnimatePresence>
      </main>
      {renderBottomNav()}
      {renderSettings()}
      {renderCreatePostModal()}
      
      {/* Password Change Dialog */}
      <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {passwordChangeSuccess ? (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg text-center">
                <Check className="w-8 h-8 mx-auto mb-2" />
                <p>Password changed successfully!</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPasswordChangeVisibility ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordChangeVisibility(!showPasswordChangeVisibility)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPasswordChangeVisibility ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">New Password</label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Confirm New Password</label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                </div>
                {passwordChangeError && (
                  <div className="text-red-500 text-sm">{passwordChangeError}</div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordChangeError('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordChangeLoading}
                    className="flex-1 bg-[#1877F2] hover:bg-[#166FE5]"
                  >
                    {passwordChangeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Profile Modal */}
      <EditProfileModal
        key={showEditProfile ? 'open' : 'closed'}
        user={currentUser}
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSave={handleUpdateProfile}
      />
      
      {/* User Profile Modal - View other user's profile */}
      <Dialog open={!!viewingUserId} onOpenChange={(open) => !open && handleCloseUserProfile()}>
        <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">{viewingUser ? `${viewingUser.firstName} ${viewingUser.lastName}'s Profile` : 'User Profile'}</DialogTitle>
          {!viewingUser ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#1877F2]" />
            </div>
          ) : (
            <>
              {/* Cover Photo */}
              <div 
                className="relative h-40 bg-gray-200 cursor-pointer"
                onClick={() => viewingUser.coverPhoto && setViewingFullImage(viewingUser.coverPhoto)}
              >
                {viewingUser.coverPhoto && (
                  <img src={viewingUser.coverPhoto} className="w-full h-full object-cover" alt="" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleCloseUserProfile(); }}
                  className="absolute top-2 left-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              
              {/* Profile Picture */}
              <div className="relative px-4">
                <div className="relative -mt-16 w-28 h-28">
                  <Avatar 
                    className="w-28 h-28 border-4 border-white shadow-lg cursor-pointer hover:opacity-90"
                    onClick={() => viewingUser.avatar && setViewingFullImage(viewingUser.avatar)}
                  >
                    <AvatarImage src={viewingUser.avatar} className="object-cover" />
                  </Avatar>
                </div>
              </div>
              
              {/* User Info */}
              <div className="px-4 pt-2 pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{viewingUser.firstName} {viewingUser.lastName}</h2>
                  {viewingUser.isVerified && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-1">{viewingUser.bio || 'No bio yet'}</p>
                
                {/* Stats */}
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">{viewingUserFriends.length}</span>
                    <span className="text-gray-500">friends</span>
                  </div>
                  {viewingUser.currentCity && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{viewingUser.currentCity}</span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={async () => {
                      try {
                        await fetch('/api/friends', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ receiverId: viewingUser.id })
                        });
                      } catch (error) {
                        console.error('Error sending friend request:', error);
                      }
                    }}
                    className="flex-1 bg-[#1877F2] hover:bg-[#166FE5]"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                  <Button 
                    onClick={() => {
                      handleCloseUserProfile();
                      handleStartChat(viewingUser.id);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Tabs */}
              <div className="flex border-b">
                {['Posts', 'About', 'Friends', 'Photos'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setViewingUserTab(tab)}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium relative",
                      viewingUserTab === tab ? "text-[#1877F2]" : "text-gray-500"
                    )}
                  >
                    {tab}
                    {viewingUserTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1877F2]" />
                    )}
                  </button>
                ))}
              </div>
              
              {/* Tab Content */}
              <div className="p-4">
                {viewingUserTab === 'Posts' && (
                  <div>
                    {viewingUserPosts.length > 0 ? (
                      viewingUserPosts.map(post => (
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
                      <div className="text-center py-8 text-gray-500">
                        <p>No posts yet</p>
                      </div>
                    )}
                  </div>
                )}
                
                {viewingUserTab === 'About' && (
                  <div className="space-y-4">
                    {viewingUser.workplace && (
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-gray-500" />
                        <span className="text-sm">Works at <strong>{viewingUser.workplace}</strong></span>
                      </div>
                    )}
                    {viewingUser.education && (
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-gray-500" />
                        <span className="text-sm">Studied at <strong>{viewingUser.education}</strong></span>
                      </div>
                    )}
                    {viewingUser.currentCity && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        <span className="text-sm">Lives in <strong>{viewingUser.currentCity}</strong></span>
                      </div>
                    )}
                    {viewingUser.hometown && (
                      <div className="flex items-center gap-3">
                        <Home className="w-5 h-5 text-gray-500" />
                        <span className="text-sm">From <strong>{viewingUser.hometown}</strong></span>
                      </div>
                    )}
                    {!viewingUser.workplace && !viewingUser.education && !viewingUser.currentCity && !viewingUser.hometown && (
                      <p className="text-gray-500 text-sm text-center py-4">No info available</p>
                    )}
                  </div>
                )}
                
                {viewingUserTab === 'Friends' && (
                  <div>
                    <p className="text-gray-500 text-sm mb-3">{viewingUserFriends.length} friends</p>
                    <div className="grid grid-cols-3 gap-2">
                      {viewingUserFriends.slice(0, 12).map((friend) => (
                        <div 
                          key={friend.id} 
                          className="text-center cursor-pointer"
                          onClick={() => handleViewUserProfile(friend.id)}
                        >
                          <Avatar className="w-full aspect-square rounded-lg">
                            <AvatarImage src={friend.avatar} className="object-cover" />
                          </Avatar>
                          <p className="text-xs font-medium mt-1 truncate">{friend.firstName} {friend.lastName}</p>
                        </div>
                      ))}
                    </div>
                    {viewingUserFriends.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">No friends to show</p>
                    )}
                  </div>
                )}
                
                {viewingUserTab === 'Photos' && (
                  <div>
                    {viewingUserPosts.filter(p => p.mediaUrl).length > 0 ? (
                      <div className="grid grid-cols-3 gap-1">
                        {viewingUserPosts.filter(p => p.mediaUrl).map((post) => (
                          <div key={post.id} className="aspect-square">
                            <img src={post.mediaUrl} alt="" className="w-full h-full object-cover rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">No photos yet</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
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
      
      {/* Full Image Viewer */}
      <Dialog open={!!viewingFullImage} onOpenChange={() => setViewingFullImage(null)}>
        <DialogContent className="max-w-3xl p-0 bg-black">
          <DialogTitle className="sr-only">View Image</DialogTitle>
          <img src={viewingFullImage || ''} alt="" className="w-full h-auto max-h-[80vh] object-contain" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
