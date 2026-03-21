/**
 * GraphQL Resolvers
 *
 * Contains all resolvers for the Facebook Clone GraphQL API.
 * Includes query, mutation, and subscription resolvers.
 *
 * @module gateway/graphql/resolvers
 */

import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import { PubSub } from 'graphql-subscriptions';

// Create PubSub instance for subscriptions
export const pubsub = new PubSub();

// Subscription event names
export const SUBSCRIPTION_EVENTS = {
  USER_UPDATED: 'USER_UPDATED',
  USER_ONLINE_STATUS_CHANGED: 'USER_ONLINE_STATUS_CHANGED',
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  POST_DELETED: 'POST_DELETED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  TYPING_INDICATOR: 'TYPING_INDICATOR',
  NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',
  REACTION_ADDED: 'REACTION_ADDED',
  REACTION_REMOVED: 'REACTION_REMOVED',
  FEED_UPDATED: 'FEED_UPDATED'
};

// Custom scalar resolvers
const scalarResolvers = {
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO 8601 date-time string',
    parseValue(value: any) {
      return new Date(value);
    },
    serialize(value: any) {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    parseLiteral(ast: ValueNode) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value);
      }
      return null;
    }
  }),

  JSON: new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON object',
    parseValue(value: any) {
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    serialize(value: any) {
      return value;
    },
    parseLiteral(ast: ValueNode) {
      if (ast.kind === Kind.STRING) {
        return JSON.parse(ast.value);
      }
      return null;
    }
  }),

  Email: new GraphQLScalarType({
    name: 'Email',
    description: 'Email address string',
    parseValue(value: any) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Invalid email format');
      }
      return value.toLowerCase();
    },
    serialize(value: any) {
      return value;
    },
    parseLiteral(ast: ValueNode) {
      if (ast.kind === Kind.STRING) {
        return ast.value.toLowerCase();
      }
      return null;
    }
  }),

  URL: new GraphQLScalarType({
    name: 'URL',
    description: 'URL string',
    parseValue(value: any) {
      try {
        new URL(value);
        return value;
      } catch {
        throw new Error('Invalid URL format');
      }
    },
    serialize(value: any) {
      return value;
    },
    parseLiteral(ast: ValueNode) {
      if (ast.kind === Kind.STRING) {
        return ast.value;
      }
      return null;
    }
  }),

  Upload: new GraphQLScalarType({
    name: 'Upload',
    description: 'File upload',
    parseValue(value: any) {
      return value;
    },
    serialize() {
      throw new Error('Upload scalar cannot be serialized');
    },
    parseLiteral(ast: ValueNode) {
      if (ast.kind === Kind.STRING) {
        return ast.value;
      }
      return null;
    }
  })
};

// Context interface
interface Context {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
  dataSources: {
    userAPI: any;
    postAPI: any;
    feedAPI: any;
  };
}

