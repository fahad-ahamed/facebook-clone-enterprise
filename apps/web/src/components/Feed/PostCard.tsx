'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useMutation } from '@apollo/client';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  Users,
  Lock,
  Bookmark,
  Flag,
  Trash2,
  Edit,
  Link2,
  Laugh,
  Frown,
  Angry,
  Surprised,
  ThumbsDown,
} from 'lucide-react';
import { ADD_REACTION, REMOVE_REACTION } from '@/graphql/mutations/postMutations';
import type { Post, ReactionType } from '@/types/post';
import { toast } from '@/components/providers/ToastProvider';

interface PostCardProps {
  post: Post;
}

const reactionEmojis: Record<ReactionType, { icon: React.ReactNode; color: string; label: string }> = {
  LIKE: { icon: <ThumbsUp className="w-5 h-5" />, color: 'text-blue-500', label: 'Like' },
  LOVE: { icon: <Heart className="w-5 h-5" />, color: 'text-red-500', label: 'Love' },
  HAHA: { icon: <Laugh className="w-5 h-5" />, color: 'text-yellow-500', label: 'Haha' },
  WOW: { icon: <Surprised className="w-5 h-5" />, color: 'text-yellow-500', label: 'Wow' },
  SAD: { icon: <Frown className="w-5 h-5" />, color: 'text-yellow-500', label: 'Sad' },
  ANGRY: { icon: <Angry className="w-5 h-5" />, color: 'text-orange-500', label: 'Angry' },
  CARE: { icon: <Heart className="w-5 h-5" />, color: 'text-pink-500', label: 'Care' },
};

