// Friend requests panel - shows incoming friend requests
// Supports accept/reject with mutual friends display

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserPlus,
  X,
  Check,
  Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import type { User } from '@/types';

// Friend request interface
export interface FriendRequestItem {
  id: string;
  user: User;
  mutualFriends: number;
  createdAt?: string;
}

interface FriendRequestsProps {
  requests: FriendRequestItem[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  loading?: boolean;
  maxDisplay?: number;
}

// Single request card
function RequestCard({
  request,
  onAccept,
  onReject,
  loading,
}: {
  request: FriendRequestItem;
  onAccept: () => void;
  onReject: () => void;
  loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
    >
      {/* User avatar */}
      <Avatar className="w-14 h-14 flex-shrink-0">
        <AvatarImage src={request.user.avatar} />
        <AvatarFallback className="bg-gray-200 text-lg">
          {getInitials(request.user.firstName, request.user.lastName)}
        </AvatarFallback>
      </Avatar>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-semibold text-sm">
            {request.user.firstName} {request.user.lastName}
          </h4>

          {/* Verified badge */}
          {request.user.isVerified && request.user.badgeType && (
            <span
              className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                request.user.badgeType === 'blue'
                  ? "bg-blue-500"
                  : request.user.badgeType === 'gold'
                  ? "bg-yellow-500"
                  : "bg-gray-500"
              )}
            >
              <Check className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </div>

        {/* Mutual friends */}
        {request.mutualFriends > 0 ? (
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
            <Users className="w-3 h-3" />
            <span>
              {request.mutualFriends} mutual friend{request.mutualFriends !== 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <p className="text-gray-400 text-xs mt-0.5">No mutual friends</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1 bg-[#1877F2] hover:bg-[#166FE5]"
            onClick={onAccept}
            disabled={loading}
          >
            <Check className="w-4 h-4 mr-1" />
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onReject}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function FriendRequests({
  requests,
  onAccept,
  onReject,
  loading,
  maxDisplay,
}: FriendRequestsProps) {
  const displayRequests = maxDisplay ? requests.slice(0, maxDisplay) : requests;
  const remainingCount = requests.length - (maxDisplay || 0);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <UserPlus className="w-8 h-8 text-gray-400" />
        </div>
        <h4 className="font-semibold text-gray-700">No Friend Requests</h4>
        <p className="text-gray-500 text-sm text-center mt-1">
          When someone sends you a friend request, it'll appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-lg font-bold">Friend Requests</h3>
        {requests.length > 0 && (
          <span className="text-sm text-gray-500">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Requests list */}
      <ScrollArea className="max-h-[400px]">
        <AnimatePresence>
          {displayRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onAccept={() => onAccept(request.id)}
              onReject={() => onReject(request.id)}
              loading={loading}
            />
          ))}
        </AnimatePresence>
      </ScrollArea>

      {/* Show more */}
      {maxDisplay && remainingCount > 0 && (
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full text-sm text-blue-500">
            See All Requests ({remainingCount} more)
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact friend request preview for dropdowns
interface FriendRequestPreviewProps {
  requests: FriendRequestItem[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onViewAll?: () => void;
}

export function FriendRequestPreview({
  requests,
  onAccept,
  onReject,
  onViewAll,
}: FriendRequestPreviewProps) {
  if (requests.length === 0) return null;

  const latestRequest = requests[0];

  return (
    <div className="p-3 bg-blue-50 rounded-lg mx-2 mb-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={latestRequest.user.avatar} />
            <AvatarFallback className="bg-gray-200 text-sm">
              {getInitials(latestRequest.user.firstName, latestRequest.user.lastName)}
            </AvatarFallback>
          </Avatar>

          {/* Multiple avatars if more requests */}
          {requests.length > 1 && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm text-xs font-bold text-gray-600">
              +{requests.length - 1}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {latestRequest.user.firstName} sent you a friend request
            {requests.length > 1 && ` and ${requests.length - 1} more`}
          </p>

          <div className="flex gap-2 mt-1.5">
            <Button
              size="sm"
              className="h-7 text-xs bg-[#1877F2] hover:bg-[#166FE5]"
              onClick={() => onAccept(latestRequest.id)}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onReject(latestRequest.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {requests.length > 1 && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full text-center text-xs text-blue-600 hover:underline mt-2"
        >
          View all requests
        </button>
      )}
    </div>
  );
}
