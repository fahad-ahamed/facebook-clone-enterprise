'use client';

import { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Camera,
  Loader2,
  Globe,
  Lock,
  ImagePlus,
  X,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Group creation data type
export interface CreateGroupData {
  name: string;
  description: string;
  privacy: 'public' | 'private';
  coverImage?: string;
}

interface CreateGroupModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler when group is created */
  onCreate: (data: CreateGroupData) => void | Promise<void>;
  /** Optional className for styling */
  className?: string;
}

// Privacy option component
const PrivacyOption = memo(function PrivacyOption({
  value,
  label,
  description,
  icon: Icon,
  selected,
}: {
  value: 'public' | 'private';
  label: string;
  description: string;
  icon: React.ElementType;
  selected: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <RadioGroupItem value={value} className="mt-1" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-5 h-5', selected ? 'text-blue-500' : 'text-gray-500')} />
          <span className="font-medium">{label}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </label>
  );
});

/**
 * CreateGroupModal Component
 *
 * A modal dialog for creating new groups with:
 * - Group name and description
 * - Privacy settings (public/private)
 * - Cover image upload
 *
 * @example
 * <CreateGroupModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onCreate={(data) => handleCreate(data)}
 * />
 */
export const CreateGroupModal = memo(function CreateGroupModal({
  isOpen,
  onClose,
  onCreate,
  className,
}: CreateGroupModalProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [coverImage, setCoverImage] = useState<string | undefined>();

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    } else if (name.length > 50) {
      newErrors.name = 'Group name must be less than 50 characters';
    }

    if (description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        privacy,
        coverImage,
      });

      // Reset form
      setName('');
      setDescription('');
      setPrivacy('public');
      setCoverImage(undefined);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      // Could show a toast notification here
    } finally {
      setIsCreating(false);
    }
  };

  // Handle modal close with unsaved changes
  const handleClose = () => {
    if (name || description || coverImage) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    // Reset form on close
    setName('');
    setDescription('');
    setPrivacy('public');
    setCoverImage(undefined);
    setErrors({});
    onClose();
  };

  // Remove cover image
  const removeCoverImage = () => {
    setCoverImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn('sm:max-w-[500px] p-0 gap-0', className)}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                'relative h-32 rounded-lg border-2 border-dashed transition-all duration-200 overflow-hidden',
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400',
                coverImage && 'border-solid border-gray-200'
              )}
            >
              {coverImage ? (
                <>
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <motion.button
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    onClick={removeCoverImage}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-sm">Click or drag to upload</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
            />
            <AnimatePresence>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xs text-red-500"
                >
                  {errors.name}
                </motion.p>
              )}
            </AnimatePresence>
            <p className="text-xs text-gray-500 text-right">{name.length}/50</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className={cn(errors.description && 'border-red-500 focus-visible:ring-red-500')}
            />
            <AnimatePresence>
              {errors.description && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xs text-red-500"
                >
                  {errors.description}
                </motion.p>
              )}
            </AnimatePresence>
            <p className="text-xs text-gray-500 text-right">{description.length}/500</p>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <Label>Privacy</Label>
            <RadioGroup
              value={privacy}
              onValueChange={(v) => setPrivacy(v as 'public' | 'private')}
              className="space-y-2"
            >
              <PrivacyOption
                value="public"
                label="Public"
                description="Anyone can see who's in the group and what they post"
                icon={Globe}
                selected={privacy === 'public'}
              />
              <PrivacyOption
                value="private"
                label="Private"
                description="Only members can see who's in the group and what they post"
                icon={Lock}
                selected={privacy === 'private'}
              />
            </RadioGroup>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default CreateGroupModal;
