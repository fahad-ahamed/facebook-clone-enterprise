// Post card component - displays a single post in the feed
// Added reaction support recently

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  MoreHorizontal, ThumbsUp, Heart, MessageCircle, Share2, Bookmark,
  Globe, Users, Lock, MapPin, Flag, EyeOff, Trash2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatTimeAgo } from '@/utils/dateUtils';
import { getInitials, formatNumber } from '@/utils/stringUtils';
import type { Post, User } from '@/types';
import { REACTIONS } from '@/types';

interface PostCardProps {
  post: Post;
  currentUser: User;
  onReact: (postId: string, type: string) => void;
  onComment: (postId: string, content: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
  onDelete: (postId: string) => void;
}

export function PostCard({ 
  post, 
  currentUser, 
  onReact, 
  onComment, 
  onShare, 
  onSave,
  onDelete 
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const totalReactions = Object.values(REACTIONS)
    .reduce((sum, r) => sum + (post as any)[r.type + 'Count'] || 0, 0);

  const handleReaction = (type: string) => {
    onReact(post.id, type);
    setShowReactionPicker(false);
  };

  const handleComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'public': return <Globe className="w-3 h-3" />;
      case 'friends': return <Users className="w-3 h-3" />;
      default: return <Lock className="w-3 h-3" />;
    }
  };

  return (
    <article className="bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between p-3">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback>{getInitials(post.author.firstName, post.author.lastName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold hover:underline cursor-pointer">
                {post.author.firstName} {post.author.lastName}
              </span>
              {post.author.isVerified && (
                <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{formatTimeAgo(post.createdAt)}</span>
              <span>·</span>
              {getVisibilityIcon()}
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

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border py-2 w-56 z-50">
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
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-3 pb-2">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Media */}
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
              className="w-full max-h-[500px] object-cover"
            />
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          {totalReactions > 0 && (
            <>
              <div className="flex -space-x-0.5">
                <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs">👍</span>
                <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">❤️</span>
              </div>
              <span className="text-sm text-gray-500 ml-1">{formatNumber(totalReactions)}</span>
            </>
          )}
        </div>
        <div className="flex gap-3 text-sm text-gray-500">
          <button onClick={() => setShowComments(!showComments)} className="hover:underline">
            {formatNumber(post.commentCount)} comment{post.commentCount !== 1 ? 's' : ''}
          </button>
          <button onClick={() => onShare(post.id)} className="hover:underline">
            {formatNumber(post.shareCount)} share{post.shareCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-around py-1 px-2">
        {/* Reaction picker */}
        <div className="relative">
          {showReactionPicker && (
            <div 
              className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl p-2 flex gap-1 z-50 border"
              onMouseLeave={() => setShowReactionPicker(false)}
            >
              {REACTIONS.map(r => (
                <button
                  key={r.type}
                  onClick={() => handleReaction(r.type)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-gray-100",
                    post.userReaction === r.type && "bg-blue-50 ring-2 ring-blue-400"
                  )}
                >
                  {r.icon}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            onMouseEnter={() => setShowReactionPicker(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
              post.userReaction ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {post.userReaction ? (
              <span className="text-lg">{REACTIONS.find(r => r.type === post.userReaction)?.icon}</span>
            ) : (
              <ThumbsUp className="w-5 h-5" />
            )}
            <span className="font-medium text-sm">
              {post.userReaction ? REACTIONS.find(r => r.type === post.userReaction)?.label : 'Like'}
            </span>
          </button>
        </div>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Comment</span>
        </button>

        <button
          onClick={() => onShare(post.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-medium text-sm">Share</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t px-3 py-2">
          {post.comments && post.comments.length > 0 && (
            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
              {post.comments.map(comment => (
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
                      <span>{formatTimeAgo(comment.createdAt)}</span>
                      <button className="font-semibold hover:underline">Like</button>
                      <button className="font-semibold hover:underline">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div className="flex gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatar} />
            </Avatar>
            <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-1.5">
              <input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
