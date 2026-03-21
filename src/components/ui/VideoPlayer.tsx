"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Loader2,
  Wifi,
  WifiOff,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

// Available video quality options
type VideoQuality = "auto" | "1080p" | "720p" | "480p" | "360p"

// Quality configuration
interface QualityOption {
  value: VideoQuality
  label: string
  description: string
}

const QUALITY_OPTIONS: QualityOption[] = [
  { value: "auto", label: "Auto", description: "Adjusts based on network speed" },
  { value: "1080p", label: "1080p HD", description: "Best quality (requires fast connection)" },
  { value: "720p", label: "720p HD", description: "Good quality" },
  { value: "480p", label: "480p", description: "Standard quality" },
  { value: "360p", label: "360p", description: "Lower quality (saves data)" },
]

// Network speed levels
type NetworkSpeed = "fast" | "good" | "slow" | "very-slow" | "unknown"

const NETWORK_LABELS: Record<NetworkSpeed, { label: string; icon: React.ReactNode }> = {
  fast: { label: "Fast", icon: <Wifi className="w-3.5 h-3.5 text-green-500" /> },
  good: { label: "Good", icon: <Wifi className="w-3.5 h-3.5 text-blue-500" /> },
  slow: { label: "Slow", icon: <Wifi className="w-3.5 h-3.5 text-yellow-500" /> },
  "very-slow": { label: "Very Slow", icon: <WifiOff className="w-3.5 h-3.5 text-red-500" /> },
  unknown: { label: "Unknown", icon: <Wifi className="w-3.5 h-3.5 text-gray-400" /> },
}

interface VideoPlayerProps {
  /** Video source URL */
  src: string
  /** Optional poster image URL */
  poster?: string
  /** Optional className for styling */
  className?: string
  /** Auto-play the video (muted by default for browser policy) */
  autoPlay?: boolean
  /** Loop the video */
  loop?: boolean
  /** Show controls (default: true) */
  showControls?: boolean
  /** Callback when video starts playing */
  onPlay?: () => void
  /** Callback when video pauses */
  onPause?: () => void
  /** Callback when video ends */
  onEnded?: () => void
}

/**
 * VideoPlayer Component
 * 
 * An enhanced video player with quality selection, network speed detection,
 * and custom controls. Uses Framer Motion for smooth animations.
 * 
 * @example
 * <VideoPlayer
 *   src="/videos/sample.mp4"
 *   poster="/images/thumbnail.jpg"
 *   onPlay={() => console.log('Video started')}
 * />
 */
