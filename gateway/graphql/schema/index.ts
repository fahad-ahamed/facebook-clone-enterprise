/**
 * GraphQL Schema Definitions
 *
 * Contains all type definitions for the Facebook Clone GraphQL API.
 * Includes scalars, enums, inputs, types, and operations.
 *
 * @module gateway/graphql/schema
 */

import { gql } from 'graphql-tag';

// Custom scalar definitions
const scalarDefs = gql`
  # Custom scalar for DateTime
  scalar DateTime

  # Custom scalar for JSON
  scalar JSON

  # Custom scalar for Upload (file uploads)
  scalar Upload

  # Custom scalar for Email
  scalar Email

  # Custom scalar for Phone
  scalar Phone

  # Custom scalar for URL
  scalar URL
`;

// Enum definitions
const enumDefs = gql`
  enum PostVisibility {
    PUBLIC
    FRIENDS
    FRIENDS_EXCEPT
    SPECIFIC_FRIENDS
    ONLY_ME
  }

  enum ReactionType {
    LIKE
    LOVE
    HAHA
    WOW
    SAD
    ANGRY
  }

  enum NotificationType {
    LIKE
    COMMENT
    FOLLOW
    FRIEND_REQUEST
    MENTION
    SHARE
    REACTION
    POST
  }

  enum MessageStatus {
    SENDING
    SENT
    DELIVERED
    READ
    FAILED
  }

  enum ConversationType {
    DIRECT
    GROUP
  }

  enum Gender {
    MALE
    FEMALE
    OTHER
    PREFER_NOT_TO_SAY
  }

  enum UserBadge {
    NONE
    BLUE
    GRAY
    GOLD
  }

  enum FriendRequestStatus {
    PENDING
    ACCEPTED
    REJECTED
  }

  enum SortOrder {
    ASC
    DESC
  }

  enum StoryVisibility {
    PUBLIC
    FRIENDS
    CLOSE_FRIENDS
    CUSTOM
  }
`;

// User type definitions
const userDefs = gql`
  type User {
    id: ID!
    email: Email!
    username: String!
    displayName: String!
    avatar: URL
    coverPhoto: URL
    bio: String
    location: String
    website: URL
    dateOfBirth: DateTime
    gender: Gender
    country: String
    isOnline: Boolean!
    isVerified: Boolean!
    badgeType: UserBadge!
    isProfileLocked: Boolean!

    # Counts
    followerCount: Int!
    followingCount: Int!
    friendCount: Int!
    postCount: Int!

    # Relationships
    followers(limit: Int = 20, offset: Int = 0): UserConnection!
    following(limit: Int = 20, offset: Int = 0): UserConnection!
    friends(limit: Int = 20, offset: Int = 0): UserConnection!
    posts(limit: Int = 20, offset: Int = 0): PostConnection!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!

    # Computed fields
    isFollowing: Boolean!
    isFriend: Boolean!
    isBlocked: Boolean!
    mutualFriends(limit: Int = 10): [User!]!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  input CreateUserInput {
    email: Email!
    username: String!
    password: String!
    displayName: String
    dateOfBirth: DateTime
    gender: Gender
    country: String
  }

  input UpdateUserInput {
    displayName: String
    bio: String
    location: String
    website: URL
    dateOfBirth: DateTime
    gender: Gender
    country: String
    avatar: Upload
    coverPhoto: Upload
    isProfileLocked: Boolean
  }

  input UserQueryInput {
    search: String
    status: UserStatus
    country: String
    isVerified: Boolean
  }

  enum UserStatus {
    ONLINE
    OFFLINE
    ALL
  }
`;

