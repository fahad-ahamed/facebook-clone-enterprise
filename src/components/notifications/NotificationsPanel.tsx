// Notifications panel dropdown - shows all notification types
// Supports mark all as read and individual notification actions

'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  AtSign,
  ThumbsUp,
  Smile,
  Check,
  Settings,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import { formatTimeAgo } from '@/utils/dateUtils';
import type { Notification, User } from '@/types';

// Extended notification type for internal use
interface NotificationItem extends Notification {
  actor?: User;
  postId?: string;
  commentId?: string;
}

interface NotificationsPanelProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (notificationId?: string) => void;
  onNotificationClick: (notification: NotificationItem) => void;
}

// Get icon and color based on notification type
function getNotificationIcon(type: string): { icon: React.ReactNode; bgColor: string } {
  switch (type) {
    case 'like':
      return {
        icon: <ThumbsUp className="w-3 h-3" />,
        bgColor: 'bg-blue-500',
      };
    case 'love':
    case 'reaction':
      return {
        icon: <Heart className="w-3 h-3" />,
        bgColor: 'bg-red-500',
      };
    case 'comment':
      return {
        icon: <MessageCircle className="w-3 h-3" />,
        bgColor: 'bg-green-500',
      };
    case 'share':
      return {
        icon: <Share2 className="w-3 h-3" />,
        bgColor: 'bg-purple-500',
      };
    case 'friend_request':
      return {
        icon: <UserPlus className="w-3 h-3" />,
        bgColor: 'bg-blue-500',
      };
    case 'mention':
      return {
        icon: <AtSign className="w-3 h-3" />,
        bgColor: 'bg-orange-500',
      };
    case 'haha':
    case 'wow':
    case 'sad':
    case 'angry':
      return {
        icon: <Smile className="w-3 h-3" />,
        bgColor: 'bg-yellow-500',
      };
    default:
      return {
        icon: <Bell className="w-3 h-3" />,
        bgColor: 'bg-gray-500',
      };
  }
}

// Single notification item component
function NotificationCard({
  notification,
  onClick,
  onMarkAsRead,
}: {
  notification: NotificationItem;
  onClick: () => void;
  onMarkAsRead: () => void;
}) {
  const { icon, bgColor } = getNotificationIcon(notification.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        "relative flex items-start gap-3 p-3 cursor-pointer transition-colors",
        "hover:bg-gray-50 rounded-lg mx-2",
        !notification.isRead && "bg-blue-50/50"
      )}
      onClick={onClick}
    >
      {/* Avatar with type indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={notification.actor?.avatar || notification.image} />
          <AvatarFallback className="bg-gray-200 text-sm">
            {notification.actor
              ? getInitials(notification.actor.firstName, notification.actor.lastName)
              : '?'}
          </AvatarFallback>
        </Avatar>

        {/* Type indicator badge */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
            bgColor
          )}
        >
          <span className="text-white">{icon}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-tight",
            !notification.isRead && "font-semibold"
          )}
        >
          {notification.message}
        </p>

        <p className="text-xs text-gray-500 mt-1">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Unread indicator & actions */}
      <div className="flex flex-col items-center gap-1">
        {!notification.isRead && (
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
        )}

        {/* Mark as read button */}
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function NotificationsPanel({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onNotificationClick,
}: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Count unread
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-12 w-[360px] bg-white rounded-xl shadow-xl border overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-xl font-bold">Notifications</h3>

            <div className="flex items-center gap-1">
              {/* Mark all as read */}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-500 hover:text-blue-600"
                  onClick={() => onMarkAsRead()}
                >
                  Mark all as read
                </Button>
              )}

              {/* Settings button */}
              <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <Settings className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-center">
                No notifications yet
              </p>
              <p className="text-gray-400 text-sm text-center mt-1">
                We'll let you know when something arrives
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[480px]">
              {/* New notifications section */}
              {unreadCount > 0 && (
                <div className="py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase px-4 py-2">
                    New ({unreadCount})
                  </p>

                  {notifications
                    .filter((n) => !n.isRead)
                    .map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => onNotificationClick(notification)}
                        onMarkAsRead={() => onMarkAsRead(notification.id)}
                      />
                    ))}
                </div>
              )}

              {/* Earlier notifications section */}
              {notifications.some((n) => n.isRead) && (
                <div className="py-2">
                  {unreadCount > 0 && (
                    <p className="text-xs font-semibold text-gray-500 uppercase px-4 py-2">
                      Earlier
                    </p>
                  )}

                  {notifications
                    .filter((n) => n.isRead)
                    .map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onClick={() => onNotificationClick(notification)}
                        onMarkAsRead={() => onMarkAsRead(notification.id)}
                      />
                    ))}
                </div>
              )}
            </ScrollArea>
          )}

          {/* See all button */}
          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                className="w-full text-sm text-blue-500 hover:bg-gray-50"
              >
                See All Notifications
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Notification badge component - can be used in navbar
interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1",
        "bg-red-500 text-white text-xs font-bold rounded-full",
        "flex items-center justify-center",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
