import { gql } from '@apollo/client';

// Get main feed
export const GET_FEED = gql`
  query GetFeed($limit: Int, $offset: Int, $feedType: FeedType) {
    feed(limit: $limit, offset: $offset, feedType: $feedType) {
      posts {
        id
        content
        createdAt
        updatedAt
        editedAt
        isEdited
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
        comments(first: 3) {
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
            }
          }
        }
        tags {
          id
          user {
            id
            firstName
            lastName
          }
        }
        location {
          name
        }
        feeling
        activity
        isSaved
        isPinned
        canEdit
        canDelete
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
        endCursor
      }
    }
  }
`;

// Subscribe to feed updates
export const FEED_UPDATES_SUBSCRIPTION = gql`
  subscription FeedUpdates($userId: ID!) {
    feedUpdates(userId: $userId) {
      type
      post {
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
    }
  }
`;

// Get group feed
export const GET_GROUP_FEED = gql`
  query GetGroupFeed($groupId: ID!, $limit: Int, $offset: Int) {
    groupFeed(groupId: $groupId, limit: $limit, offset: $offset) {
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
        reactions {
          type
          count
          reacted
        }
        reactionCount
        commentCount
        isPinned
      }
      group {
        id
        name
        coverPhoto
        memberCount
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`;

// Get page feed
export const GET_PAGE_FEED = gql`
  query GetPageFeed($pageId: ID!, $limit: Int, $offset: Int) {
    pageFeed(pageId: $pageId, limit: $limit, offset: $offset) {
      posts {
        id
        content
        createdAt
        author {
          id
          name
          avatar
        }
        media {
          id
          type
          url
          thumbnailUrl
        }
        reactions {
          type
          count
          reacted
        }
        reactionCount
        commentCount
        shareCount
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`;

// Get hashtag feed
export const GET_HASHTAG_FEED = gql`
  query GetHashtagFeed($hashtag: String!, $limit: Int, $offset: Int) {
    hashtagFeed(hashtag: $hashtag, limit: $limit, offset: $offset) {
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
      hashtagInfo {
        name
        postCount
        isFollowing
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`;

// Get user timeline
export const GET_USER_TIMELINE = gql`
  query GetUserTimeline($userId: ID!, $limit: Int, $offset: Int, $year: Int, $month: Int) {
    userTimeline(userId: $userId, limit: $limit, offset: $offset, year: $year, month: $month) {
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
        reactions {
          type
          count
          reacted
        }
        reactionCount
        commentCount
        lifeEvent {
          id
          type
          title
          description
        }
      }
      timelineYear
      highlights {
        year
        postCount
        topMoments
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`;

// Get memories
export const GET_MEMORIES = gql`
  query GetMemories($date: Date) {
    memories(date: $date) {
      id
      type
      yearsAgo
      post {
        id
        content
        createdAt
        media {
          id
          type
          url
          thumbnailUrl
        }
        reactionCount
        commentCount
      }
    }
  }
`;

// Get suggested posts
export const GET_SUGGESTED_POSTS = gql`
  query GetSuggestedPosts($limit: Int) {
    suggestedPosts(limit: $limit) {
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
      reason
    }
  }
`;

// Get video feed (Reels-like)
export const GET_VIDEO_FEED = gql`
  query GetVideoFeed($limit: Int, $offset: Int) {
    videoFeed(limit: $limit, offset: $offset) {
      videos {
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
          width
          height
          duration
        }
        reactions {
          type
          count
          reacted
        }
        reactionCount
        commentCount
        shareCount
        viewCount
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
