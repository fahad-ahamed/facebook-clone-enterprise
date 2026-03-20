import { gql } from '@apollo/client';

// Get a single post by ID
export const GET_POST = gql`
  query GetPost($postId: ID!) {
    post(postId: $postId) {
      id
      content
      createdAt
      updatedAt
      editedAt
      isEdited
      visibility
      status
      author {
        id
        username
        firstName
        lastName
        avatar
        isVerified
      }
      media {
        id
        type
        url
        thumbnailUrl
        width
        height
        altText
      }
      reactions {
        type
        count
        reacted
      }
      reactionCount
      commentCount
      shareCount
      comments(first: 5) {
        edges {
          node {
            id
            content
            createdAt
            author {
              id
              firstName
              lastName
              avatar
            }
            reactions {
              type
              count
              reacted
            }
            replyCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      tags {
        id
        user {
          id
          firstName
          lastName
        }
        position {
          x
          y
        }
      }
      location {
        name
        coordinates {
          lat
          lng
        }
      }
      feeling
      activity
      isSaved
      canEdit
      canDelete
      canShare
    }
  }
`;

// Get posts by user ID
export const GET_USER_POSTS = gql`
  query GetUserPosts($userId: ID!, $limit: Int, $offset: Int) {
    userPosts(userId: $userId, limit: $limit, offset: $offset) {
      posts {
        id
        content
        createdAt
        updatedAt
        visibility
        author {
          id
          username
          firstName
          lastName
          avatar
          isVerified
        }
        media {
          id
          type
          url
          thumbnailUrl
          width
          height
        }
        reactions {
          type
          count
          reacted
        }
        reactionCount
        commentCount
        shareCount
        isSaved
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;

// Get post comments
export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: ID!, $limit: Int, $offset: Int, $sortBy: CommentSort) {
    postComments(postId: $postId, limit: $limit, offset: $offset, sortBy: $sortBy) {
      comments {
        id
        content
        createdAt
        updatedAt
        isEdited
        author {
          id
          firstName
          lastName
          avatar
          isVerified
        }
        reactions {
          type
          count
          reacted
        }
        reactionCount
        replyCount
        replies(first: 3) {
          edges {
            node {
              id
              content
              createdAt
              author {
                id
                firstName
                lastName
                avatar
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;

// Get post reactions with users
export const GET_POST_REACTIONS = gql`
  query GetPostReactions($postId: ID!, $reactionType: ReactionType, $limit: Int, $offset: Int) {
    postReactions(postId: $postId, reactionType: $reactionType, limit: $limit, offset: $offset) {
      reactions {
        id
        type
        createdAt
        user {
          id
          firstName
          lastName
          avatar
        }
      }
      reactionSummary {
        type
        count
      }
      pageInfo {
        totalCount
      }
    }
  }
`;

// Get shared post details
export const GET_SHARED_POST = gql`
  query GetSharedPost($postId: ID!) {
    sharedPost(postId: $postId) {
      id
      content
      createdAt
      originalPost {
        id
        content
        createdAt
        author {
          id
          firstName
          lastName
          avatar
        }
        media {
          id
          type
          url
          thumbnailUrl
        }
      }
      shareCount
    }
  }
`;

// Get post insights (for post author)
export const GET_POST_INSIGHTS = gql`
  query GetPostInsights($postId: ID!) {
    postInsights(postId: $postId) {
      impressions
      reach
      engagement
      reactionsByType {
        type
        count
      }
      clicks
      shares
      comments
      averageTimeSpent
      demographicBreakdown {
        ageRange
        gender
        count
      }
    }
  }
`;

// Search posts
export const SEARCH_POSTS = gql`
  query SearchPosts($query: String!, $limit: Int, $offset: Int, $filters: PostSearchFilters) {
    searchPosts(query: $query, limit: $limit, offset: $offset, filters: $filters) {
      posts {
        id
        content
        createdAt
        author {
          id
          firstName
          lastName
          avatar
        }
        media {
          id
          type
          url
          thumbnailUrl
        }
        reactionCount
        commentCount
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`;

// Get trending posts
export const GET_TRENDING_POSTS = gql`
  query GetTrendingPosts($limit: Int, $timeframe: TrendingTimeframe) {
    trendingPosts(limit: $limit, timeframe: $timeframe) {
      id
      content
      createdAt
      author {
        id
        firstName
        lastName
        avatar
        isVerified
      }
      media {
        id
        type
        url
        thumbnailUrl
      }
      reactionCount
      commentCount
      shareCount
      trendScore
    }
  }
`;

// Get saved posts
export const GET_SAVED_POSTS = gql`
  query GetSavedPosts($limit: Int, $offset: Int) {
    savedPosts(limit: $limit, offset: $offset) {
      posts {
        id
        content
        createdAt
        savedAt
        author {
          id
          firstName
          lastName
          avatar
        }
        media {
          id
          type
          url
          thumbnailUrl
        }
        reactionCount
        commentCount
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`;
