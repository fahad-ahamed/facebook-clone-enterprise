'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Lock,
  Globe,
  UserPlus,
  UserMinus,
  MoreHorizontal,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials, formatNumber } from '@/utils/stringUtils';

// Group type definition - matches what we'd get from the API
export interface Group {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  memberCount: number;
  privacy: 'public' | 'private';
  isMember: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  location?: string;
}

interface GroupsListProps {
  /** Array of groups to display */
  groups: Group[];
  /** Handler when user joins a group */
  onJoin: (groupId: string) => void | Promise<void>;
  /** Handler when user leaves a group */
  onLeave: (groupId: string) => void | Promise<void>;
  /** Optional className for styling */
  className?: string;
  /** Show loading state */
  isLoading?: boolean;
}

// Individual group card component
const GroupCard = memo(function GroupCard({
  group,
  onJoin,
  onLeave,
  isProcessing,
  onProcessingChange,
}: {
  group: Group;
  onJoin: (groupId: string) => void | Promise<void>;
  onLeave: (groupId: string) => void | Promise<void>;
  isProcessing: string | null;
  onProcessingChange: (id: string | null) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggleMembership = async () => {
    onProcessingChange(group.id);
    try {
      if (group.isMember) {
        await onLeave(group.id);
      } else {
        await onJoin(group.id);
      }
    } finally {
      onProcessingChange(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
        {/* Cover Image */}
        <div className="relative h-32 bg-gradient-to-br from-blue-400 to-purple-500">
          {group.coverImage ? (
            <img
              src={group.coverImage}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            // Default gradient background with pattern
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="5" cy="5" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
              </svg>
            </div>
          )}

          {/* Privacy badge */}
          <div className="absolute top-2 right-2">
            <Badge
              variant="secondary"
              className="bg-white/90 text-gray-700 gap-1"
            >
              {group.privacy === 'private' ? (
                <>
                  <Lock className="w-3 h-3" />
                  Private
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3" />
                  Public
                </>
              )}
            </Badge>
          </div>

          {/* Member badge */}
          {group.isMember && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-2 right-2"
            >
              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                Member
              </Badge>
            </motion.div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Group info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg truncate">{group.name}</h3>

            {group.description && (
              <p className="text-sm text-gray-500 line-clamp-2">
                {group.description}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{formatNumber(group.memberCount)} members</span>
              </div>
              {group.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate max-w-[100px]">{group.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <motion.div
            className="mt-4"
            animate={{ scale: isHovered ? 1.02 : 1 }}
          >
            <Button
              onClick={handleToggleMembership}
              disabled={isProcessing === group.id}
              variant={group.isMember ? 'outline' : 'default'}
              className={cn(
                'w-full gap-2',
                !group.isMember && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {isProcessing === group.id ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                </motion.div>
              ) : group.isMember ? (
                <>
                  <UserMinus className="w-4 h-4" />
                  Leave Group
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Join Group
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// Loading skeleton for groups
const GroupSkeleton = memo(function GroupSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className="h-32 bg-gray-200 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="h-10 bg-gray-200 rounded animate-pulse w-full mt-4" />
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
        <Users className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900">No groups yet</h3>
      <p className="text-gray-500 mt-1 max-w-sm">
        Create a group to connect with people who share your interests
      </p>
    </motion.div>
  );
});

/**
 * GroupsList Component
 *
 * Displays a grid of group cards with join/leave functionality.
 * Uses Framer Motion for smooth animations and transitions.
 *
 * @example
 * <GroupsList
 *   groups={groups}
 *   onJoin={(id) => handleJoin(id)}
 *   onLeave={(id) => handleLeave(id)}
 * />
 */
export const GroupsList = memo(function GroupsList({
  groups,
  onJoin,
  onLeave,
  className,
  isLoading = false,
}: GroupsListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <GroupSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (groups.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      <AnimatePresence mode="popLayout">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onJoin={onJoin}
            onLeave={onLeave}
            isProcessing={processingId}
            onProcessingChange={setProcessingId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

export default GroupsList;
