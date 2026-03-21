'use client';

import { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  Clock,
  MapPin,
  ImagePlus,
  X,
  Loader2,
  Globe,
  Link2,
  Video,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Event creation data type
export interface CreateEventData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  isOnline: boolean;
  onlineUrl?: string;
  coverImage?: string;
  privacy: 'public' | 'private';
}

interface CreateEventModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler when event is created */
  onCreate: (data: CreateEventData) => void | Promise<void>;
  /** Optional className for styling */
  className?: string;
}

// Time options for the select
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute} ${ampm}`;
});

/**
 * CreateEventModal Component
 *
 * A modal dialog for creating new events with:
 * - Event name and description
 * - Date, time, and location
 * - Online/in-person toggle
 * - Cover image upload
 *
 * @example
 * <CreateEventModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onCreate={(data) => handleCreate(data)}
 * />
 */
export const CreateEventModal = memo(function CreateEventModal({
  isOpen,
  onClose,
  onCreate,
  className,
}: CreateEventModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('12:00 PM');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('1:00 PM');
  const [location, setLocation] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUrl, setOnlineUrl] = useState('');
  const [coverImage, setCoverImage] = useState<string | undefined>();
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Event title is required';
    } else if (title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (endDate && endDate < startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (isOnline && !onlineUrl.trim()) {
      newErrors.onlineUrl = 'Online event URL is required';
    } else if (isOnline && onlineUrl) {
      // Basic URL validation
      try {
        new URL(onlineUrl.startsWith('http') ? onlineUrl : `https://${onlineUrl}`);
      } catch {
        newErrors.onlineUrl = 'Please enter a valid URL';
      }
    }

    if (description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, startDate, startTime, endDate, isOnline, onlineUrl, description]);

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
        title: title.trim(),
        description: description.trim(),
        startDate,
        startTime,
        endDate: endDate || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        isOnline,
        onlineUrl: isOnline ? onlineUrl.trim() : undefined,
        coverImage,
        privacy,
      });

      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form state
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('12:00 PM');
    setEndDate('');
    setEndTime('1:00 PM');
    setLocation('');
    setIsOnline(false);
    setOnlineUrl('');
    setCoverImage(undefined);
    setPrivacy('public');
    setErrors({});
  };

  // Handle modal close with unsaved changes
  const handleClose = () => {
    if (title || description || location || coverImage || startDate) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    resetForm();
    onClose();
  };

  // Remove cover image
  const removeCoverImage = () => {
    setCoverImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-set end date when start date changes
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (!endDate || endDate < date) {
      setEndDate(date);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn('sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 gap-0', className)}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Create New Event
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
                'relative h-36 rounded-lg border-2 border-dashed transition-all duration-200 overflow-hidden',
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
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ImagePlus className="w-10 h-10" />
                  <span className="text-sm">Click or drag to upload cover image</span>
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

          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Event Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your event called?"
              className={cn(errors.title && 'border-red-500 focus-visible:ring-red-500')}
            />
            <AnimatePresence>
              {errors.title && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xs text-red-500"
                >
                  {errors.title}
                </motion.p>
              )}
            </AnimatePresence>
            <p className="text-xs text-gray-500 text-right">{title.length}/100</p>
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  min={today}
                  className={cn(
                    'pl-10',
                    errors.startDate && 'border-red-500 focus-visible:ring-red-500'
                  )}
                />
              </div>
              {errors.startDate && (
                <p className="text-xs text-red-500">{errors.startDate}</p>
              )}
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Start Time <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={cn(
                    'w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    errors.startTime && 'border-red-500 focus-visible:ring-red-500'
                  )}
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* End Date and Time Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className={cn(
                    'pl-10',
                    errors.endDate && 'border-red-500 focus-visible:ring-red-500'
                  )}
                />
              </div>
              {errors.endDate && (
                <p className="text-xs text-red-500">{errors.endDate}</p>
              )}
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Online Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-blue-500" />
              <div>
                <Label htmlFor="isOnline" className="font-medium cursor-pointer">
                  Online Event
                </Label>
                <p className="text-xs text-gray-500">
                  Add a link for people to join virtually
                </p>
              </div>
            </div>
            <Switch
              id="isOnline"
              checked={isOnline}
              onCheckedChange={setIsOnline}
            />
          </div>

          {/* Online URL (if online) */}
          <AnimatePresence>
            {isOnline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="onlineUrl">
                  Event URL <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="onlineUrl"
                    value={onlineUrl}
                    onChange={(e) => setOnlineUrl(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className={cn(
                      'pl-10',
                      errors.onlineUrl && 'border-red-500 focus-visible:ring-red-500'
                    )}
                  />
                </div>
                {errors.onlineUrl && (
                  <p className="text-xs text-red-500">{errors.onlineUrl}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location (if not online) */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add a location"
                    className="pl-10"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what your event is about..."
              rows={4}
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
            <p className="text-xs text-gray-500 text-right">{description.length}/1000</p>
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isPrivate"
              checked={privacy === 'private'}
              onCheckedChange={(checked) => setPrivacy(checked ? 'private' : 'public')}
            />
            <Label htmlFor="isPrivate" className="text-sm cursor-pointer">
              Private event (only invited people can see it)
            </Label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 sticky bottom-0">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !title.trim() || !startDate}
            className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default CreateEventModal;
