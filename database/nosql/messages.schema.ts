/**
 * =====================================================
 * MongoDB/Cassandra Messages Schema
 * Facebook Clone Enterprise Architecture
 * =====================================================
 * 
 * This schema supports both MongoDB and Cassandra patterns
 * for high-volume messaging with real-time delivery.
 */

// =====================================================
// MONGODB SCHEMAS
// =====================================================

/**
 * Conversations Collection
 * Stores conversation metadata and participant info
 */
interface Conversation {
  _id: ObjectId;
  
  // Conversation identification
  conversationId: string;
  type: 'direct' | 'group' | 'page';
  
  // Participants
  participants: Array<{
    userId: string;
    role: 'member' | 'admin' | 'owner';
    joinedAt: Date;
    lastReadAt: Date;
    unreadCount: number;
    mutedUntil: Date | null;
    archived: boolean;
    nickname?: string;
  }>;
  
  // Group info (for group chats)
  groupInfo?: {
    name: string;
    avatar?: string;
    description?: string;
    createdBy: string;
    maxParticipants: number;
  };
  
  // Last message preview
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    sentAt: Date;
    type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker' | 'gif';
  };
  
  // Conversation settings
  settings: {
    allowMessages: boolean;
    allowMedia: boolean;
    disappearingMessages: boolean;
    disappearingTimeout?: number; // seconds
    slowMode: boolean;
    slowModeDelay?: number; // seconds
  };
  
  // Stats
  stats: {
    messageCount: number;
    mediaCount: number;
    activeParticipants: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Indexes
  // { conversationId: 1 } - unique
  // { "participants.userId": 1 } - for user conversations lookup
  // { updatedAt: -1 } - for sorting
  // { "participants.userId": 1, updatedAt: -1 } - compound for user's conversations
}

/**
 * Messages Collection
 * Stores individual messages with full content
 */
interface Message {
  _id: ObjectId;
  
  // Message identification
  messageId: string;
  conversationId: string;
  
  // Sender info
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  
  // Content
  content?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'gif' | 'link' | 'location' | 'contact' | 'reaction' | 'system' | 'deleted';
  
  // Media attachments
  attachments?: Array<{
    id: string;
    type: 'image' | 'video' | 'audio' | 'file' | 'voice';
    url: string;
    thumbnailUrl?: string;
    filename?: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    duration?: number; // for audio/video in seconds
  }>;
  
  // Reply/Thread
  replyTo?: {
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
  };
  
  // Forward info
  forwarded?: {
    fromConversationId: string;
    fromSenderId: string;
    fromSenderName: string;
    forwardedAt: Date;
  };
  
  // Reactions
  reactions?: Array<{
    userId: string;
    emoji: string;
    reactedAt: Date;
  }>;
  
  // Delivery status per participant
  deliveryStatus: Array<{
    userId: string;
    status: 'sent' | 'delivered' | 'read';
    timestamp: Date;
  }>;
  
  // Encryption (for E2E encrypted chats)
  encrypted?: {
    algorithm: string;
    keyId: string;
    iv: string;
    encryptedContent: string;
  };
  
  // Metadata
  metadata?: {
    clientMessageId?: string; // for deduplication
    platform?: string;
    device?: string;
    editedAt?: Date;
    editHistory?: Array<{
      content: string;
      editedAt: Date;
    }>;
  };
  
  // Status
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
  deletedFor?: string[]; // userIds who deleted this message
  deletedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // TTL for disappearing messages
  expiresAt?: Date;
  
  // Indexes
  // { conversationId: 1, createdAt: -1 } - for fetching messages
  // { messageId: 1 } - unique
  // { senderId: 1, createdAt: -1 } - for user's sent messages
  // { expiresAt: 1 } - TTL index for disappearing messages
  // { "deliveryStatus.userId": 1, "deliveryStatus.status": 1 } - for delivery tracking
}

/**
 * Message Read Receipts Collection
 * Tracks read status for large groups efficiently
 */
interface MessageReadReceipt {
  _id: ObjectId;
  
  conversationId: string;
  messageId: string;
  userId: string;
  
  readAt: Date;
  
  // Indexes
  // { conversationId: 1, messageId: 1, userId: 1 } - unique
  // { conversationId: 1, userId: 1, readAt: -1 }
}

/**
 * Typing Indicators Collection
 * Real-time typing status (short TTL)
 */
interface TypingIndicator {
  _id: ObjectId;
  
  conversationId: string;
  userId: string;
  userName: string;
  
  isTyping: boolean;
  updatedAt: Date;
  
  // TTL - expires after 10 seconds
  expiresAt: Date;
  
  // Indexes
  // { conversationId: 1, userId: 1 } - unique
  // { expiresAt: 1 } - TTL index
}

// =====================================================
// CASSANDRA SCHEMAS
// =====================================================

