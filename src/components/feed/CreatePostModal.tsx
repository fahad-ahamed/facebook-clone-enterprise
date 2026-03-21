'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Image as ImageIcon,
  Video,
  Smile,
  MapPin,
  Tag,
  X,
  ChevronDown,
  Globe,
  Users,
  Lock,
  UsersRound,
  UserCheck,
  Camera,
  Sparkles,
  Palette,
  UserPlus,
  Check,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials, formatFileSize } from '@/utils/stringUtils';
import { FEELINGS, REACTIONS } from '@/types';
import type { User } from '@/types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    content?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    visibility?: string;
    feeling?: string;
    location?: string;
    taggedFriends?: string[];
    backgroundColor?: string;
  }) => Promise<void>;
  currentUser: User;
  friends?: User[];
}

// Background colors for text posts (Facebook-style gradient backgrounds)
const BACKGROUND_COLORS = [
  { id: 'none', label: 'None', value: '', gradient: '' },
  { id: 'red', label: 'Red', value: '#e74c3c', gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' },
  { id: 'orange', label: 'Orange', value: '#f39c12', gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' },
  { id: 'yellow', label: 'Yellow', value: '#f1c40f', gradient: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)' },
  { id: 'green', label: 'Green', value: '#27ae60', gradient: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' },
  { id: 'teal', label: 'Teal', value: '#1abc9c', gradient: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)' },
  { id: 'blue', label: 'Blue', value: '#3498db', gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' },
  { id: 'purple', label: 'Purple', value: '#9b59b6', gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' },
  { id: 'pink', label: 'Pink', value: '#e91e63', gradient: 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)' },
  { id: 'dark', label: 'Dark', value: '#2c3e50', gradient: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', icon: Globe, label: 'Public', description: 'Anyone can see' },
  { value: 'friends', icon: Users, label: 'Friends', description: 'Your friends can see' },
  { value: 'friends_except', icon: UsersRound, label: 'Friends except...', description: 'Exclude some friends' },
  { value: 'specific_friends', icon: UserCheck, label: 'Specific friends', description: 'Choose who can see' },
  { value: 'private', icon: Lock, label: 'Only me', description: 'Only you can see' },
];

// Extended feelings and activities
const EXTENDED_FEELINGS = [
  ...FEELINGS,
  { emoji: '💪', label: 'feeling strong' },
  { emoji: '🤔', label: 'feeling thoughtful' },
  { emoji: '😴', label: 'feeling tired' },
  { emoji: '🤗', label: 'feeling grateful' },
  { emoji: '😤', label: 'feeling frustrated' },
  { emoji: '🥺', label: 'feeling emotional' },
];

// Sample locations for check-in
const POPULAR_LOCATIONS = [
  'New York City, New York',
  'Los Angeles, California',
  'Chicago, Illinois',
  'Houston, Texas',
  'Phoenix, Arizona',
  'San Francisco, California',
  'Seattle, Washington',
  'Miami, Florida',
  'Boston, Massachusetts',
  'Denver, Colorado',
];

const MAX_CHARS = 5000;

export function CreatePostModal({
  isOpen,
  onClose,
  onCreate,
  currentUser,
  friends = [],
}: CreatePostModalProps) {
  // Content state
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [feeling, setFeeling] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  
  // Media state
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<Array<{ preview: string; url: string; type: 'image' | 'video'; size: number }>>([]);
  
  // Tagged friends
  const [taggedFriends, setTaggedFriends] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'post' | 'photos' | 'gif'>('post');
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Reset all state
  const resetState = useCallback(() => {
    setContent('');
    setVisibility('public');
    setFeeling(null);
    setLocation('');
    setBackgroundColor('');
    setMediaPreview(null);
    setMediaUrl(null);
    setMediaType(null);
    setFileSize(0);
    setMediaFiles([]);
    setTaggedFriends([]);
    setFriendSearch('');
    setActiveTab('post');
    setShowFeelingPicker(false);
    setShowLocationPicker(false);
    setShowTagPicker(false);
    setShowColorPicker(false);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert('File is too large. Maximum size is 50MB.');
        return;
      }

      const isVideoFile = isVideo || file.type.startsWith('video/');
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        
        if (mediaFiles.length === 0) {
          // First file - set as main preview
          setMediaPreview(result);
          setMediaUrl(result);
          setMediaType(isVideoFile ? 'video' : 'image');
          setFileSize(file.size);
        }
        
        setMediaFiles(prev => [...prev, {
          preview: result,
          url: result,
          type: isVideoFile ? 'video' : 'image',
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setMediaPreview(result);
      setMediaUrl(result);
      setMediaType('image');
      setFileSize(file.size);
      setMediaFiles([{ preview: result, url: result, type: 'image', size: file.size }]);
    };
    reader.readAsDataURL(file);
  };

  // Remove media
  const removeMedia = (index?: number) => {
    if (typeof index === 'number') {
      const newFiles = mediaFiles.filter((_, i) => i !== index);
      setMediaFiles(newFiles);
      
      if (newFiles.length > 0) {
        setMediaPreview(newFiles[0].preview);
        setMediaUrl(newFiles[0].url);
        setMediaType(newFiles[0].type);
        setFileSize(newFiles[0].size);
      } else {
        setMediaPreview(null);
        setMediaUrl(null);
        setMediaType(null);
        setFileSize(0);
      }
    } else {
      setMediaPreview(null);
      setMediaUrl(null);
      setMediaType(null);
      setFileSize(0);
      setMediaFiles([]);
    }
  };

  // Toggle tagged friend
  const toggleTagFriend = (friendId: string) => {
    setTaggedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Filter friends by search
  const filteredFriends = friends.filter(friend => {
    const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
    return fullName.includes(friendSearch.toLowerCase());
  });

  // Handle submit
  const handleSubmit = async () => {
    if (!content.trim() && !mediaUrl && mediaFiles.length === 0) return;

    setSubmitting(true);
    try {
      await onCreate({
        content: content.trim() || undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
        visibility,
        feeling: feeling || undefined,
        location: location.trim() || undefined,
        taggedFriends: taggedFriends.length > 0 ? taggedFriends : undefined,
        backgroundColor: backgroundColor || undefined,
      });

      resetState();
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    resetState();
    onClose();
  };

  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibility);
  const selectedColor = BACKGROUND_COLORS.find(c => c.value === backgroundColor);
  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div className="w-8" />
          <DialogTitle className="text-center text-xl font-bold">Create post</DialogTitle>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4">
            {/* Author row */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback>{getInitials(currentUser.firstName, currentUser.lastName)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-semibold">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                
                {/* Visibility selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-md mt-0.5 transition-colors">
                      {selectedVisibility && (
                        <>
                          <selectedVisibility.icon className="w-3.5 h-3.5" />
                          <span>{selectedVisibility.label}</span>
                        </>
                      )}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {VISIBILITY_OPTIONS.map(opt => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setVisibility(opt.value)}
                        className={cn(
                          "flex items-center gap-3 py-2.5 cursor-pointer",
                          visibility === opt.value && "bg-blue-50"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <opt.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                        {visibility === opt.value && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Feeling tag */}
            <AnimatePresence>
              {feeling && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 mb-3 bg-gray-100 px-3 py-2 rounded-lg"
                >
                  <span className="text-lg">{EXTENDED_FEELINGS.find(f => f.label === feeling)?.emoji}</span>
                  <span className="text-sm">I&apos;m {feeling}</span>
                  <button 
                    onClick={() => setFeeling(null)} 
                    className="ml-auto hover:bg-gray-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Location tag */}
            <AnimatePresence>
              {location && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 mb-3 bg-gray-100 px-3 py-2 rounded-lg"
                >
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="text-sm">{location}</span>
                  <button 
                    onClick={() => setLocation('')} 
                    className="ml-auto hover:bg-gray-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tagged friends */}
            <AnimatePresence>
              {taggedFriends.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 mb-3 bg-gray-100 px-3 py-2 rounded-lg flex-wrap"
                >
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">
                    With {taggedFriends.slice(0, 2).map(id => {
                      const friend = friends.find(f => f.id === id);
                      return friend ? `${friend.firstName} ${friend.lastName}` : '';
                    }).filter(Boolean).join(', ')}
                    {taggedFriends.length > 2 && ` and ${taggedFriends.length - 2} others`}
                  </span>
                  <button 
                    onClick={() => setTaggedFriends([])} 
                    className="ml-auto hover:bg-gray-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content textarea with optional background */}
            <div 
              className={cn(
                "relative mb-3 rounded-lg overflow-hidden transition-all",
                selectedColor?.gradient && "min-h-32"
              )}
              style={{ background: selectedColor?.gradient || undefined }}
            >
              <textarea
                ref={contentRef}
                placeholder={`What's on your mind, ${currentUser.firstName}?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={cn(
                  "w-full h-32 resize-none outline-none text-lg p-3",
                  selectedColor?.gradient 
                    ? "text-white placeholder:text-white/70 bg-transparent text-center font-medium min-h-32"
                    : "placeholder:text-gray-400 bg-transparent"
                )}
                style={{
                  textShadow: selectedColor?.gradient ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                }}
                autoFocus
              />
            </div>

            {/* Character count */}
            <div className="flex justify-end mb-3">
              <span className={cn(
                "text-xs",
                isOverLimit ? "text-red-500" : "text-gray-400",
                charCount > MAX_CHARS * 0.9 && !isOverLimit && "text-yellow-500"
              )}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>

            {/* Media preview */}
            {mediaPreview && (
              <div className="relative rounded-lg overflow-hidden mb-3 border">
                {mediaType === 'video' ? (
                  <video 
                    src={mediaPreview} 
                    controls 
                    className="w-full max-h-64 object-contain bg-black"
                  />
                ) : (
                  <img 
                    src={mediaPreview} 
                    alt="" 
                    className="w-full max-h-64 object-contain"
                  />
                )}
                <button
                  onClick={() => removeMedia()}
                  className="absolute top-2 right-2 w-8 h-8 bg-gray-800/70 hover:bg-gray-800/90 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {fileSize > 0 && (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {formatFileSize(fileSize)}
                  </div>
                )}
              </div>
            )}

            {/* Multiple media grid */}
            {mediaFiles.length > 1 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {mediaFiles.slice(1).map((file, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border">
                    {file.type === 'video' ? (
                      <video 
                        src={file.preview} 
                        className="w-full h-24 object-cover bg-black"
                      />
                    ) : (
                      <img 
                        src={file.preview} 
                        alt="" 
                        className="w-full h-24 object-cover"
                      />
                    )}
                    <button
                      onClick={() => removeMedia(idx + 1)}
                      className="absolute top-1 right-1 w-6 h-6 bg-gray-800/70 hover:bg-gray-800/90 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Feeling picker */}
            <AnimatePresence>
              {showFeelingPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 border rounded-lg overflow-hidden"
                >
                  <div className="p-3 border-b bg-gray-50">
                    <Input
                      placeholder="Search feelings..."
                      className="bg-white"
                    />
                  </div>
                  <ScrollArea className="h-48">
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {EXTENDED_FEELINGS.map(f => (
                        <button
                          key={f.label}
                          onClick={() => { setFeeling(f.label); setShowFeelingPicker(false); }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors text-left",
                            feeling === f.label && "bg-blue-50"
                          )}
                        >
                          <span className="text-lg">{f.emoji}</span>
                          <span className="capitalize truncate">{f.label.replace('feeling ', '')}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Location picker */}
            <AnimatePresence>
              {showLocationPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 border rounded-lg overflow-hidden"
                >
                  <div className="p-3 border-b bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search for a location..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="pl-9 bg-white"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="p-1">
                      {POPULAR_LOCATIONS.filter(loc => 
                        loc.toLowerCase().includes(location.toLowerCase())
                      ).map(loc => (
                        <button
                          key={loc}
                          onClick={() => { setLocation(loc); setShowLocationPicker(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-100 transition-colors text-left"
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{loc}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tag friends picker */}
            <AnimatePresence>
              {showTagPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 border rounded-lg overflow-hidden"
                >
                  <div className="p-3 border-b bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search friends..."
                        value={friendSearch}
                        onChange={(e) => setFriendSearch(e.target.value)}
                        className="pl-9 bg-white"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="p-1">
                      {filteredFriends.length > 0 ? (
                        filteredFriends.map(friend => (
                          <button
                            key={friend.id}
                            onClick={() => toggleTagFriend(friend.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={friend.avatar} />
                              <AvatarFallback>{getInitials(friend.firstName, friend.lastName)}</AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-left">
                              {friend.firstName} {friend.lastName}
                            </span>
                            {taggedFriends.includes(friend.id) && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          {friends.length === 0 ? 'No friends to tag' : 'No friends found'}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  {taggedFriends.length > 0 && (
                    <div className="p-3 border-t bg-gray-50">
                      <Button 
                        onClick={() => setShowTagPicker(false)}
                        className="w-full"
                      >
                        Done ({taggedFriends.length} tagged)
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Background color picker */}
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 border rounded-lg p-3"
                >
                  <p className="text-sm font-medium mb-2">Background color</p>
                  <div className="flex flex-wrap gap-2">
                    {BACKGROUND_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => { 
                          setBackgroundColor(color.value);
                          if (color.id !== 'none') setShowColorPicker(false);
                        }}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all",
                          backgroundColor === color.value 
                            ? "border-blue-500 ring-2 ring-blue-200" 
                            : "border-transparent hover:border-gray-300"
                        )}
                        style={{ background: color.gradient || '#f3f4f6' }}
                        title={color.label}
                      >
                        {color.id === 'none' && (
                          <X className="w-4 h-4 mx-auto text-gray-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* GIF search placeholder */}
            <AnimatePresence>
              {activeTab === 'gif' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 border rounded-lg p-8 text-center"
                >
                  <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 mb-2">GIF Search</p>
                  <p className="text-xs text-gray-400">Search and select GIFs (coming soon)</p>
                  <Input
                    placeholder="Search GIFs..."
                    className="mt-4 max-w-xs mx-auto"
                    disabled
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons row */}
            <div className="flex items-center justify-between border rounded-lg px-4 py-3 mb-4">
              <span className="text-sm font-semibold">Add to your post</span>
              <div className="flex gap-1">
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileSelect(e)}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleFileSelect(e, true)}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
                
                {/* Photo */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Photo"
                >
                  <ImageIcon className="w-5 h-5 text-green-500" />
                </button>
                
                {/* Video */}
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Video"
                >
                  <Video className="w-5 h-5 text-red-500" />
                </button>
                
                {/* Camera */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Camera"
                >
                  <Camera className="w-5 h-5 text-orange-500" />
                </button>
                
                {/* GIF */}
                <button
                  onClick={() => setActiveTab(activeTab === 'gif' ? 'post' : 'gif')}
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors",
                    activeTab === 'gif' && "bg-gray-100"
                  )}
                  title="GIF"
                >
                  <span className="text-lg">🎞️</span>
                </button>
                
                {/* Feeling */}
                <button
                  onClick={() => {
                    setShowFeelingPicker(!showFeelingPicker);
                    setShowLocationPicker(false);
                    setShowTagPicker(false);
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors",
                    showFeelingPicker && "bg-gray-100"
                  )}
                  title="Feeling/Activity"
                >
                  <Smile className="w-5 h-5 text-yellow-500" />
                </button>
                
                {/* Location/Check-in */}
                <button
                  onClick={() => {
                    setShowLocationPicker(!showLocationPicker);
                    setShowFeelingPicker(false);
                    setShowTagPicker(false);
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors",
                    showLocationPicker && "bg-gray-100"
                  )}
                  title="Check-in"
                >
                  <MapPin className="w-5 h-5 text-red-400" />
                </button>
                
                {/* Tag friends */}
                <button
                  onClick={() => {
                    setShowTagPicker(!showTagPicker);
                    setShowFeelingPicker(false);
                    setShowLocationPicker(false);
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors",
                    showTagPicker && "bg-gray-100"
                  )}
                  title="Tag friends"
                >
                  <Tag className="w-5 h-5 text-blue-500" />
                </button>
                
                {/* Background color */}
                <button
                  onClick={() => {
                    setShowColorPicker(!showColorPicker);
                    setShowFeelingPicker(false);
                    setShowLocationPicker(false);
                    setShowTagPicker(false);
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors",
                    showColorPicker && "bg-gray-100"
                  )}
                  title="Background color"
                >
                  <Palette className="w-5 h-5 text-teal-500" />
                </button>
                
                {/* More options */}
                <button
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="More"
                >
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || isOverLimit || (!content.trim() && !mediaUrl && mediaFiles.length === 0)}
              className={cn(
                "w-full h-11 font-bold text-base",
                (content.trim() || mediaUrl || mediaFiles.length > 0) && !isOverLimit
                  ? "bg-[#1877F2] hover:bg-[#166FE5]"
                  : "bg-gray-200 text-gray-400 hover:bg-gray-200"
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Posting...
                </span>
              ) : 'Post'}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePostModal;
