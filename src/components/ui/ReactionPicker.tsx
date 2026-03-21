"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// Available reaction types with their emoji representations
// TODO: Consider adding custom reaction animations or sound effects later
export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry" | null

interface ReactionConfig {
  emoji: string
  label: string
  color: string
  hoverBg: string
}

// Reaction configuration mapping - keeping this separate for easy customization
const REACTION_CONFIG: Record<Exclude<ReactionType, null>, ReactionConfig> = {
  like: {
    emoji: "👍",
    label: "Like",
    color: "text-blue-500",
    hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/30",
  },
  love: {
    emoji: "❤️",
    label: "Love",
    color: "text-red-500",
    hoverBg: "hover:bg-red-100 dark:hover:bg-red-900/30",
  },
  haha: {
    emoji: "😂",
    label: "Haha",
    color: "text-yellow-500",
    hoverBg: "hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
  },
  wow: {
    emoji: "😮",
    label: "Wow",
    color: "text-yellow-500",
    hoverBg: "hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
  },
  sad: {
    emoji: "😢",
    label: "Sad",
    color: "text-yellow-600",
    hoverBg: "hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
  },
  angry: {
    emoji: "😡",
    label: "Angry",
    color: "text-orange-500",
    hoverBg: "hover:bg-orange-100 dark:hover:bg-orange-900/30",
  },
}

interface ReactionPickerProps {
  /** Callback when a reaction is selected */
  onSelect: (reaction: ReactionType) => void
  /** Currently selected reaction, if any */
  selectedReaction: ReactionType
  /** Optional className for styling */
  className?: string
  /** Direction to show the picker - useful for positioning near edges */
  direction?: "up" | "down"
}

/**
 * ReactionPicker Component
 * 
 * A floating emoji picker that appears on hover/focus, similar to Facebook's reaction system.
 * Uses Framer Motion for smooth entrance/exit animations and hover effects.
 * 
 * @example
 * <ReactionPicker
 *   selectedReaction="like"
 *   onSelect={(reaction) => handleReaction(reaction)}
 * />
 */
export function ReactionPicker({
  onSelect,
  selectedReaction,
  className,
  direction = "up",
}: ReactionPickerProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [hoveredReaction, setHoveredReaction] = React.useState<Exclude<ReactionType, null> | null>(null)
  
  // Keep track of hover state with a small delay for better UX
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    // Small delay before hiding to prevent accidental closes
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setHoveredReaction(null)
    }, 100)
  }

  const handleReactionClick = (reaction: Exclude<ReactionType, null>) => {
    // Toggle off if clicking the same reaction
    onSelect(selectedReaction === reaction ? null : reaction)
    setIsVisible(false)
    setHoveredReaction(null)
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Animation variants for the container
  const containerVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: direction === "up" ? 10 : -10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        staggerChildren: 0.03,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: direction === "up" ? 10 : -10,
      transition: {
        duration: 0.15,
      },
    },
  }

  // Animation variants for individual reaction buttons
  const reactionVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
      },
    },
  }

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger area - shows current reaction or default like */}
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          selectedReaction && REACTION_CONFIG[selectedReaction]?.color
        )}
        onClick={() => handleReactionClick(selectedReaction || "like")}
      >
        {selectedReaction ? (
          <span className="text-lg">{REACTION_CONFIG[selectedReaction].emoji}</span>
        ) : (
          <span className="text-lg">👍</span>
        )}
        <span className="text-sm font-medium">
          {selectedReaction ? REACTION_CONFIG[selectedReaction].label : "Like"}
        </span>
      </button>

      {/* Reaction picker popup */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute z-50 flex items-center gap-1 p-2",
              "bg-white dark:bg-gray-900 rounded-full shadow-lg border",
              "border-gray-200 dark:border-gray-700",
              direction === "up" ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2"
            )}
          >
            {(Object.keys(REACTION_CONFIG) as Array<Exclude<ReactionType, null>>).map((reaction) => {
              const config = REACTION_CONFIG[reaction]
              const isHovered = hoveredReaction === reaction
              const isSelected = selectedReaction === reaction

              return (
                <motion.button
                  key={reaction}
                  variants={reactionVariants}
                  type="button"
                  className={cn(
                    "relative flex items-center justify-center",
                    "w-12 h-12 rounded-full transition-all duration-150",
                    config.hoverBg,
                    isSelected && "ring-2 ring-offset-2 ring-blue-500"
                  )}
                  onMouseEnter={() => setHoveredReaction(reaction)}
                  onMouseLeave={() => setHoveredReaction(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReactionClick(reaction)
                  }}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Emoji display */}
                  <span
                    className={cn(
                      "text-2xl transition-transform duration-150",
                      isHovered && "animate-bounce"
                    )}
                  >
                    {config.emoji}
                  </span>

                  {/* Tooltip label - appears on hover */}
                  {isHovered && (
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "absolute -bottom-8 left-1/2 -translate-x-1/2",
                        "px-2 py-0.5 text-xs font-medium rounded",
                        "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
                        "whitespace-nowrap pointer-events-none"
                      )}
                    >
                      {config.label}
                    </motion.span>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { REACTION_CONFIG }