// Post type definitions
const postDefs = gql`
  type Post {
    id: ID!
    content: String
    author: User!
    visibility: PostVisibility!
    media: [Media!]!

    # Counts
    likeCount: Int!
    commentCount: Int!
    shareCount: Int!

    # User interaction
    userReaction: ReactionType
    isSaved: Boolean!

    # Location & feelings
    location: String
    feelings: String
    taggedUsers: [User!]!

    # For shared posts
    parentPost: Post
    isShared: Boolean!

    # For group posts
    group: Group

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime

    # Reactions
    reactions(limit: Int = 20): ReactionConnection!
    comments(limit: Int = 20, sort: CommentSortInput): CommentConnection!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PostEdge {
    node: Post!
    cursor: String!
  }

  type Media {
    id: ID!
    type: MediaType!
    url: URL!
    thumbnail: URL
    width: Int
    height: Int
    duration: Int
    alt: String
  }

  enum MediaType {
    IMAGE
    VIDEO
    GIF
    AUDIO
  }

  input CreatePostInput {
    content: String
    media: [MediaInput!]
    visibility: PostVisibility = PUBLIC
    visibilityList: [ID!]
    location: String
    feelings: String
    taggedUserIds: [ID!]
    parentPostId: ID
    groupId: ID
  }

  input UpdatePostInput {
    content: String
    visibility: PostVisibility
    visibilityList: [ID!]
  }

  input MediaInput {
    type: MediaType!
    url: URL!
    thumbnail: URL
    width: Int
    height: Int
    duration: Int
    alt: String
  }

  input PostQueryInput {
    authorId: ID
    visibility: PostVisibility
    hasMedia: Boolean
    createdAfter: DateTime
    createdBefore: DateTime
  }

  input CommentSortInput {
    field: CommentSortField = CREATED_AT
    order: SortOrder = DESC
  }

  enum CommentSortField {
    CREATED_AT
    LIKE_COUNT
  }
`;

// Comment type definitions
const commentDefs = gql`
  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
    parentComment: Comment

    # Counts
    likeCount: Int!
    replyCount: Int!

    # Media
    media: [Media!]

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime

    # User interaction
    userReaction: ReactionType

    # Nested replies
    replies(limit: Int = 10): CommentConnection!
  }

  type CommentConnection {
    edges: [CommentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type CommentEdge {
    node: Comment!
    cursor: String!
  }

  input CreateCommentInput {
    postId: ID!
    content: String!
    parentCommentId: ID
    media: [MediaInput!]
    mentions: [ID!]
  }

  input UpdateCommentInput {
    content: String!
  }
`;

// Reaction type definitions
const reactionDefs = gql`
  type Reaction {
    id: ID!
    type: ReactionType!
    user: User!
    targetType: ReactionTargetType!
    targetId: ID!
    createdAt: DateTime!
  }

  type ReactionConnection {
    edges: [ReactionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    counts: ReactionCounts!
  }

  type ReactionEdge {
    node: Reaction!
    cursor: String!
  }

  type ReactionCounts {
    like: Int!
    love: Int!
    haha: Int!
    wow: Int!
    sad: Int!
    angry: Int!
    total: Int!
  }

  enum ReactionTargetType {
    POST
    COMMENT
  }

  input ReactInput {
    targetType: ReactionTargetType!
    targetId: ID!
    type: ReactionType!
  }
`;

// Feed type definitions
const feedDefs = gql`
  type Feed {
    posts: PostConnection!
    stories: [StoryGroup!]!
    suggestions: FeedSuggestions!
    trending: [TrendingItem!]!
  }

  type StoryGroup {
    user: User!
    stories: [Story!]!
    hasUnseen: Boolean!
  }

  type Story {
    id: ID!
    media: Media!
    caption: String
    visibility: StoryVisibility!
    viewers: [StoryViewer!]!
    viewCount: Int!
    createdAt: DateTime!
    expiresAt: DateTime!
    isOwn: Boolean!
  }

  type StoryViewer {
    user: User!
    viewedAt: DateTime!
  }

  type FeedSuggestions {
    friends: [User!]!
    pages: [Page!]!
    groups: [Group!]!
  }

  type TrendingItem {
    id: ID!
    type: TrendingType!
    title: String!
    description: String
    score: Float!
  }

  enum TrendingType {
    POST
    TOPIC
    HASHTAG
    USER
  }

  input FeedInput {
    type: FeedType = HOME
    limit: Int = 20
    offset: Int = 0
    cursor: String
  }

  enum FeedType {
    HOME
    FOLLOWING
    RECOMMENDED
    LATEST
  }
`;

