/**
 * Chat SDK
 * Real-time messaging service client
 * @module shared/sdk/chat-sdk
 */

import { HttpClient } from './base-client';
import {
  ConversationResponse,
  MessageResponse,
  UserResponse,
  ApiResponse,
  PaginatedResult,
} from './types';

/**
 * Chat SDK configuration
 */
export interface ChatSdkConfig {
  /** Base URL for chat service */
  baseUrl: string;
  /** WebSocket URL */
  wsUrl?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Create conversation data
 */
export interface CreateConversationData {
  /** Participant IDs */
  participantIds: string[];
  /** Group name (for group conversations) */
  name?: string;
  /** Initial message */
  initialMessage?: string;
}

/**
 * Send message data
 */
export interface SendMessageData {
  /** Message content */
  content?: string;
  /** Message type */
  messageType: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker' | 'gif';
  /** Media URL */
  mediaUrl?: string;
  /** File name */
  fileName?: string;
  /** File size */
  fileSize?: number;
  /** Voice duration in seconds */
  voiceDuration?: number;
  /** Reply to message ID */
  replyTo?: string;
}

/**
 * Conversation update data
 */
export interface UpdateConversationData {
  /** New name */
  name?: string;
  /** Add participants */
  addParticipants?: string[];
  /** Remove participants */
  removeParticipants?: string[];
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

/**
 * Call data
 */
export interface CallData {
  callId: string;
  conversationId: string;
  callerId: string;
  caller: UserResponse;
  type: 'audio' | 'video';
  status: 'ringing' | 'answered' | 'declined' | 'ended' | 'missed';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

/**
 * Chat SDK client
 */
export class ChatSdk {
  private client: HttpClient;
  private wsUrl?: string;
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: ChatSdkConfig) {
    this.client = new HttpClient({
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    });
    this.wsUrl = config.wsUrl;
  }

  /**
   * Set access token
   */
  setAccessToken(token: string | null): void {
    this.client.setAccessToken(token);
    if (token && this.wsUrl) {
      this.connectWebSocket(token);
    }
  }

  /**
   * Connect to WebSocket
   */
  private connectWebSocket(token: string): void {
    if (typeof window === 'undefined' || !this.wsUrl) return;

    const wsUrl = `${this.wsUrl}?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Chat] WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('[Chat] Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[Chat] WebSocket disconnected');
        this.attemptReconnect(token);
      };

      this.ws.onerror = (error) => {
        console.error('[Chat] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[Chat] Failed to connect WebSocket:', error);
    }
  }

  /**
   * Attempt WebSocket reconnection
   */
  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Chat] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      this.connectWebSocket(token);
    }, delay);
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(data: { type: string; payload: unknown }): void {
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach((handler) => handler(data.payload));
    }

    // Also trigger wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(event: string, handler: (data: unknown) => void): () => void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    this.messageHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Send WebSocket message
   */
  private sendWsMessage(type: string, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<ApiResponse<ConversationResponse[]>> {
    return this.client.get<ConversationResponse[]>('/api/conversations');
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<ApiResponse<ConversationResponse>> {
    return this.client.get<ConversationResponse>(`/api/conversations/${conversationId}`);
  }

  /**
   * Create new conversation
   */
  async createConversation(data: CreateConversationData): Promise<ApiResponse<ConversationResponse>> {
    return this.client.post<ConversationResponse>('/api/conversations', data);
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    data: UpdateConversationData
  ): Promise<ApiResponse<ConversationResponse>> {
    return this.client.put<ConversationResponse>(`/api/conversations/${conversationId}`, data);
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>(`/api/conversations/${conversationId}`);
  }

  /**
   * Leave conversation
   */
  async leaveConversation(conversationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>(`/api/conversations/${conversationId}`);
  }

  /**
   * Get messages for conversation
   */
  async getMessages(
    conversationId: string,
    params?: { cursor?: string; limit?: number }
  ): Promise<ApiResponse<PaginatedResult<MessageResponse>>> {
    return this.client.get<PaginatedResult<MessageResponse>>(
      `/api/conversations/${conversationId}/messages`,
      params
    );
  }

  /**
   * Send message
   */
  async sendMessage(
    conversationId: string,
    data: SendMessageData
  ): Promise<ApiResponse<MessageResponse>> {
    const response = await this.client.post<MessageResponse>(
      `/api/conversations/${conversationId}/messages`,
      data
    );

    // Also send via WebSocket for real-time
    if (response.success && response.data) {
      this.sendWsMessage('message', {
        conversationId,
        message: response.data,
      });
    }

    return response;
  }

  /**
   * Delete message
   */
  async deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<{ message: string }>(
      `/api/conversations/${conversationId}/messages/${messageId}`
    );
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>(
      `/api/conversations/${conversationId}/read`
    );
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    this.sendWsMessage('typing', { conversationId, isTyping });
  }

  /**
   * Start call
   */
  async startCall(
    conversationId: string,
    type: 'audio' | 'video'
  ): Promise<ApiResponse<CallData>> {
    return this.client.post<CallData>(`/api/conversations/${conversationId}/call`, { type });
  }

  /**
   * Answer call
   */
  async answerCall(callId: string): Promise<ApiResponse<CallData>> {
    return this.client.post<CallData>(`/api/calls/${callId}/answer`);
  }

  /**
   * Decline call
   */
  async declineCall(callId: string): Promise<ApiResponse<CallData>> {
    return this.client.post<CallData>(`/api/calls/${callId}/decline`);
  }

  /**
   * End call
   */
  async endCall(callId: string): Promise<ApiResponse<CallData>> {
    return this.client.post<CallData>(`/api/calls/${callId}/end`);
  }

  /**
   * Get or create direct conversation with user
   */
  async getOrCreateDirectConversation(userId: string): Promise<ApiResponse<ConversationResponse>> {
    return this.client.post<ConversationResponse>('/api/conversations/direct', { userId });
  }

  /**
   * Search messages
   */
  async searchMessages(
    query: string,
    conversationId?: string
  ): Promise<ApiResponse<MessageResponse[]>> {
    return this.client.get<MessageResponse[]>('/api/messages/search', {
      q: query,
      conversationId,
    });
  }

  /**
   * Forward message
   */
  async forwardMessage(
    messageId: string,
    conversationIds: string[]
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.post<{ message: string }>('/api/messages/forward', {
      messageId,
      conversationIds,
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }
}

/**
 * Create Chat SDK instance
 */
export function createChatSdk(config: ChatSdkConfig): ChatSdk {
  return new ChatSdk(config);
}

/**
 * Default Chat SDK instance
 */
export const chatSdk = createChatSdk({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL,
});

export default {
  ChatSdk,
  createChatSdk,
  chatSdk,
};
