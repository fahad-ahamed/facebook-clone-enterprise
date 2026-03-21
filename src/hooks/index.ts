// Export all hooks from one place
// Makes importing cleaner

export { useAuth } from './useAuth';
export { usePosts } from './usePosts';
export { useFriends } from './useFriends';
export { useNotifications } from './useNotifications';

// Re-export existing hooks
export { useToast } from './use-toast';
export { useIsMobile } from './use-mobile';