// Group type definitions
const groupDefs = gql`
  type Group {
    id: ID!
    name: String!
    description: String
    coverPhoto: URL
    avatar: URL

    # Privacy
    privacy: GroupPrivacy!
    isHidden: Boolean!

    # Counts
    memberCount: Int!
    postCount: Int!

    # Membership
    isAdmin: Boolean!
    isMember: Boolean!
    membershipStatus: GroupMembershipStatus

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relationships
    admins: [User!]!
    members(limit: Int = 20): UserConnection!
    posts(limit: Int = 20): PostConnection!
  }

  enum GroupPrivacy {
    PUBLIC
    PRIVATE
    SECRET
  }

  enum GroupMembershipStatus {
    MEMBER
    ADMIN
    MODERATOR
    PENDING
    NONE
  }

  input CreateGroupInput {
    name: String!
    description: String
    privacy: GroupPrivacy = PUBLIC
    isHidden: Boolean = false
    coverPhoto: Upload
    avatar: Upload
  }

  input UpdateGroupInput {
    name: String
    description: String
    privacy: GroupPrivacy
    isHidden: Boolean
    coverPhoto: Upload
    avatar: Upload
  }
`;

// Page type definitions
const pageDefs = gql`
  type Page {
    id: ID!
    name: String!
    username: String!
    description: String
    category: String
    avatar: URL
    coverPhoto: URL

    # Counts
    followerCount: Int!
    postCount: Int!

    # User interaction
    isFollowing: Boolean!
    isLiked: Boolean!

    # Timestamps
    createdAt: DateTime!

    # Relationships
    posts(limit: Int = 20): PostConnection!
  }

  input CreatePageInput {
    name: String!
    username: String!
    description: String
    category: String
    avatar: Upload
    coverPhoto: Upload
  }
`;

// Message type definitions
const messageDefs = gql`
  type Message {
    id: ID!
    content: String
    sender: User!
    conversation: Conversation!

    # Media
    media: Media
    attachments: [Attachment!]

    # Voice
    voiceDuration: Int

    # Status
    status: MessageStatus!
    deliveredAt: DateTime
    readAt: DateTime

    # Encryption
    isEncrypted: Boolean!

    # Reply
    replyTo: Message

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  type Attachment {
    id: ID!
    type: AttachmentType!
    name: String!
    url: URL!
    size: Int!
    mimeType: String!
  }

  enum AttachmentType {
    IMAGE
    VIDEO
    AUDIO
    DOCUMENT
    OTHER
  }

  type Conversation {
    id: ID!
    type: ConversationType!
    name: String
    avatar: URL

    # Participants
    participants: [User!]!
    creator: User

    # Last message
    lastMessage: Message
    lastMessageAt: DateTime

    # Unread count for current user
    unreadCount: Int!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input SendMessageInput {
    conversationId: ID!
    content: String
    media: MediaInput
    attachments: [AttachmentInput!]
    voiceDuration: Int
    replyToId: ID
  }

  input AttachmentInput {
    type: AttachmentType!
    name: String!
    url: URL!
    size: Int!
    mimeType: String!
  }

  input CreateConversationInput {
    type: ConversationType = DIRECT
    participantIds: [ID!]!
    name: String
    initialMessage: SendMessageInput
  }
`;