/**
 * Messages by Conversation Table (Cassandra)
 * Optimized for fetching messages in a conversation
 */
const cassandraMessagesByConversation = `
CREATE TABLE IF NOT EXISTS messages_by_conversation (
    conversation_id UUID,
    created_at TIMESTAMP,
    message_id UUID,
    sender_id UUID,
    sender_name TEXT,
    content TEXT,
    message_type TEXT,
    attachments LIST<FROZEN<attachment_type>>,
    reply_to_message_id UUID,
    reply_to_content TEXT,
    reply_to_sender_id UUID,
    reply_to_sender_name TEXT,
    reactions LIST<FROZEN<reaction_type>>,
    status TEXT,
    deleted_at TIMESTAMP,
    PRIMARY KEY (conversation_id, created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC, message_id ASC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy'}
  AND default_time_to_live = 31536000;
`;

/**
 * Conversations by User Table (Cassandra)
 * Optimized for fetching user's conversations
 */
const cassandraConversationsByUser = `
CREATE TABLE IF NOT EXISTS conversations_by_user (
    user_id UUID,
    last_message_at TIMESTAMP,
    conversation_id UUID,
    conversation_type TEXT,
    other_participant_ids LIST<UUID>,
    last_message_content TEXT,
    last_message_sender_id UUID,
    last_message_sender_name TEXT,
    unread_count INT,
    is_muted BOOLEAN,
    is_archived BOOLEAN,
    PRIMARY KEY (user_id, last_message_at, conversation_id)
) WITH CLUSTERING ORDER BY (last_message_at DESC, conversation_id ASC)
  AND default_time_to_live = 31536000;
`;

/**
 * Message Delivery Status Table (Cassandra)
 * Track delivery status for each message/participant
 */
const cassandraMessageDelivery = `
CREATE TABLE IF NOT EXISTS message_delivery_status (
    message_id UUID,
    user_id UUID,
    status TEXT,
    status_at TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);
`;

/**
 * Unread Counts Table (Cassandra)
 * Fast unread count lookups
 */
const cassandraUnreadCounts = `
CREATE TABLE IF NOT EXISTS unread_counts (
    user_id UUID,
    conversation_id UUID,
    unread_count COUNTER,
    PRIMARY KEY (user_id, conversation_id)
);
`;

// =====================================================
// USER-DEFINED TYPES (Cassandra)
// =====================================================

const cassandraUDTs = `
-- Attachment type
CREATE TYPE IF NOT EXISTS attachment_type (
    id UUID,
    attachment_type TEXT,
    url TEXT,
    thumbnail_url TEXT,
    filename TEXT,
    mime_type TEXT,
    size BIGINT,
    width INT,
    height INT,
    duration INT
);

-- Reaction type
CREATE TYPE IF NOT EXISTS reaction_type (
    user_id UUID,
    emoji TEXT,
    reacted_at TIMESTAMP
);
`;

// =====================================================
// INDEXES (Cassandra)
// =====================================================

const cassandraIndexes = `
-- Secondary indexes for specific lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages_by_conversation (sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations_by_user (conversation_type);
`;

// =====================================================
// MONGODB SCHEMA VALIDATION
// =====================================================

const mongodbSchemaValidation = `
db.createCollection("conversations", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["conversationId", "type", "participants"],
         properties: {
            conversationId: { bsonType: "string" },
            type: { enum: ["direct", "group", "page"] },
            participants: {
               bsonType: "array",
               items: {
                  bsonType: "object",
                  required: ["userId", "role", "joinedAt"],
                  properties: {
                     userId: { bsonType: "string" },
                     role: { enum: ["member", "admin", "owner"] },
                     joinedAt: { bsonType: "date" },
                     lastReadAt: { bsonType: "date" },
                     unreadCount: { bsonType: "int" },
                     mutedUntil: { bsonType: ["date", "null"] },
                     archived: { bsonType: "bool" }
                  }
               }
            }
         }
      }
   }
});

db.createCollection("messages", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["messageId", "conversationId", "senderId", "type", "status"],
         properties: {
            messageId: { bsonType: "string" },
            conversationId: { bsonType: "string" },
            senderId: { bsonType: "string" },
            type: { 
               enum: ["text", "image", "video", "audio", "file", "sticker", "gif", "link", "location", "contact", "reaction", "system", "deleted"]
            },
            status: { 
               enum: ["pending", "sent", "delivered", "read", "failed", "deleted"]
            },
            createdAt: { bsonType: "date" }
         }
      }
   }
});
`;

export {
  Conversation,
  Message,
  MessageReadReceipt,
  TypingIndicator,
  cassandraMessagesByConversation,
  cassandraConversationsByUser,
  cassandraMessageDelivery,
  cassandraUnreadCounts,
  cassandraUDTs,
  cassandraIndexes,
  mongodbSchemaValidation,
};
