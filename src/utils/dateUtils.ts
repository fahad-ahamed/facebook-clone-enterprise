// Date formatting helpers
// I find myself using these a lot so made a separate file

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  // Just now
  if (diffInSeconds < 60) return 'just now';
  
  // Minutes
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return mins === 1 ? '1m ago' : `${mins}m ago`;
  }
  
  // Hours
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return hours === 1 ? '1h ago' : `${hours}h ago`;
  }
  
  // Days
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return days === 1 ? '1d ago' : `${days}d ago`;
  }
  
  // Weeks
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return weeks === 1 ? '1w ago' : `${weeks}w ago`;
  }
  
  // Months
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return months === 1 ? '1mo ago' : `${months}mo ago`;
  }
  
  // Years
  const years = Math.floor(diffInSeconds / 31536000);
  return years === 1 ? '1y ago' : `${years}y ago`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// For chat messages - show time or date based on how recent
export function formatMessageTime(date: Date | string): string {
  const msgDate = new Date(date);
  const now = new Date();
  const diffInHours = (now.getTime() - msgDate.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return formatTime(date);
  }
  return formatDate(date);
}

// Helper for relative dates like "Today", "Yesterday", etc.
export function formatRelativeDate(date: Date | string): string {
  const msgDate = new Date(date);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return formatDate(date);
}
