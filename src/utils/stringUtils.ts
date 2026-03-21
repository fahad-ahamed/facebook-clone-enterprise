// String and number helpers
// Updated: Mar 2024

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Get initials from first and last name
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return (first + last).toUpperCase();
}

/**
 * Get full name from first and last name
 */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Format file size in bytes to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get emoji for reaction type
 */
export function getReactionEmoji(type: string): string {
  const reactions: Record<string, string> = {
    like: '👍',
    love: '❤️',
    haha: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡',
    care: '🤗',
  };
  return reactions[type] || '👍';
}

/**
 * Convert text to URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

/**
 * Capitalize first letter of text
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Get plural form of word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || singular + 's');
}
