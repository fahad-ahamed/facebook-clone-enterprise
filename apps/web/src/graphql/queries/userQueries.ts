import { gql } from '@apollo/client';

// Get current authenticated user
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      username
      firstName
      lastName
      avatar
      coverPhoto
      bio
      location
      workplace
      education
      relationshipStatus
      birthDate
      gender
      createdAt
      updatedAt
      isVerified
      isOnline
      lastSeen
      friendCount
      followerCount
      followingCount
      postCount
      settings {
        id
        theme
        language
        notificationsEnabled
        emailNotifications
        pushNotifications
        privacyLevel
        profileVisibility
        showOnlineStatus
        showLastSeen
      }
    }
  }
`;

// Get user profile by ID or username
export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: ID!, $username: String) {
    user(userId: $userId, username: $username) {
      id
      username
      firstName
      lastName
      avatar
      coverPhoto
      bio
      location
      workplace
      education
      relationshipStatus
      birthDate
      gender
      createdAt
      isVerified
      isOnline
      lastSeen
      friendCount
      followerCount
      followingCount
      postCount
      mutualFriends {
        id
        firstName
        lastName
        avatar
      }
      isFriend
      isFollowing
      hasPendingRequest
      canViewProfile
    }
  }
`;

// Search users
export const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int, $offset: Int) {
    searchUsers(query: $query, limit: $limit, offset: $offset) {
      users {
        id
        username
        firstName
        lastName
        avatar
        bio
        isVerified
        isFriend
        isFollowing
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;

// Get user friends
export const GET_USER_FRIENDS = gql`
  query GetUserFriends($userId: ID!, $limit: Int, $offset: Int) {
    userFriends(userId: $userId, limit: $limit, offset: $offset) {
      friends {
        id
        friend {
          id
          username
          firstName
          lastName
          avatar
          isOnline
          lastSeen
        }
        createdAt
        closeFriend
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;

// Get friend suggestions
export const GET_FRIEND_SUGGESTIONS = gql`
  query GetFriendSuggestions($limit: Int) {
    friendSuggestions(limit: $limit) {
      id
      user {
        id
        username
        firstName
        lastName
        avatar
        bio
        mutualFriendCount
      }
      reason
      score
    }
  }
`;

// Get user photos
export const GET_USER_PHOTOS = gql`
  query GetUserPhotos($userId: ID!, $limit: Int, $offset: Int) {
    userPhotos(userId: $userId, limit: $limit, offset: $offset) {
      photos {
        id
        url
        thumbnailUrl
        caption
        createdAt
        likeCount
        commentCount
        album {
          id
          name
        }
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`;

// Get user albums
export const GET_USER_ALBUMS = gql`
  query GetUserAlbums($userId: ID!) {
    userAlbums(userId: $userId) {
      id
      name
      description
      coverPhoto {
        id
        url
        thumbnailUrl
      }
      photoCount
      createdAt
      updatedAt
      privacy
    }
  }
`;

// Check username availability
export const CHECK_USERNAME_AVAILABILITY = gql`
  query CheckUsernameAvailability($username: String!) {
    checkUsernameAvailability(username: $username) {
      available
      suggestions
    }
  }
`;

// Get user notifications
export const GET_USER_NOTIFICATIONS = gql`
  query GetUserNotifications($limit: Int, $offset: Int, $unreadOnly: Boolean) {
    notifications(limit: $limit, offset: $offset, unreadOnly: $unreadOnly) {
      id
      type
      title
      message
      createdAt
      isRead
      actor {
        id
        firstName
        lastName
        avatar
      }
      target {
        ... on Post {
          id
          content
        }
        ... on Comment {
          id
          content
        }
        ... on User {
          id
          firstName
          lastName
        }
      }
      actionUrl
    }
    unreadNotificationCount
  }
`;

// Get online friends
export const GET_ONLINE_FRIENDS = gql`
  query GetOnlineFriends {
    onlineFriends {
      id
      username
      firstName
      lastName
      avatar
      lastSeen
    }
  }
`;