// Notification type definitions
const notificationDefs = gql`
  type Notification {
    id: ID!
    type: NotificationType!
    user: User!

    # Content
    title: String!
    message: String!
    data: JSON

    # Related entities
    actor: User
    post: Post
    comment: Comment
    conversation: Conversation

    # Status
    isRead: Boolean!
    readAt: DateTime

    # Timestamps
    createdAt: DateTime!
  }

  type NotificationConnection {
    edges: [NotificationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    unreadCount: Int!
  }

  type NotificationEdge {
    node: Notification!
    cursor: String!
  }
`;

// Common types
const commonDefs = gql`
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type OperationResult {
    success: Boolean!
    message: String
    error: String
  }
`;

// Authentication types
const authDefs = gql`
  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
    requires2FA: Boolean!
  }

  type TokenPayload {
    accessToken: String!
    refreshToken: String!
    expiresIn: Int!
  }

  type VerificationResult {
    success: Boolean!
    message: String!
  }

  input LoginInput {
    email: Email!
    password: String!
    deviceId: String
    deviceName: String
    rememberMe: Boolean
  }

  input RegisterInput {
    email: Email!
    username: String!
    password: String!
    displayName: String
    dateOfBirth: DateTime
    gender: Gender
    country: String
  }

  input RefreshTokenInput {
    refreshToken: String!
  }

  input VerifyEmailInput {
    email: Email!
    code: String!
  }

  input ForgotPasswordInput {
    email: Email!
  }

  input ResetPasswordInput {
    email: Email!
    code: String!
    newPassword: String!
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }
`;

// Query definitions
const queryDefs = gql`
  type Query {
    # User queries
    me: User
    user(id: ID, username: String): User
    users(query: UserQueryInput, limit: Int, offset: Int): UserConnection!
    searchUsers(query: String!, limit: Int = 20): UserConnection!

    # Post queries
    post(id: ID!): Post
    posts(query: PostQueryInput, limit: Int = 20, offset: Int = 0): PostConnection!
    feed(input: FeedInput): Feed!

    # Comment queries
    comments(postId: ID!, limit: Int = 20, sort: CommentSortInput): CommentConnection!

    # Group queries
    group(id: ID!): Group
    groups(search: String, limit: Int = 20): [Group!]!

    # Page queries
    page(id: ID, username: String): Page
    pages(search: String, limit: Int = 20): [Page!]!

    # Message queries
    conversation(id: ID!): Conversation
    conversations(limit: Int = 20): [Conversation!]!
    messages(conversationId: ID!, limit: Int = 50, before: ID): [Message!]!

    # Notification queries
    notifications(type: NotificationType, unreadOnly: Boolean, limit: Int = 20): NotificationConnection!

    # Search
    search(query: String!, type: SearchType, limit: Int = 20): SearchResult!

    # Health check
    health: HealthStatus!
  }

  enum SearchType {
    ALL
    USERS
    POSTS
    GROUPS
    PAGES
    HASHTAGS
  }

  type SearchResult {
    users: [User!]!
    posts: [Post!]!
    groups: [Group!]!
    pages: [Page!]!
    hashtags: [String!]!
  }

  type HealthStatus {
    status: String!
    timestamp: DateTime!
    uptime: Float!
  }
`;

