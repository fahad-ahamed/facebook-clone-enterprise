"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThumbsUp, Heart, Smile, Frown, Angry } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { REACTION_CONFIG, ReactionType } from "./ReactionPicker"

// User who reacted to the post
interface ReactionUser {
  id: string
  name: string
  avatar?: string | null
  reaction: Exclude<ReactionType, null>
  reactedAt: string | Date
}

// Counts for each reaction type
interface ReactionCounts {
  like: number
  love: number
  haha: number
  wow: number
  sad: number
  angry: number
}

interface ReactionViewersDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** ID of the post to fetch reactions for */
  postId: string
  /** Pre-fetched reaction counts (optional - can fetch inside if needed) */
  reactionCounts?: ReactionCounts
  /** Function to fetch users for a specific reaction type */
  onFetchUsers?: (reaction: Exclude<ReactionType, null> | "all") => Promise<ReactionUser[]>
  /** Optional additional className */
  className?: string
}

// Icon mapping for each reaction type
const REACTION_ICONS: Record<Exclude<ReactionType, null> | "all", React.ReactNode> = {
  all: <ThumbsUp className="w-4 h-4" />,
  like: <span className="text-base">👍</span>,
  love: <span className="text-base">❤️</span>,
  haha: <span className="text-base">😂</span>,
  wow: <span className="text-base">😮</span>,
  sad: <span className="text-base">😢</span>,
  angry: <span className="text-base">😡</span>,
}

// Tab labels
const TAB_LABELS: Record<Exclude<ReactionType, null> | "all", string> = {
  all: "All",
  like: "Like",
  love: "Love",
  haha: "Haha",
  wow: "Wow",
  sad: "Sad",
  angry: "Angry",
}

/**
 * ReactionViewersDialog Component
 * 
 * A dialog that displays all users who reacted to a post, organized by reaction type.
 * Uses tabs to filter by specific reactions with animated transitions.
 * 
 * @example
 * <ReactionViewersDialog
 *   isOpen={showReactionViewers}
 *   onClose={() => setShowReactionViewers(false)}
 *   postId={post.id}
 *   reactionCounts={{ like: 10, love: 5, haha: 2, wow: 1, sad: 0, angry: 0 }}
 *   onFetchUsers={fetchReactionUsers}
 * />
 */
export function ReactionViewersDialog({
  isOpen,
  onClose,
  postId,
  reactionCounts,
  onFetchUsers,
  className,
}: ReactionViewersDialogProps) {
  // Currently selected tab
  const [activeTab, setActiveTab] = React.useState<Exclude<ReactionType, null> | "all">("all")
  
  // Users data for current tab
  const [users, setUsers] = React.useState<ReactionUser[]>([])
  
  // Loading state for user fetch
  const [isLoading, setIsLoading] = React.useState(false)
  
  // Error state
  const [error, setError] = React.useState<string | null>(null)

  // Calculate total reactions
  const totalReactions = reactionCounts
    ? Object.values(reactionCounts).reduce((sum, count) => sum + count, 0)
    : 0

  // Fetch users when tab changes
  React.useEffect(() => {
    if (!isOpen || !onFetchUsers) return

    const fetchUsers = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const fetchedUsers = await onFetchUsers(activeTab)
        setUsers(fetchedUsers)
      } catch (err) {
        console.error("Failed to fetch reaction users:", err)
        setError("Failed to load reactions")
        // Set empty array on error to show empty state
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [isOpen, activeTab, onFetchUsers])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setActiveTab("all")
      setUsers([])
      setError(null)
    }
  }, [isOpen])

  // Format the reaction timestamp
  const formatReactionTime = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Mock users for demo if no onFetchUsers provided
  // TODO: Remove this when integrating with real API
  const displayUsers = React.useMemo(() => {
    if (users.length > 0) return users
    if (!onFetchUsers) {
      // Return mock data for demo
      return [
        {
          id: "1",
          name: "John Doe",
          avatar: null,
          reaction: "like" as const,
          reactedAt: new Date(),
        },
        {
          id: "2",
          name: "Jane Smith",
          avatar: null,
          reaction: "love" as const,
          reactedAt: new Date(Date.now() - 3600000),
        },
        {
          id: "3",
          name: "Bob Wilson",
          avatar: null,
          reaction: "like" as const,
          reactedAt: new Date(Date.now() - 7200000),
        },
      ]
    }
    return []
  }, [users, onFetchUsers])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "sm:max-w-md p-0 gap-0 overflow-hidden",
          className
        )}
        showCloseButton={true}
      >
        {/* Dialog Header */}
        <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-lg font-semibold text-center">
            {totalReactions} {totalReactions === 1 ? "Reaction" : "Reactions"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View all users who reacted to this post
          </DialogDescription>
        </DialogHeader>

        {/* Tabs for reaction types */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="w-full"
        >
          {/* Tab list with reaction icons */}
          <div className="px-4 pt-3 border-b border-gray-200 dark:border-gray-700">
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-1 overflow-x-auto">
              {/* All reactions tab */}
              <TabsTrigger
                value="all"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                  "data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800",
                  "border-b-2 border-transparent data-[state=active]:border-blue-500",
                  "rounded-none rounded-t-lg"
                )}
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm">{totalReactions}</span>
              </TabsTrigger>

              {/* Individual reaction tabs - only show if count > 0 */}
              {(Object.keys(REACTION_CONFIG) as Array<Exclude<ReactionType, null>>).map(
                (reaction) => {
                  const count = reactionCounts?.[reaction] ?? 0
                  if (count === 0) return null

                  return (
                    <TabsTrigger
                      key={reaction}
                      value={reaction}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                        "data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800",
                        "border-b-2 border-transparent data-[state=active]:border-blue-500",
                        "rounded-none rounded-t-lg"
                      )}
                    >
                      {REACTION_ICONS[reaction]}
                      <span className="text-sm">{count}</span>
                    </TabsTrigger>
                  )
                }
              )}
            </TabsList>
          </div>

          {/* Tab content with user list */}
          {(Object.keys({ all: true, ...REACTION_CONFIG }) as Array<typeof activeTab>).map(
            (tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <ScrollArea className="h-80">
                  {isLoading ? (
                    // Loading skeleton
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="w-6 h-6" />
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    // Error state
                    <div className="p-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setActiveTab(tab)}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : displayUsers.length === 0 ? (
                    // Empty state
                    <div className="p-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        No reactions yet
                      </p>
                    </div>
                  ) : (
                    // User list
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="p-2"
                      >
                        {displayUsers.map((user, index) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg",
                              "hover:bg-gray-100 dark:hover:bg-gray-800",
                              "cursor-pointer transition-colors"
                            )}
                          >
                            {/* User avatar */}
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback>
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>

                            {/* User info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatReactionTime(user.reactedAt)}
                              </p>
                            </div>

                            {/* Reaction emoji */}
                            <span className="text-lg">
                              {REACTION_CONFIG[user.reaction]?.emoji}
                            </span>
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </ScrollArea>
              </TabsContent>
            )
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export type { ReactionUser, ReactionCounts }