// Query resolvers
const queryResolvers = {
  Query: {
    // User queries
    me: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.getUser(context.user.userId);
    },

    user: async (_: any, { id, username }: { id?: string; username?: string }, context: Context) => {
      if (id) {
        return context.dataSources.userAPI.getUser(id);
      }
      if (username) {
        return context.dataSources.userAPI.getUserByUsername(username);
      }
      throw new Error('Either id or username is required');
    },

    users: async (_: any, { query, limit = 20, offset = 0 }: any, context: Context) => {
      return context.dataSources.userAPI.getUsers(query, { limit, offset });
    },

    searchUsers: async (_: any, { query, limit = 20 }: { query: string; limit: number }, context: Context) => {
      return context.dataSources.userAPI.searchUsers(query, limit);
    },

    // Post queries
    post: async (_: any, { id }: { id: string }, context: Context) => {
      return context.dataSources.postAPI.getPost(id, context.user?.userId);
    },

    posts: async (_: any, { query, limit = 20, offset = 0 }: any, context: Context) => {
      return context.dataSources.postAPI.getPosts(query, { limit, offset }, context.user?.userId);
    },

    feed: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.feedAPI.getFeed(context.user.userId, input);
    },

    // Comment queries
    comments: async (_: any, { postId, limit = 20, sort }: any, context: Context) => {
      return context.dataSources.postAPI.getComments(postId, { limit, sort });
    },

    // Group queries
    group: async (_: any, { id }: { id: string }, context: Context) => {
      return context.dataSources.userAPI.getGroup(id, context.user?.userId);
    },

    groups: async (_: any, { search, limit = 20 }: { search?: string; limit: number }, context: Context) => {
      return context.dataSources.userAPI.getGroups(search, limit);
    },

    // Page queries
    page: async (_: any, { id, username }: { id?: string; username?: string }, context: Context) => {
      return context.dataSources.userAPI.getPage(id, username);
    },

    pages: async (_: any, { search, limit = 20 }: { search?: string; limit: number }, context: Context) => {
      return context.dataSources.userAPI.getPages(search, limit);
    },

    // Message queries
    conversation: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.getConversation(id, context.user.userId);
    },

    conversations: async (_: any, { limit = 20 }: { limit: number }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.getConversations(context.user.userId, limit);
    },

    messages: async (_: any, { conversationId, limit = 50, before }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.getMessages(conversationId, context.user.userId, { limit, before });
    },

    // Notification queries
    notifications: async (_: any, { type, unreadOnly, limit = 20 }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.getNotifications(context.user.userId, { type, unreadOnly, limit });
    },

    // Search
    search: async (_: any, { query, type, limit = 20 }: any, context: Context) => {
      return context.dataSources.feedAPI.search(query, type, limit, context.user?.userId);
    },

    // Health check
    health: () => ({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  }
};