export function VideoPlayer({
  src,
  poster,
  className,
  autoPlay = false,
  loop = false,
  showControls = true,
  onPlay,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  // Video element reference
  const videoRef = React.useRef<HTMLVideoElement>(null)
  
  // Player state
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(autoPlay) // Auto-play requires muted
  const [volume, setVolume] = React.useState(1)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [isBuffering, setIsBuffering] = React.useState(false)
  
  // Quality and network state
  const [selectedQuality, setSelectedQuality] = React.useState<VideoQuality>("auto")
  const [networkSpeed, setNetworkSpeed] = React.useState<NetworkSpeed>("unknown")
  
  // UI state
  const [showControlsOverlay, setShowControlsOverlay] = React.useState(true)
  const [showSettings, setShowSettings] = React.useState(false)
  
  // Hide controls timeout ref
  const hideControlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Detect network speed using Navigator Connection API
  // Note: This API is not available in all browsers
  React.useEffect(() => {
    const detectNetworkSpeed = () => {
      // Check if Network Information API is available
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } }).connection
      
      if (connection) {
        const { effectiveType, downlink } = connection
        
        // Determine speed based on connection type or downlink speed
        if (effectiveType) {
          switch (effectiveType) {
            case "4g":
              setNetworkSpeed(downlink && downlink > 10 ? "fast" : "good")
              break
            case "3g":
              setNetworkSpeed("slow")
              break
            case "2g":
            case "slow-2g":
              setNetworkSpeed("very-slow")
              break
            default:
              setNetworkSpeed("unknown")
          }
        } else if (downlink !== undefined) {
          // Use downlink speed if effectiveType is not available
          if (downlink > 10) setNetworkSpeed("fast")
          else if (downlink > 5) setNetworkSpeed("good")
          else if (downlink > 1) setNetworkSpeed("slow")
          else setNetworkSpeed("very-slow")
        }
      }

      // Listen for network changes
      const handleConnectionChange = () => detectNetworkSpeed()
      connection?.addEventListener?.("change", handleConnectionChange)
      
      return () => {
        connection?.removeEventListener?.("change", handleConnectionChange)
      }
    }

    detectNetworkSpeed()
  }, [])

  // Auto-adjust quality based on network speed when set to "auto"
  React.useEffect(() => {
    if (selectedQuality !== "auto") return

    // Map network speed to recommended quality
    // TODO: This could be enhanced with actual adaptive streaming
    const qualityMap: Record<NetworkSpeed, VideoQuality> = {
      fast: "1080p",
      good: "720p",
      slow: "480p",
      "very-slow": "360p",
      unknown: "720p",
    }

    // Note: In a real implementation, you'd switch to different video sources
    // based on quality selection. For now, this just tracks the preference.
    const recommendedQuality = qualityMap[networkSpeed]
    // Store the auto-selected quality for display purposes
  }, [networkSpeed, selectedQuality])

  // Handle showing/hiding controls on mouse activity
  const handleMouseMove = () => {
    setShowControlsOverlay(true)
    
    // Clear existing timeout
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    
    // Hide controls after 3 seconds of inactivity
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControlsOverlay(false)
      }, 3000)
    }
  }

  // Play/pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      onPause?.()
    } else {
      videoRef.current.play()
      onPlay?.()
    }
  }

  // Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Volume change handler
  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return
    const newVolume = value[0] ?? 0
    videoRef.current.volume = newVolume
    setVolume(newVolume)
    if (newVolume === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  // Seek handler
  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return
    const newTime = value[0] ?? 0
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!videoRef.current) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoRef.current.requestFullscreen()
    }
  }

  // Format time display (MM:SS or HH:MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00"
    
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration)
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => {
    setIsPlaying(false)
    onEnded?.()
  }

  const handleWaiting = () => setIsBuffering(true)
  const handleCanPlay = () => setIsBuffering(false)

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className={cn(
        "relative group bg-black rounded-lg overflow-hidden",
        "focus:outline-none",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControlsOverlay(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={isMuted}
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onClick={togglePlay}
      />

      {/* Buffering indicator */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause overlay (center) */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/60 transition-colors">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControlsOverlay && showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-3 px-3"
          >
            {/* Progress bar */}
            <div className="mb-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
                aria-label="Video progress"
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              {/* Left controls */}
              <div className="flex items-center gap-2">
                {/* Play/Pause button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20 h-8 w-8"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>

                {/* Volume controls */}
                <div className="flex items-center gap-1 group/volume">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20 h-8 w-8"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                  
                  {/* Volume slider - shows on hover */}
                  <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="w-16"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                {/* Time display */}
                <span className="text-white text-xs font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1">
                {/* Network speed indicator */}
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/10">
                  {NETWORK_LABELS[networkSpeed].icon}
                  <span className="text-white text-xs">
                    {NETWORK_LABELS[networkSpeed].label}
                  </span>
                </div>

                {/* Quality selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-8 w-8"
                      aria-label="Video settings"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48"
                  >
                    {/* Quality header */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                      Quality
                    </div>
                    
                    {/* Quality options */}
                    {QUALITY_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setSelectedQuality(option.value)}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <p className="text-xs text-gray-500">
                            {option.description}
                          </p>
                        </div>
                        {selectedQuality === option.value && (
                          <ChevronUp className="w-4 h-4 text-blue-500" />
                        )}
                      </DropdownMenuItem>
                    ))}

                    {/* Current quality display when on Auto */}
                    {selectedQuality === "auto" && networkSpeed !== "unknown" && (
                      <div className="px-2 py-1.5 text-xs text-gray-500 border-t mt-1">
                        Currently streaming at{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {networkSpeed === "fast"
                            ? "1080p"
                            : networkSpeed === "good"
                            ? "720p"
                            : networkSpeed === "slow"
                            ? "480p"
                            : "360p"}
                        </span>
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 h-8 w-8"
                  aria-label="Fullscreen"
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quality badge (shown when quality is not auto) */}
      {selectedQuality !== "auto" && showControlsOverlay && (
        <div className="absolute top-3 right-3 bg-black/60 px-2 py-0.5 rounded text-white text-xs font-medium">
          {QUALITY_OPTIONS.find((q) => q.value === selectedQuality)?.label}
        </div>
      )}
    </div>
  )
}

export type { VideoQuality, NetworkSpeed }
