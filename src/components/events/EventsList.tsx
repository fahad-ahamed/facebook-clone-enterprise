'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Heart,
  CheckCircle,
  Share2,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/stringUtils';

// Event type definition - matches what we'd get from the API
export interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isOnline: boolean;
  onlineUrl?: string;
  hostId: string;
  host?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  goingCount: number;
  interestedCount: number;
  userRsvp?: 'going' | 'interested' | 'not_going' | null;
  privacy: 'public' | 'private';
  createdAt: string;
}

// RSVP status type
export type RsvpStatus = 'going' | 'interested' | 'not_going';

interface EventsListProps {
  /** Array of events to display */
  events: Event[];
  /** Handler when user RSVPs to an event */
  onRsvp: (eventId: string, status: RsvpStatus) => void | Promise<void>;
  /** Optional className for styling */
  className?: string;
  /** Show loading state */
  isLoading?: boolean;
  /** View mode - grid or list */
  viewMode?: 'grid' | 'list';
}

// Format event date helper
const formatEventDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();

  if (isToday) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Format date for card display (day and month)
const formatDateCard = (dateStr: string): { day: string; month: string } => {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
  };
};

// Individual event card component
const EventCard = memo(function EventCard({
  event,
  onRsvp,
  isProcessing,
  onProcessingChange,
}: {
  event: Event;
  onRsvp: (eventId: string, status: RsvpStatus) => void | Promise<void>;
  isProcessing: string | null;
  onProcessingChange: (id: string | null) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { day, month } = formatDateCard(event.startDate);

  const handleRsvp = async (status: RsvpStatus) => {
    // If clicking the same status, remove RSVP
    const newStatus = event.userRsvp === status ? 'not_going' : status;
    onProcessingChange(event.id);
    try {
      await onRsvp(event.id, newStatus);
    } finally {
      onProcessingChange(null);
    }
  };

  const isUpcoming = new Date(event.startDate) > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
        {/* Cover Image with Date Badge */}
        <div className="relative h-40 bg-gradient-to-br from-orange-400 to-pink-500">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            // Default pattern background
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="5" cy="5" r="1.5" fill="white" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#dots)" />
              </svg>
            </div>
          )}

          {/* Date Badge */}
          <div className="absolute top-3 left-3 bg-white rounded-lg shadow-lg p-2 text-center min-w-[50px]">
            <div className="text-xs font-medium text-gray-500 uppercase">{month}</div>
            <div className="text-xl font-bold text-gray-900">{day}</div>
          </div>

          {/* Online badge */}
          {event.isOnline && (
            <Badge className="absolute top-3 right-3 bg-blue-500 hover:bg-blue-600">
              Online Event
            </Badge>
          )}

          {/* Past event overlay */}
          {!isUpcoming && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                Past Event
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Event info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg line-clamp-2">{event.title}</h3>

            {/* Time and location */}
            <div className="space-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{formatEventDate(event.startDate)}</span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}

              {event.isOnline && event.onlineUrl && (
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-500 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Join Online</span>
                </a>
              )}
            </div>

            {/* Host info */}
            {event.host && (
              <div className="flex items-center gap-2 pt-1">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={event.host.avatar} />
                  <AvatarFallback className="text-xs">
                    {event.host.firstName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">
                  Hosted by <span className="font-medium">{event.host.firstName}</span>
                </span>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 pt-2 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{formatNumber(event.goingCount)} going</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-pink-500" />
                <span>{formatNumber(event.interestedCount)} interested</span>
              </div>
            </div>
          </div>

          {/* RSVP buttons */}
          {isUpcoming && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleRsvp('going')}
                disabled={isProcessing === event.id}
                variant={event.userRsvp === 'going' ? 'default' : 'outline'}
                className={cn(
                  'flex-1 gap-1',
                  event.userRsvp === 'going' && 'bg-green-500 hover:bg-green-600'
                )}
                size="sm"
              >
                {isProcessing === event.id ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {event.userRsvp === 'going' ? 'Going' : 'Going'}
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleRsvp('interested')}
                disabled={isProcessing === event.id}
                variant={event.userRsvp === 'interested' ? 'default' : 'outline'}
                className={cn(
                  'flex-1 gap-1',
                  event.userRsvp === 'interested' && 'bg-pink-500 hover:bg-pink-600'
                )}
                size="sm"
              >
                <Heart className="w-4 h-4" />
                {event.userRsvp === 'interested' ? 'Interested' : 'Interested'}
              </Button>

              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

// List view event card
const EventListItem = memo(function EventListItem({
  event,
  onRsvp,
  isProcessing,
  onProcessingChange,
}: {
  event: Event;
  onRsvp: (eventId: string, status: RsvpStatus) => void | Promise<void>;
  isProcessing: string | null;
  onProcessingChange: (id: string | null) => void;
}) {
  const { day, month } = formatDateCard(event.startDate);
  const isUpcoming = new Date(event.startDate) > new Date();

  const handleRsvp = async (status: RsvpStatus) => {
    const newStatus = event.userRsvp === status ? 'not_going' : status;
    onProcessingChange(event.id);
    try {
      await onRsvp(event.id, newStatus);
    } finally {
      onProcessingChange(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
    >
      <div className="flex gap-4">
        {/* Date badge */}
        <div className="bg-gray-100 rounded-lg p-3 text-center min-w-[60px] flex-shrink-0">
          <div className="text-xs font-medium text-gray-500 uppercase">{month}</div>
          <div className="text-2xl font-bold text-gray-900">{day}</div>
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{event.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatEventDate(event.startDate)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-gray-500">
              <span className="text-green-600 font-medium">{event.goingCount}</span> going
            </span>
            <span className="text-gray-500">
              <span className="text-pink-600 font-medium">{event.interestedCount}</span> interested
            </span>
          </div>
        </div>

        {/* RSVP buttons */}
        {isUpcoming && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => handleRsvp('interested')}
              disabled={isProcessing === event.id}
              variant={event.userRsvp === 'interested' ? 'default' : 'outline'}
              size="sm"
              className={cn(event.userRsvp === 'interested' && 'bg-pink-500 hover:bg-pink-600')}
            >
              <Heart className="w-4 h-4 mr-1" />
              Interested
            </Button>
            <Button
              onClick={() => handleRsvp('going')}
              disabled={isProcessing === event.id}
              variant={event.userRsvp === 'going' ? 'default' : 'default'}
              size="sm"
              className={cn(event.userRsvp === 'going' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700')}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {event.userRsvp === 'going' ? 'Going' : 'Join'}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// Loading skeleton
const EventSkeleton = memo(function EventSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className="h-40 bg-gray-200 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        <div className="flex gap-2 mt-4">
          <div className="h-9 bg-gray-200 rounded animate-pulse flex-1" />
          <div className="h-9 bg-gray-200 rounded animate-pulse flex-1" />
        </div>
      </CardContent>
    </Card>
  );
});

// Empty state component
const EmptyState = memo(function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="col-span-full flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Calendar className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">No events yet</h3>
      <p className="text-gray-500 mt-1 max-w-sm">
        Create an event to bring people together for a special occasion
      </p>
    </motion.div>
  );
});

/**
 * EventsList Component
 *
 * Displays a grid or list of event cards with RSVP functionality.
 * Uses Framer Motion for smooth animations and transitions.
 *
 * @example
 * <EventsList
 *   events={events}
 *   onRsvp={(id, status) => handleRsvp(id, status)}
 *   viewMode="grid"
 * />
 */
export const EventsList = memo(function EventsList({
  events,
  onRsvp,
  className,
  isLoading = false,
  viewMode = 'grid',
}: EventsListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <EventSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (events.length === 0) {
    return <EmptyState />;
  }

  // Render based on view mode
  if (viewMode === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        <AnimatePresence mode="popLayout">
          {events.map((event) => (
            <EventListItem
              key={event.id}
              event={event}
              onRsvp={onRsvp}
              isProcessing={processingId}
              onProcessingChange={setProcessingId}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      <AnimatePresence mode="popLayout">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onRsvp={onRsvp}
            isProcessing={processingId}
            onProcessingChange={setProcessingId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

export default EventsList;