// Mutation resolvers
const mutationResolvers = {
  Mutation: {
    // Auth mutations
    login: async (_: any, { input }: { input: any }, context: Context) => {
      return context.dataSources.userAPI.login(input);
    },

    register: async (_: any, { input }: { input: any }, context: Context) => {
      return context.dataSources.userAPI.register(input);
    },

    logout: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.logout(context.user.userId);
    },

    refreshTokens: async (_: any, { input }: { input: any }, context: Context) => {
      return context.dataSources.userAPI.refreshTokens(input.refreshToken);
    },

    verifyEmail: async (_: any, { input }: { input: any }, context: Context) => {
      return context.dataSources.userAPI.verifyEmail(input);
    },

    resendVerification: async (_: any, { email }: { email: string }, context: Context) => {
      return context.dataSources.userAPI.resendVerification(email);
    },

    forgotPassword: async (_: any, { input }: { input: any }, context: Context) => {
      return context.dataSources.userAPI.forgotPassword(input.email);
    },

    resetPassword: async (_: any, { input }: { input: any }, context: Context) => {
      return context.dataSources.userAPI.resetPassword(input);
    },

    changePassword: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.changePassword(context.user.userId, input);
    },

    // User mutations
    updateUser: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      const user = await context.dataSources.userAPI.updateUser(context.user.userId, input);
      pubsub.publish(SUBSCRIPTION_EVENTS.USER_UPDATED, { userUpdated: user });
      return user;
    },

    followUser: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.followUser(context.user.userId, userId);
    },

    unfollowUser: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.unfollowUser(context.user.userId, userId);
    },

    blockUser: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.blockUser(context.user.userId, userId);
    },

    unblockUser: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.unblockUser(context.user.userId, userId);
    },

    sendFriendRequest: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.sendFriendRequest(context.user.userId, userId);
    },

    acceptFriendRequest: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.acceptFriendRequest(context.user.userId, userId);
    },

    rejectFriendRequest: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.rejectFriendRequest(context.user.userId, userId);
    },

    unfriend: async (_: any, { userId }: { userId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.unfriend(context.user.userId, userId);
    },

    // Post mutations
    createPost: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      const post = await context.dataSources.postAPI.createPost({
        ...input,
        authorId: context.user.userId
      });

      // Publish subscription event
      pubsub.publish(SUBSCRIPTION_EVENTS.POST_CREATED, { postCreated: post });
      pubsub.publish(SUBSCRIPTION_EVENTS.FEED_UPDATED, {
        feedUpdated: { type: 'NEW_POST', post }
      });

      return post;
    },

    updatePost: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      const post = await context.dataSources.postAPI.updatePost(id, context.user.userId, input);
      pubsub.publish(SUBSCRIPTION_EVENTS.POST_UPDATED, { postUpdated: post });
      return post;
    },

    deletePost: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      await context.dataSources.postAPI.deletePost(id, context.user.userId);
      pubsub.publish(SUBSCRIPTION_EVENTS.POST_DELETED, { postDeleted: id });
      pubsub.publish(SUBSCRIPTION_EVENTS.FEED_UPDATED, {
        feedUpdated: { type: 'POST_DELETED', postId: id }
      });
      return { success: true, message: 'Post deleted successfully' };
    },

    sharePost: async (_: any, { postId, input }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.postAPI.sharePost(postId, context.user.userId, input);
    },

    savePost: async (_: any, { postId, collection }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.savePost(context.user.userId, postId, collection);
    },

    unsavePost: async (_: any, { postId }: { postId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.unsavePost(context.user.userId, postId);
    },

    // Comment mutations
    createComment: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      const comment = await context.dataSources.postAPI.createComment({
        ...input,
        authorId: context.user.userId
      });
      pubsub.publish(SUBSCRIPTION_EVENTS.COMMENT_ADDED, { commentAdded: comment });
      return comment;
    },

    updateComment: async (_: any, { id, input }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.postAPI.updateComment(id, context.user.userId, input);
    },

    deleteComment: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      await context.dataSources.postAPI.deleteComment(id, context.user.userId);
      return { success: true, message: 'Comment deleted successfully' };
    },

    // Reaction mutations
    react: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      const reaction = await context.dataSources.postAPI.react({
        ...input,
        userId: context.user.userId
      });
      pubsub.publish(SUBSCRIPTION_EVENTS.REACTION_ADDED, { reactionAdded: reaction });
      return reaction;
    },

    removeReaction: async (_: any, { targetType, targetId }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      await context.dataSources.postAPI.removeReaction(targetType, targetId, context.user.userId);
      pubsub.publish(SUBSCRIPTION_EVENTS.REACTION_REMOVED, { reactionRemoved: targetId });
      return { success: true, message: 'Reaction removed' };
    },

    // Story mutations
    createStory: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.createStory({
        ...input,
        userId: context.user.userId
      });
    },

    deleteStory: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      await context.dataSources.userAPI.deleteStory(id, context.user.userId);
      return { success: true, message: 'Story deleted successfully' };
    },

    viewStory: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.viewStory(id, context.user.userId);
    },

    // Group mutations
    createGroup: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.createGroup({
        ...input,
        creatorId: context.user.userId
      });
    },

    updateGroup: async (_: any, { id, input }: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.updateGroup(id, context.user.userId, input);
    },

    deleteGroup: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      await context.dataSources.userAPI.deleteGroup(id, context.user.userId);
      return { success: true, message: 'Group deleted successfully' };
    },

    joinGroup: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.joinGroup(id, context.user.userId);
    },

    leaveGroup: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.leaveGroup(id, context.user.userId);
    },

    // Page mutations
    createPage: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.createPage({
        ...input,
        creatorId: context.user.userId
      });
    },

    followPage: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.followPage(id, context.user.userId);
    },

    unfollowPage: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.unfollowPage(id, context.user.userId);
    },

    // Message mutations
    sendMessage: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      const message = await context.dataSources.userAPI.sendMessage({
        ...input,
        senderId: context.user.userId
      });
      pubsub.publish(SUBSCRIPTION_EVENTS.MESSAGE_SENT, { messageSent: message });
      return message;
    },

    createConversation: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.createConversation({
        ...input,
        creatorId: context.user.userId
      });
    },

    markMessagesRead: async (_: any, { conversationId }: { conversationId: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.markMessagesRead(conversationId, context.user.userId);
    },

    // Notification mutations
    markNotificationRead: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.markNotificationRead(id, context.user.userId);
    },

    markAllNotificationsRead: async (_: any, __: any, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.markAllNotificationsRead(context.user.userId);
    },

    // Upload
    uploadFile: async (_: any, { file }: { file: any }, context: Context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.dataSources.userAPI.uploadFile(file, context.user.userId);
    }
  }
};

