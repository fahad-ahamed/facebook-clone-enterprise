'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useMutation } from '@apollo/client';
import {
  Image as ImageIcon,
  Video,
  Smile,
  MapPin,
  Tag,
  MoreHorizontal,
  X,
  Globe,
  Users,
  Lock,
} from 'lucide-react';
import { CREATE_POST } from '@/graphql/mutations/postMutations';
import { toast } from '@/components/providers/ToastProvider';
import type { User } from '@/types/user';

interface CreatePostProps {
  user: User | null;
  onPostCreated: () => void;
}

type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

export function CreatePost({ user, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createPost, { loading }] = useMutation(CREATE_POST);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 4) {
      toast.error('You can upload up to 4 photos');
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;

    try {
      // In a real app, we'd upload files first and get URLs
      // For now, we'll just use the preview URLs
      const mediaUrls = previewUrls.map((url, index) => ({
        type: selectedFiles[index].type.startsWith('video') ? 'VIDEO' : 'IMAGE',
        url,
      }));

      await createPost({
        variables: {
          input: {
            content: content.trim(),
            visibility,
            media: mediaUrls,
          },
        },
      });

      toast.success('Post created successfully!');
      setContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setIsOpen(false);
      onPostCreated();
    } catch (error) {
      toast.error('Failed to create post. Please try again.');
    }
  };

  const visibilityOptions = [
    { value: 'PUBLIC' as const, icon: <Globe className="w-4 h-4" />, label: 'Public' },
    { value: 'FRIENDS' as const, icon: <Users className="w-4 h-4" />, label: 'Friends' },
    { value: 'PRIVATE' as const, icon: <Lock className="w-4 h-4" />, label: 'Only me' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt={`${user.firstName} ${user.lastName}`}
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
              {user?.firstName?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 text-left px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          What&apos;s on your mind, {user?.firstName}?
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-around border-t border-gray-200 dark:border-gray-700 pt-3">
        <button className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
          <Video className="w-6 h-6 text-red-500" />
          <span className="text-sm font-medium">Live video</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ImageIcon className="w-6 h-6 text-green-500" />
          <span className="text-sm font-medium">Photo/video</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
          <Smile className="w-6 h-6 text-yellow-500" />
          <span className="text-sm font-medium">Feeling/activity</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Create Post Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 relative">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create post</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={`${user.firstName} ${user.lastName}`}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  {/* Visibility Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                    >
                      {visibilityOptions.find((v) => v.value === visibility)?.icon}
                      <span>{visibilityOptions.find((v) => v.value === visibility)?.label}</span>
                    </button>
                    {showVisibilityMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        {visibilityOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setVisibility(option.value);
                              setShowVisibilityMenu(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {option.icon}
                            <span className="text-sm text-gray-700 dark:text-gray-200">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Text Area */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.firstName}?`}
                className="w-full h-32 resize-none focus:outline-none text-xl text-gray-900 dark:text-white bg-transparent placeholder-gray-400"
                autoFocus
              />

              {/* Media Preview */}
              {previewUrls.length > 0 && (
                <div className="mt-4">
                  <div className={`grid gap-2 ${
                    previewUrls.length === 1 ? 'grid-cols-1' :
                    previewUrls.length === 2 ? 'grid-cols-2' :
                    previewUrls.length === 3 ? 'grid-cols-2' :
                    'grid-cols-2'
                  }`}>
                    {previewUrls.map((url, index) => (
                      <div
                        key={url}
                        className={`relative rounded-lg overflow-hidden ${
                          index === 0 && previewUrls.length === 3 ? 'row-span-2' : ''
                        }`}
                      >
                        {selectedFiles[index]?.type.startsWith('video') ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <Image
                            src={url}
                            alt={`Preview ${index + 1}`}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 p-1 bg-gray-900/70 rounded-full hover:bg-gray-900"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to post */}
              <div className="mt-4 flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">Add to your post</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <ImageIcon className="w-6 h-6 text-green-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <Tag className="w-6 h-6 text-blue-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <Smile className="w-6 h-6 text-yellow-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <MapPin className="w-6 h-6 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Post Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || (!content.trim() && selectedFiles.length === 0)}
                className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
