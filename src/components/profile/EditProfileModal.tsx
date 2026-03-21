// Edit profile modal - handles all profile editing
// Added tabs for better organization

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Camera,
  Loader2,
  Check,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Heart,
  Globe,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import type { User as UserType } from '@/types';
import { COUNTRIES } from '@/types';

interface EditProfileModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<UserType>) => Promise<void>;
}

// Debounce hook for username check
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function EditProfileModal({ user, isOpen, onClose, onSave }: EditProfileModalProps) {
  // Basic info state
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [gender, setGender] = useState(user.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
  const [city, setCity] = useState(user.currentCity || '');
  const [hometown, setHometown] = useState(user.hometown || '');
  const [country, setCountry] = useState(user.country || '');

  // Contact state
  const [phone, setPhone] = useState(user.phone || '');
  const [workplace, setWorkplace] = useState(user.workplace || '');
  const [education, setEducation] = useState(user.education || '');

  // Photo state
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [coverPhoto, setCoverPhoto] = useState(user.coverPhoto || '');

  // UI state
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const debouncedUsername = useDebounce(username, 500);

  // Check username availability
  const checkUsername = useCallback(async (name: string) => {
    if (!name || name.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Skip check if username hasn't changed
    if (name.toLowerCase() === user.username?.toLowerCase()) {
      setUsernameAvailable(true);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(name)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  }, [user.username]);

  // Trigger username check on debounce
  useEffect(() => {
    if (debouncedUsername && debouncedUsername !== user.username) {
      checkUsername(debouncedUsername);
    }
  }, [debouncedUsername, checkUsername, user.username]);

  // Track changes
  useEffect(() => {
    const hasAnyChanges =
      firstName !== user.firstName ||
      lastName !== user.lastName ||
      username !== user.username ||
      bio !== user.bio ||
      gender !== user.gender ||
      dateOfBirth !== user.dateOfBirth ||
      city !== user.currentCity ||
      hometown !== user.hometown ||
      country !== user.country ||
      phone !== user.phone ||
      workplace !== user.workplace ||
      education !== user.education ||
      avatar !== user.avatar ||
      coverPhoto !== user.coverPhoto;

    setHasChanges(hasAnyChanges);
  }, [firstName, lastName, username, bio, gender, dateOfBirth, city, hometown, country, phone, workplace, education, avatar, coverPhoto, user]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'avatar') {
        setAvatar(reader.result as string);
      } else {
        setCoverPhoto(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    // Validate username
    if (username && !usernameAvailable) {
      alert('Please choose an available username');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        firstName,
        lastName,
        username: username.toLowerCase(),
        bio,
        gender,
        dateOfBirth,
        currentCity: city,
        hometown,
        country,
        phone,
        workplace,
        education,
        avatar,
        coverPhoto,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-xl">Edit Profile</DialogTitle>
        </DialogHeader>

        {/* Cover Photo Section */}
        <div className="relative h-32 bg-gradient-to-r from-blue-400 to-purple-500 shrink-0">
          {coverPhoto && (
            <img
              src={coverPhoto}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-white/90 hover:bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Camera className="w-4 h-4" />
            Edit Cover
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoSelect(e, 'cover')}
            className="hidden"
          />

          {/* Avatar */}
          <div className="absolute -bottom-12 left-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={avatar} />
                <AvatarFallback className="text-xl bg-gray-200">
                  {getInitials(firstName, lastName)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 shadow transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoSelect(e, 'avatar')}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 px-6 pt-14 shrink-0">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="wait">
                {/* Basic Info Tab */}
                <TabsContent value="basic" asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="username"
                          className={cn(
                            usernameAvailable === false && 'border-red-500 focus-visible:ring-red-500',
                            usernameAvailable === true && 'border-green-500 focus-visible:ring-green-500'
                          )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingUsername && (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          )}
                          {usernameAvailable === true && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                          {usernameAvailable === false && (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      {usernameAvailable === false && (
                        <p className="text-xs text-red-500">This username is already taken</p>
                      )}
                      {usernameAvailable === true && username !== user.username && (
                        <p className="text-xs text-green-500">Username is available!</p>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={3}
                        maxLength={150}
                      />
                      <p className="text-xs text-gray-500 text-right">{bio.length}/150</p>
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Current City</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Where do you live?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hometown">Hometown</Label>
                        <Input
                          id="hometown"
                          value={hometown}
                          onChange={(e) => setHometown(e.target.value)}
                          placeholder="Where are you from?"
                        />
                      </div>
                    </div>

                    {/* Country */}
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    {/* Workplace */}
                    <div className="space-y-2">
                      <Label htmlFor="workplace">Workplace</Label>
                      <Input
                        id="workplace"
                        value={workplace}
                        onChange={(e) => setWorkplace(e.target.value)}
                        placeholder="Where do you work?"
                      />
                    </div>

                    {/* Education */}
                    <div className="space-y-2">
                      <Label htmlFor="education">Education</Label>
                      <Input
                        id="education"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        placeholder="School or university"
                      />
                    </div>

                    {/* Contact Info Display */}
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Contact Information</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>
                        {phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Photos Tab */}
                <TabsContent value="photos" asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Avatar Section */}
                    <div className="space-y-3">
                      <Label>Profile Picture</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={avatar} />
                          <AvatarFallback className="bg-gray-200">
                            {getInitials(firstName, lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            onClick={() => avatarInputRef.current?.click()}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Change Photo
                          </Button>
                          {avatar && avatar !== user.avatar && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAvatar(user.avatar || '')}
                              className="text-red-500"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cover Photo Section */}
                    <div className="space-y-3">
                      <Label>Cover Photo</Label>
                      <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
                        {coverPhoto ? (
                          <img
                            src={coverPhoto}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No cover photo
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => coverInputRef.current?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Change Cover
                        </Button>
                        {coverPhoto && coverPhoto !== user.coverPhoto && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCoverPhoto(user.coverPhoto || '')}
                            className="text-red-500"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Photo Guidelines */}
                    <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                      <p className="font-medium mb-2">Photo Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Supported formats: JPG, PNG, GIF</li>
                        <li>Maximum file size: 10MB</li>
                        <li>Recommended avatar size: 400x400 pixels</li>
                        <li>Recommended cover size: 1200x400 pixels</li>
                      </ul>
                    </div>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || usernameAvailable === false}
            className="bg-[#1877F2] hover:bg-[#166FE5]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