// Subscription resolvers
const subscriptionResolvers = {
  Subscription: {
    userUpdated: {
      subscribe: (_: any, { userId }: { userId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.USER_UPDATED]);
      }
    },

    userOnlineStatusChanged: {
      subscribe: (_: any, { userId }: { userId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.USER_ONLINE_STATUS_CHANGED]);
      }
    },

    postCreated: {
      subscribe: (_: any, { userId }: { userId?: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.POST_CREATED]);
      }
    },

    postUpdated: {
      subscribe: (_: any, { postId }: { postId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.POST_UPDATED]);
      }
    },

    postDeleted: {
      subscribe: (_: any, { postId }: { postId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.POST_DELETED]);
      }
    },

    commentAdded: {
      subscribe: (_: any, { postId }: { postId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.COMMENT_ADDED]);
      }
    },

    messageSent: {
      subscribe: (_: any, { conversationId }: { conversationId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.MESSAGE_SENT]);
      }
    },

    messageUpdated: {
      subscribe: (_: any, { conversationId }: { conversationId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.MESSAGE_UPDATED]);
      }
    },

    messageDeleted: {
      subscribe: (_: any, { conversationId }: { conversationId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.MESSAGE_DELETED]);
      }
    },

    typingIndicator: {
      subscribe: (_: any, { conversationId }: { conversationId: string }) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.TYPING_INDICATOR]);
      }
    },

    notificationReceived: {
      subscribe: (_: any, __: any, context: Context) => {
        if (!context.user) {
          throw new Error('Not authenticated');
        }
        return pubsub.asyncIterator([`${SUBSCRIPTION_EVENTS.NOTIFICATION_RECEIVED}_${context.user.userId}`]);
      }
    },

    reactionAdded: {
      subscribe: (_: any, { targetType, targetId }: any) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.REACTION_ADDED]);
      }
    },

    reactionRemoved: {
      subscribe: (_: any, { targetType, targetId }: any) => {
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.REACTION_REMOVED]);
      }
    },

    feedUpdated: {
      subscribe: (_: any, __: any, context: Context) => {
        if (!context.user) {
          throw new Error('Not authenticated');
        }
        return pubsub.asyncIterator([SUBSCRIPTION_EVENTS.FEED_UPDATED]);
      }
    }
  }
};

