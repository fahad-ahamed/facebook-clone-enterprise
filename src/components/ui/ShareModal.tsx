"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Share2,
  User,
  Users,
  MessageCircle,
  Link2,
  Check,
  Globe,
  Lock,
  Copy,
  ExternalLink,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Post type definition - should match your actual post interface
interface PostAuthor {
  id: string
  name: string
  avatar?: string | null
}

interface PostMedia {
  type: "image" | "video"
  url: string
}

interface Post {
  id: string
  content: string
  author: PostAuthor
  media?: PostMedia[]
  createdAt: string | Date
  visibility?: "public" | "friends" | "private"
}

interface CurrentUser {
  id: string
  name: string
  avatar?: string | null
}

// Share destination options
type ShareDestination = "timeline" | "message" | "group"

interface ShareOption {
  id: ShareDestination
  label: string
  description: string
  icon: React.ReactNode
}

const SHARE_OPTIONS: ShareOption[] = [
  {
    id: "timeline",
    label: "Share on Your Timeline",
    description: "Post this to your timeline",
    icon: <User className="w-5 h-5" />,
  },
  {
    id: "message",
    label: "Share in a Message",
    description: "Send this in a private message",
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    id: "group",
    label: "Share to a Group",
    description: "Post to a group you're in",
    icon: <Users className="w-5 h-5" />,
  },
]

interface ShareModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** The post being shared */
  post: Post | null
  /** Current logged-in user */
  currentUser: CurrentUser | null
  /** Callback when share is confirmed */
  onShare: (destination: ShareDestination, message: string) => Promise<void> | void
  /** Optional additional className */
  className?: string
}

/**
 * ShareModal Component
 * 
 * A modal dialog for sharing posts to different destinations (timeline, message, group).
 * Includes a post preview, optional message input, and copy link functionality.
 * 
 * @example
 * <ShareModal
 *   isOpen={showShareModal}
 *   onClose={() => setShowShareModal(false)}
 *   post={selectedPost}
 *   currentUser={user}
 *   onShare={handleShare}
 * />
 */
export function ShareModal({
  isOpen,
  onClose,
  post,
  currentUser,
  onShare,
  className,
}: ShareModalProps) {
  // Track which share option is selected
  const [selectedOption, setSelectedOption] = React.useState<ShareDestination>("timeline")
  
  // User's custom message to add when sharing
  const [shareMessage, setShareMessage] = React.useState("")
  
  // Loading state during share operation
  const [isSharing, setIsSharing] = React.useState(false)
  
  // Track if link was copied to show feedback
  const [linkCopied, setLinkCopied] = React.useState(false)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setShareMessage("")
      setSelectedOption("timeline")
      setLinkCopied(false)
    }
  }, [isOpen])

  // Generate shareable link for the post
  // TODO: Update this to match your actual URL structure
  const getPostUrl = () => {
    if (!post) return ""
    return `${window.location.origin}/post/${post.id}`
  }

  // Handle copying the post link to clipboard
  const handleCopyLink = async () => {
    const url = getPostUrl()
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      // Reset the copied state after 2 seconds
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      console.error("Failed to copy link:", err)
      // TODO: Add toast notification for error
    }
  }

  // Handle the share action
  const handleShare = async () => {
    if (!post || isSharing) return

    setIsSharing(true)
    try {
      await onShare(selectedOption, shareMessage)
      onClose()
    } catch (error) {
      console.error("Failed to share post:", error)
      // TODO: Add error handling with toast notification
    } finally {
      setIsSharing(false)
    }
  }

  // Format the post creation date
  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Get visibility icon for post preview
  const getVisibilityIcon = () => {
    switch (post?.visibility) {
      case "public":
        return <Globe className="w-3.5 h-3.5" />
      case "friends":
        return <Users className="w-3.5 h-3.5" />
      case "private":
        return <Lock className="w-3.5 h-3.5" />
      default:
        return <Globe className="w-3.5 h-3.5" />
    }
  }

  // Don't render if no post data
  if (!post) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "sm:max-w-lg p-0 gap-0 overflow-hidden",
          className
        )}
        showCloseButton={true}
      >
        {/* Modal Header */}
        <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-xl font-semibold text-center">
            Share Post
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose how you want to share this post
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col max-h-[70vh] overflow-hidden">
          {/* Share Options Section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              {SHARE_OPTIONS.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  type="button"
                  onClick={() => setSelectedOption(option.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500",
                    selectedOption === option.id && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  {/* Icon container */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full",
                      "bg-gray-100 dark:bg-gray-800",
                      selectedOption === option.id && "bg-blue-100 dark:bg-blue-900/40"
                    )}
                  >
                    {option.icon}
                  </div>

                  {/* Text content */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  {selectedOption === option.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Message Input Section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            {/* Current user info */}
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatar || undefined} />
                <AvatarFallback>
                  {currentUser?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{currentUser?.name}</span>
            </div>

            {/* Message textarea */}
            <Textarea
              placeholder="Write something about this..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {shareMessage.length}/500
            </p>
          </div>

          {/* Post Preview Section */}
          <div className="p-4 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase">
              Post Preview
            </p>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Original post header */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={post.author.avatar || undefined} />
                  <AvatarFallback>
                    {post.author.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{post.author.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    {formatDate(post.createdAt)}
                    <span className="mx-1">·</span>
                    {getVisibilityIcon()}
                  </p>
                </div>
              </div>

              {/* Post content */}
              <div className="p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {post.content}
                </p>
              </div>

              {/* Post media preview */}
              {post.media && post.media.length > 0 && (
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                  {post.media[0].type === "image" ? (
                    <img
                      src={post.media[0].url}
                      alt="Post media"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={post.media[0].url}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
          {/* Copy link button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-2"
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </Button>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSharing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleShare}
              disabled={isSharing}
              className="gap-2 min-w-[80px]"
            >
              {isSharing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type { Post, CurrentUser, ShareDestination }
