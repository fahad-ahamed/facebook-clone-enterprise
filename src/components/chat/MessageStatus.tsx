'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Check, 
  CheckCheck, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/utils/cn';

type MessageStatusType = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusProps {
  /** Current status of the message */
  status: MessageStatusType;
  /** Whether the message was sent by the current user */
  isOwn: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * MessageStatus component shows the delivery status of a message
 * with appropriate icons and colors for each status state.
 */
export const MessageStatus = memo(function MessageStatus({ 
  status, 
  isOwn,
  className 
}: MessageStatusProps) {
  // Don't show status for other people's messages
  if (!isOwn) return null;

  const statusConfig: Record<MessageStatusType, {
    icon: React.ReactNode;
    color: string;
    label: string;
  }> = {
    sending: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      color: 'text-gray-400',
      label: 'Sending...'
    },
    sent: {
      icon: <Check className="w-3.5 h-3.5" />,
      color: 'text-gray-400',
      label: 'Sent'
    },
    delivered: {
      icon: <CheckCheck className="w-3.5 h-3.5" />,
      color: 'text-gray-400',
      label: 'Delivered'
    },
    read: {
      icon: <CheckCheck className="w-3.5 h-3.5" />,
      color: 'text-blue-500',
      label: 'Read'
    },
    failed: {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      color: 'text-red-500',
      label: 'Failed to send'
    }
  };

  const config = statusConfig[status];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn('flex items-center gap-0.5', config.color, className)}
        title={config.label}
      >
        {config.icon}
      </motion.div>
    </AnimatePresence>
  );
});

export default MessageStatus;