// Mutation definitions
const mutationDefs = gql`
  type Mutation {
    # Auth mutations
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    logout: OperationResult!
    refreshTokens(input: RefreshTokenInput!): TokenPayload!
    verifyEmail(input: VerifyEmailInput!): VerificationResult!
    resendVerification(email: Email!): VerificationResult!
    forgotPassword(input: ForgotPasswordInput!): VerificationResult!
    resetPassword(input: ResetPasswordInput!): VerificationResult!
    changePassword(input: ChangePasswordInput!): VerificationResult!

    # User mutations
    updateUser(input: UpdateUserInput!): User!
    followUser(userId: ID!): OperationResult!
    unfollowUser(userId: ID!): OperationResult!
    blockUser(userId: ID!): OperationResult!
    unblockUser(userId: ID!): OperationResult!
    sendFriendRequest(userId: ID!): OperationResult!
    acceptFriendRequest(userId: ID!): OperationResult!
    rejectFriendRequest(userId: ID!): OperationResult!
    unfriend(userId: ID!): OperationResult!

    # Post mutations
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): OperationResult!
    sharePost(postId: ID!, input: CreatePostInput!): Post!
    savePost(postId: ID!, collection: String): OperationResult!
    unsavePost(postId: ID!): OperationResult!

    # Comment mutations
    createComment(input: CreateCommentInput!): Comment!
    updateComment(id: ID!, input: UpdateCommentInput!): Comment!
    deleteComment(id: ID!): OperationResult!

    # Reaction mutations
    react(input: ReactInput!): Reaction!
    removeReaction(targetType: ReactionTargetType!, targetId: ID!): OperationResult!

    # Story mutations
    createStory(input: CreateStoryInput!): Story!
    deleteStory(id: ID!): OperationResult!
    viewStory(id: ID!): OperationResult!

    # Group mutations
    createGroup(input: CreateGroupInput!): Group!
    updateGroup(id: ID!, input: UpdateGroupInput!): Group!
    deleteGroup(id: ID!): OperationResult!
    joinGroup(id: ID!): OperationResult!
    leaveGroup(id: ID!): OperationResult!

    # Page mutations
    createPage(input: CreatePageInput!): Page!
    followPage(id: ID!): OperationResult!
    unfollowPage(id: ID!): OperationResult!

    # Message mutations
    sendMessage(input: SendMessageInput!): Message!
    createConversation(input: CreateConversationInput!): Conversation!
    markMessagesRead(conversationId: ID!): OperationResult!

    # Notification mutations
    markNotificationRead(id: ID!): OperationResult!
    markAllNotificationsRead: OperationResult!

    # Upload
    uploadFile(file: Upload!): Media!
  }

  input CreateStoryInput {
    media: MediaInput!
    caption: String
    visibility: StoryVisibility = FRIENDS
    visibilityList: [ID!]
    stickers: [JSON!]
    music: JSON
  }
`;

// Subscription definitions
const subscriptionDefs = gql`
  type Subscription {
    # User subscriptions
    userUpdated(userId: ID!): User!
    userOnlineStatusChanged(userId: ID!): UserOnlineStatus!

    # Post subscriptions
    postCreated(userId: ID): Post!
    postUpdated(postId: ID!): Post!
    postDeleted(postId: ID!): ID!

    # Comment subscriptions
    commentAdded(postId: ID!): Comment!

    # Message subscriptions
    messageSent(conversationId: ID!): Message!
    messageUpdated(conversationId: ID!): Message!
    messageDeleted(conversationId: ID!): ID!
    typingIndicator(conversationId: ID!): TypingIndicator!

    # Notification subscriptions
    notificationReceived: Notification!

    # Reaction subscriptions
    reactionAdded(targetType: ReactionTargetType!, targetId: ID!): Reaction!
    reactionRemoved(targetType: ReactionTargetType!, targetId: ID!): ID!

    # Feed subscriptions
    feedUpdated: FeedUpdate!
  }

  type UserOnlineStatus {
    userId: ID!
    isOnline: Boolean!
    lastSeen: DateTime
  }

  type TypingIndicator {
    conversationId: ID!
    userId: ID!
    isTyping: Boolean!
  }

  type FeedUpdate {
    type: FeedUpdateType!
    post: Post
    postId: ID
  }

  enum FeedUpdateType {
    NEW_POST
    POST_UPDATED
    POST_DELETED
  }
`;

// Combine all definitions
export const typeDefs = [
  scalarDefs,
  enumDefs,
  userDefs,
  postDefs,
  commentDefs,
  reactionDefs,
  feedDefs,
  groupDefs,
  pageDefs,
  messageDefs,
  notificationDefs,
  commonDefs,
  authDefs,
  queryDefs,
  mutationDefs,
  subscriptionDefs
];

export default typeDefs;
