/**
 * Chat components for the Facebook clone messaging system.
 * These components handle real-time messaging, calls, and media sharing.
 */

// Message status indicator
export { MessageStatus } from './MessageStatus';

// Audio and video call UI
export { CallUI } from './CallUI';

// File attachment preview
export { FilePreview } from './FilePreview';

// Voice message playback
export { VoiceMessagePlayer } from './VoiceMessagePlayer';

// Main chat view with full messaging functionality
export { ChatView } from './ChatView';

// Type exports for external use
export type { default as MessageStatusComponent } from './MessageStatus';
export type { default as CallUIComponent } from './CallUI';
export type { default as FilePreviewComponent } from './FilePreview';
export type { default as VoiceMessagePlayerComponent } from './VoiceMessagePlayer';
export type { default as ChatViewComponent } from './ChatView';
