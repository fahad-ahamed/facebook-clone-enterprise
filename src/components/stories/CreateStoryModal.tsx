'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Camera,
  Image as ImageIcon,
  Video,
  X,
  Upload,
  RotateCcw,
  Type,
  Music,
  Sticker,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import type { User } from '@/types';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (story: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption?: string;
  }) => Promise<void>;
  currentUser: User;
}

type MediaType = 'image' | 'video' | null;

export function CreateStoryModal({
  isOpen,
  onClose,
  onCreate,
  currentUser
}: CreateStoryModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }
    
    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size must be less than ${isVideo ? '50MB' : '10MB'}`);
      return;
    }
    
    setSelectedFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);
  
  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);
  
  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  
  // Clear selected media
  const handleClearMedia = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
    setCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Upload file to server (simulated - in real app, would upload to storage)
  const uploadFile = async (file: File): Promise<string> => {
    // In a real app, this would upload to a cloud storage service
    // For now, we'll return the preview URL
    return previewUrl || URL.createObjectURL(file);
  };
  
  // Handle story creation
  const handleCreateStory = async () => {
    if (!selectedFile || !mediaType) return;
    
    setIsSubmitting(true);
    try {
      const mediaUrl = await uploadFile(selectedFile);
      
      await onCreate({
        mediaUrl,
        mediaType,
        caption: caption.trim() || undefined
      });
      
      // Reset and close
      handleClearMedia();
      onClose();
    } catch (error) {
      console.error('Failed to create story:', error);
      alert('Failed to create story. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      handleClearMedia();
      onClose();
    }
  };
  
  // Camera capture (would need additional implementation for actual camera access)
  const handleCameraCapture = () => {
    // In a real app, this would open device camera
    alert('Camera capture would open here');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Create Story</DialogTitle>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback>
                  {getInitials(currentUser.firstName, currentUser.lastName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-4">
          {!previewUrl ? (
            // Upload section
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleInputChange}
                className="hidden"
                id="story-file-input"
              />
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                
                <div>
                  <p className="text-gray-700 font-medium">
                    Drag photos and videos here
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    or click to select files
                  </p>
                </div>
                
                <label
                  htmlFor="story-file-input"
                  className="cursor-pointer"
                >
                  <Button variant="outline" asChild>
                    <span>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Select from computer
                    </span>
                  </Button>
                </label>
                
                {/* Quick action buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleCameraCapture}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600">Camera</span>
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Photo</span>
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Video className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">Video</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Preview section
            <div className="space-y-4">
              {/* Preview media */}
              <div className="relative aspect-[9/16] max-h-[400px] rounded-lg overflow-hidden bg-black">
                {mediaType === 'video' ? (
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    muted
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Clear button */}
                <button
                  onClick={handleClearMedia}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                
                {/* Edit tools overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors">
                    <Type className="w-5 h-5 text-white" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors">
                    <Sticker className="w-5 h-5 text-white" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors">
                    <Sparkles className="w-5 h-5 text-white" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors">
                    <Music className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Caption input */}
              <div className="flex gap-2">
                <Input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="flex-1"
                  maxLength={150}
                />
                <span className="text-xs text-gray-400 self-center">
                  {caption.length}/150
                </span>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClearMedia}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Change
                </Button>
                <Button
                  onClick={handleCreateStory}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Share to Story'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