export function PostCard({ post }: PostCardProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  const [addReaction, { loading: reacting }] = useMutation(ADD_REACTION);
  const [removeReaction, { loading: unreacting }] = useMutation(REMOVE_REACTION);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current user reaction
  const currentReaction = post.reactions.find((r) => r.reacted)?.type;
  const reactionCount = post.reactions.reduce((sum, r) => sum + r.count, 0);

  const handleReaction = async (type: ReactionType) => {
    try {
      if (currentReaction === type) {
        await removeReaction({
          variables: { postId: post.id },
          optimisticResponse: {
            removeReaction: {
              success: true,
              message: 'Reaction removed',
              post: {
                ...post,
                reactions: post.reactions.map((r) =>
                  r.type === type ? { ...r, count: r.count - 1, reacted: false } : r
                ),
                reactionCount: reactionCount - 1,
              },
            },
          },
        });
      } else {
        await addReaction({
          variables: {
            input: {
              postId: post.id,
              type,
            },
          },
          optimisticResponse: {
            addReaction: {
              success: true,
              reaction: {
                id: `temp-${Date.now()}`,
                type,
                createdAt: new Date().toISOString(),
              },
              post: {
                ...post,
                reactions: post.reactions.map((r) => {
                  if (r.type === type) {
                    return { ...r, count: r.count + 1, reacted: true };
                  }
                  if (r.reacted) {
                    return { ...r, count: r.count - 1, reacted: false };
                  }
                  return r;
                }),
                reactionCount: reactionCount + (currentReaction ? 0 : 1),
              },
            },
          },
        });
      }
      setShowReactionPicker(false);
    } catch (error) {
      toast.error('Failed to react. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post',
          text: post.content?.substring(0, 100),
          url: `/post/${post.id}`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled share or error
    }
  };

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'PUBLIC':
        return <Globe className="w-3 h-3" />;
      case 'FRIENDS':
        return <Users className="w-3 h-3" />;
      case 'PRIVATE':
        return <Lock className="w-3 h-3" />;
      default:
        return <Globe className="w-3 h-3" />;
    }
  };

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
              {post.author.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={`${post.author.firstName} ${post.author.lastName}`}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                  {post.author.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </Link>
          <div>
            <Link
              href={`/profile/${post.author.id}`}
              className="font-semibold text-gray-900 dark:text-white hover:underline"
            >
              {post.author.firstName} {post.author.lastName}
            </Link>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span>·</span>
              {getVisibilityIcon()}
              {post.isEdited && (
                <>
                  <span>·</span>
                  <span>Edited</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Options Menu */}
        <div ref={optionsMenuRef} className="relative">
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-full mt-1 w-60 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
              {post.canEdit && (
                <button className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Edit className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Edit post</span>
                </button>
              )}
              {post.canDelete && (
                <button className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Delete post</span>
                </button>
              )}
              <button className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bookmark className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Save post</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
                <Link2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Copy link</span>
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
                <Flag className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-200">Report post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-3 pb-2">
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="relative">
          {post.media.length === 1 ? (
            <div className="relative max-h-[500px] overflow-hidden">
              {post.media[0].type === 'VIDEO' ? (
                <video
                  src={post.media[0].url}
                  controls
                  className="w-full object-contain"
                />
              ) : (
                <Image
                  src={post.media[0].url}
                  alt={post.media[0].altText || 'Post media'}
                  width={post.media[0].width || 500}
                  height={post.media[0].height || 375}
                  className="w-full object-contain"
                />
              )}
            </div>
          ) : (
            <div className={`grid gap-1 ${
              post.media.length === 2 ? 'grid-cols-2' :
              post.media.length === 3 ? 'grid-cols-2' :
              post.media.length === 4 ? 'grid-cols-2' :
              'grid-cols-3'
            }`}>
              {post.media.slice(0, 4).map((media, index) => (
                <div
                  key={media.id}
                  className={`relative overflow-hidden ${
                    index === 0 && post.media.length === 3 ? 'row-span-2' : ''
                  } ${index === 3 && post.media.length > 4 ? 'relative' : ''}`}
                >
                  <Image
                    src={media.url}
                    alt={media.altText || 'Post media'}
                    width={media.width || 300}
                    height={media.height || 300}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && post.media.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        +{post.media.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reaction Summary */}
      {(reactionCount > 0 || post.commentCount > 0 || post.shareCount > 0) && (
        <div className="px-3 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            {reactionCount > 0 && (
              <div className="flex items-center gap-0.5">
                <div className="flex -space-x-1">
                  {post.reactions
                    .filter((r) => r.count > 0)
                    .slice(0, 3)
                    .map((r) => (
                      <span
                        key={r.type}
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${reactionEmojis[r.type].color}`}
                      >
                        {reactionEmojis[r.type].icon}
                      </span>
                    ))}
                </div>
                <span className="ml-1">{reactionCount}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {post.commentCount > 0 && (
              <button className="hover:underline">{post.commentCount} comments</button>
            )}
            {post.shareCount > 0 && (
              <button className="hover:underline">{post.shareCount} shares</button>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-3 py-1 flex items-center justify-around border-b border-gray-200 dark:border-gray-700">
        {/* Reaction Button */}
        <div ref={reactionPickerRef} className="relative flex-1">
          <button
            onMouseEnter={() => setShowReactionPicker(true)}
            onClick={() => handleReaction('LIKE')}
            disabled={reacting || unreacting}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
              ${currentReaction ? reactionEmojis[currentReaction].color : 'text-gray-500 dark:text-gray-400'}`}
          >
            {currentReaction ? (
              <>
                {reactionEmojis[currentReaction].icon}
                <span className="font-medium">{reactionEmojis[currentReaction].label}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-5 h-5" />
                <span>Like</span>
              </>
            )}
          </button>

          {/* Reaction Picker */}
          {showReactionPicker && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 z-10"
              onMouseLeave={() => setShowReactionPicker(false)}
            >
              {(Object.keys(reactionEmojis) as ReactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  disabled={reacting || unreacting}
                  className={`p-2 rounded-full hover:scale-125 transition-transform ${reactionEmojis[type].color}`}
                  title={reactionEmojis[type].label}
                >
                  {reactionEmojis[type].icon}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment Button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-3">
          {/* Comment Input */}
          <div className="flex items-start gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Existing Comments */}
          {post.comments?.edges?.map((edge) => {
            const comment = edge.node;
            return (
              <div key={comment.id} className="flex items-start gap-2 mb-3">
                <Link href={`/profile/${comment.author.id}`}>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                    {comment.author.avatar ? (
                      <Image
                        src={comment.author.avatar}
                        alt={comment.author.firstName}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-semibold">
                        {comment.author.firstName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-3 py-2">
                    <Link
                      href={`/profile/${comment.author.id}`}
                      className="font-semibold text-sm text-gray-900 dark:text-white hover:underline"
                    >
                      {comment.author.firstName} {comment.author.lastName}
                    </Link>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400 px-2">
                    <button className="font-semibold hover:underline">Like</button>
                    <button className="font-semibold hover:underline">Reply</button>
                    <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {post.commentCount > 3 && (
            <button className="text-sm text-blue-500 hover:underline">
              View all {post.commentCount} comments
            </button>
          )}
        </div>
      )}
    </article>
  );
}
