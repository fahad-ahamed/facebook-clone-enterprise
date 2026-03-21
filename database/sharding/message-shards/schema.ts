/**
 * Message Data Sharding Schema
 * Partitioning strategy for chat messages
 */

// =====================================================
// Message Shard Schema (MongoDB)
// =====================================================

export const MESSAGE_SHARD_SCHEMA = `
// Messages Collection Schema (sharded by conversationId)
db.createCollection("messages", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["conversationId", "senderId", "createdAt"],
         properties: {
            _id: { bsonType: "objectId" },
            conversationId: { bsonType: "string" },
            senderId: { bsonType: "string" },
            content: { bsonType: "string" },
            media: {
               bsonType: "array",
               items: {
                  bsonType: "object",
                  properties: {
                     type: { bsonType: "string" },
                     url: { bsonType: "string" },
                     thumbnail: { bsonType: "string" },
                     width: { bsonType: "int" },
                     height: { bsonType: "int" }
                  }
               }
            },
            replyTo: { bsonType: "string" },
            reactions: {
               bsonType: "array",
               items: {
                  bsonType: "object",
                  properties: {
                     userId: { bsonType: "string" },
                     type: { bsonType: "string" },
                     createdAt: { bsonType: "date" }
                  }
               }
            },
            readBy: {
               bsonType: "array",
               items: { bsonType: "string" }
            },
            deliveredTo: {
               bsonType: "array",
               items: { bsonType: "string" }
            },
            isEdited: { bsonType: "bool" },
            isDeleted: { bsonType: "bool" },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
         }
      }
   }
});

// Sharding key
sh.shardCollection("facebook_messages.messages", { "conversationId": 1, "createdAt": 1 });

// Indexes
db.messages.createIndex({ conversationId: 1, createdAt: -1 });
db.messages.createIndex({ senderId: 1, createdAt: -1 });
db.messages.createIndex({ "readBy": 1 });
db.messages.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // TTL: 1 year
`;

// =====================================================
// Conversation Shard Schema
// =====================================================

export const CONVERSATION_SHARD_SCHEMA = `
// Conversations Collection Schema
db.createCollection("conversations", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["participants", "type", "createdAt"],
         properties: {
            _id: { bsonType: "objectId" },
            type: { bsonType: "string", enum: ["private", "group"] },
            participants: {
               bsonType: "array",
               items: { bsonType: "string" }
            },
            name: { bsonType: "string" },
            avatar: { bsonType: "string" },
            admins: {
               bsonType: "array",
               items: { bsonType: "string" }
            },
            lastMessage: {
               bsonType: "object",
               properties: {
                  id: { bsonType: "string" },
                  content: { bsonType: "string" },
                  senderId: { bsonType: "string" },
                  createdAt: { bsonType: "date" }
               }
            },
            unreadCount: {
               bsonType: "object",
               additionalProperties: { bsonType: "int" }
            },
            settings: {
               bsonType: "object",
               properties: {
                  muted: {
                     bsonType: "array",
                     items: { bsonType: "string" }
                  },
                  pinned: {
                     bsonType: "array",
                     items: { bsonType: "string" }
                  }
               }
            },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
         }
      }
   }
});

// For private conversations, shard by first participant for locality
sh.shardCollection("facebook_messages.conversations", { "participants.0": 1 });

// Indexes
db.conversations.createIndex({ participants: 1 });
db.conversations.createIndex({ "participants.0": 1, "participants.1": 1 });
db.conversations.createIndex({ updatedAt: -1 });
`;

// =====================================================
// Message Queries
// =====================================================

export const MESSAGE_QUERIES = {
  /**
   * Get messages for a conversation
   */
  getMessages: `
    db.messages.find({ 
      conversationId: conversationId,
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
  `,
  
  /**
   * Insert new message
   */
  insertMessage: `
    db.messages.insertOne({
      conversationId: conversationId,
      senderId: senderId,
      content: content,
      media: media,
      createdAt: new Date(),
      readBy: [senderId],
      deliveredTo: [senderId],
      isEdited: false,
      isDeleted: false
    })
  `,
  
  /**
   * Mark messages as read
   */
  markAsRead: `
    db.messages.updateMany(
      { 
        conversationId: conversationId,
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    )
  `,
  
  /**
   * Get unread count for user
   */
  getUnreadCount: `
    db.messages.countDocuments({
      conversationId: conversationId,
      readBy: { $ne: userId }
    })
  `,
};

// =====================================================
// Shard Router for Messages
// =====================================================

export class MessageShardRouter {
  private shardCount: number;

  constructor(shardCount: number = 3) {
    this.shardCount = shardCount;
  }

  /**
   * Get shard for conversation
   */
  getShard(conversationId: string): number {
    let hash = 0;
    for (let i = 0; i < conversationId.length; i++) {
      const char = conversationId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % this.shardCount;
  }

  /**
   * Get connection string for shard
   */
  getConnectionString(shardId: number): string {
    const hosts = [
      process.env.MESSAGE_SHARD_0_HOST || 'localhost:27017',
      process.env.MESSAGE_SHARD_1_HOST || 'localhost:27018',
      process.env.MESSAGE_SHARD_2_HOST || 'localhost:27019',
    ];
    
    return `mongodb://${hosts[shardId]}/facebook_messages_${shardId}`;
  }

  /**
   * Execute query on correct shard
   */
  async executeOnShard<T>(
    conversationId: string,
    query: (connectionString: string) => Promise<T>
  ): Promise<T> {
    const shardId = this.getShard(conversationId);
    const connectionString = this.getConnectionString(shardId);
    return query(connectionString);
  }
}

export default {
  MESSAGE_SHARD_SCHEMA,
  CONVERSATION_SHARD_SCHEMA,
  MESSAGE_QUERIES,
  MessageShardRouter,
};