// Type resolvers (field resolvers)
const typeResolvers = {
  User: {
    // These would typically be handled by DataLoader
    followers: async (parent: any, { limit, offset }: any, context: Context) => {
      return context.dataSources.userAPI.getFollowers(parent.id, { limit, offset });
    },
    following: async (parent: any, { limit, offset }: any, context: Context) => {
      return context.dataSources.userAPI.getFollowing(parent.id, { limit, offset });
    },
    friends: async (parent: any, { limit, offset }: any, context: Context) => {
      return context.dataSources.userAPI.getFriends(parent.id, { limit, offset });
    },
    posts: async (parent: any, { limit, offset }: any, context: Context) => {
      return context.dataSources.postAPI.getUserPosts(parent.id, { limit, offset }, context.user?.userId);
    },
    isFollowing: async (parent: any, _: any, context: Context) => {
      if (!context.user) return false;
      return context.dataSources.userAPI.isFollowing(context.user.userId, parent.id);
    },
    isFriend: async (parent: any, _: any, context: Context) => {
      if (!context.user) return false;
      return context.dataSources.userAPI.isFriend(context.user.userId, parent.id);
    },
    isBlocked: async (parent: any, _: any, context: Context) => {
      if (!context.user) return false;
      return context.dataSources.userAPI.isBlocked(context.user.userId, parent.id);
    },
    mutualFriends: async (parent: any, { limit }: any, context: Context) => {
      if (!context.user) return [];
      return context.dataSources.userAPI.getMutualFriends(context.user.userId, parent.id, limit);
    }
  },

  Post: {
    author: async (parent: any, _: any, context: Context) => {
      return context.dataSources.userAPI.getUser(parent.authorId);
    },
    reactions: async (parent: any, { limit }: any, context: Context) => {
      return context.dataSources.postAPI.getReactions(parent.id, limit);
    },
    comments: async (parent: any, { limit, sort }: any, context: Context) => {
      return context.dataSources.postAPI.getComments(parent.id, { limit, sort });
    },
    userReaction: async (parent: any, _: any, context: Context) => {
      if (!context.user) return null;
      return context.dataSources.postAPI.getUserReaction(parent.id, context.user.userId);
    },
    isSaved: async (parent: any, _: any, context: Context) => {
      if (!context.user) return false;
      return context.dataSources.userAPI.isPostSaved(context.user.userId, parent.id);
    },
    taggedUsers: async (parent: any, _: any, context: Context) => {
      if (!parent.taggedUserIds || parent.taggedUserIds.length === 0) return [];
      return context.dataSources.userAPI.getUsersByIds(parent.taggedUserIds);
    },
    parentPost: async (parent: any, _: any, context: Context) => {
      if (!parent.parentPostId) return null;
      return context.dataSources.postAPI.getPost(parent.parentPostId);
    },
    group: async (parent: any, _: any, context: Context) => {
      if (!parent.groupId) return null;
      return context.dataSources.userAPI.getGroup(parent.groupId);
    }
  },

  Comment: {
    author: async (parent: any, _: any, context: Context) => {
      return context.dataSources.userAPI.getUser(parent.authorId);
    },
    post: async (parent: any, _: any, context: Context) => {
      return context.dataSources.postAPI.getPost(parent.postId);
    },
    parentComment: async (parent: any, _: any, context: Context) => {
      if (!parent.parentCommentId) return null;
      return context.dataSources.postAPI.getComment(parent.parentCommentId);
    },
    replies: async (parent: any, { limit }: any, context: Context) => {
      return context.dataSources.postAPI.getCommentReplies(parent.id, limit);
    }
  },

  Message: {
    sender: async (parent: any, _: any, context: Context) => {
      return context.dataSources.userAPI.getUser(parent.senderId);
    },
    conversation: async (parent: any, _: any, context: Context) => {
      return context.dataSources.userAPI.getConversation(parent.conversationId);
    },
    replyTo: async (parent: any, _: any, context: Context) => {
      if (!parent.replyToId) return null;
      return context.dataSources.userAPI.getMessage(parent.replyToId);
    }
  },

  Conversation: {
    participants: async (parent: any, _: any, context: Context) => {
      return context.dataSources.userAPI.getUsersByIds(parent.participantIds);
    },
    creator: async (parent: any, _: any, context: Context) => {
      if (!parent.creatorId) return null;
      return context.dataSources.userAPI.getUser(parent.creatorId);
    },
    lastMessage: async (parent: any, _: any, context: Context) => {
      if (!parent.lastMessageId) return null;
      return context.dataSources.userAPI.getMessage(parent.lastMessageId);
    }
  },

  Notification: {
    user: async (parent: any, _: any, context: Context) => {
      return context.dataSources.userAPI.getUser(parent.userId);
    },
    actor: async (parent: any, _: any, context: Context) => {
      if (!parent.actorId) return null;
      return context.dataSources.userAPI.getUser(parent.actorId);
    },
    post: async (parent: any, _: any, context: Context) => {
      if (!parent.postId) return null;
      return context.dataSources.postAPI.getPost(parent.postId);
    },
    comment: async (parent: any, _: any, context: Context) => {
      if (!parent.commentId) return null;
      return context.dataSources.postAPI.getComment(parent.commentId);
    }
  },

  Group: {
    admins: async (parent: any, _: any, context: Context) => {
      return context.dataSources.userAPI.getGroupAdmins(parent.id);
    },
    members: async (parent: any, { limit }: any, context: Context) => {
      return context.dataSources.userAPI.getGroupMembers(parent.id, limit);
    },
    posts: async (parent: any, { limit }: any, context: Context) => {
      return context.dataSources.postAPI.getGroupPosts(parent.id, limit, context.user?.userId);
    },
    isMember: async (parent: any, _: any, context: Context) => {
      if (!context.user) return false;
      return context.dataSources.userAPI.isGroupMember(parent.id, context.user.userId);
    },
    isAdmin: async (parent: any, _: any, context: Context) => {
      if (!context.user) return false;
      return context.dataSources.userAPI.isGroupAdmin(parent.id, context.user.userId);
    }
  }
};

// Combine all resolvers
export const resolvers = {
  ...scalarResolvers,
  ...queryResolvers,
  ...mutationResolvers,
  ...subscriptionResolvers,
  ...typeResolvers
};

export default resolvers;
