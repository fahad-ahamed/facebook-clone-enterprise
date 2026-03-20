import { gql } from '@apollo/client';

// Create post mutation
export const CREATE_POST = gql`
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      success
      message
      post {
        id
        content
        createdAt
        visibility
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
      }
    }
  }
`;

// Update post mutation
export const UPDATE_POST = gql`
  mutation UpdatePost($postId: ID!, $input: UpdatePostInput!) {
    updatePost(postId: $postId, input: $input) {
      success
      message
      post {
        id
        content
        updatedAt
        editedAt
        isEdited
        visibility
        media {
          id
          type
          url
          thumbnailUrl
        }
        location {
          name
        }
        feeling
        activity
      }
    }
  }
`;

// Delete post mutation
export const DELETE_POST = gql`
  mutation DeletePost($postId: ID!) {
    deletePost(postId: $postId) {
      success
      message
    }
  }
`;

// Add reaction to post
export const ADD_REACTION = gql`
  mutation AddReaction($input: ReactionInput!) {
    addReaction(input: $input) {
      success
      reaction {
        id
        type
        createdAt
      }
      post {
        id
        reactions {
          type
          count
          reacted
        }
        reactionCount
      }
    }
  }
`;

// Remove reaction from post
export const REMOVE_REACTION = gql`
  mutation RemoveReaction($postId: ID!) {
    removeReaction(postId: $postId) {
      success
      message
      post {
        id
        reactions {
          type
          count
          reacted
        }
        reactionCount
      }
    }
  }
`;

// Create comment mutation
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      success
      message
      comment {
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
        reactionCount
        replyCount
      }
      post {
        id
        commentCount
      }
    }
  }
`;

// Update comment mutation
export const UPDATE_COMMENT = gql`
  mutation UpdateComment($commentId: ID!, $content: String!) {
    updateComment(commentId: $commentId, content: $content) {
      success
      message
      comment {
        id
        content
        updatedAt
        isEdited
      }
    }
  }
`;

// Delete comment mutation
export const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: ID!) {
    deleteComment(commentId: $commentId) {
      success
      message
      post {
        id
        commentCount
      }
    }
  }
`;

// Reply to comment
export const CREATE_REPLY = gql`
  mutation CreateReply($commentId: ID!, $content: String!) {
    createReply(commentId: $commentId, content: $content) {
      success
      reply {
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
      comment {
        id
        replyCount
      }
    }
  }
`;

// Share post mutation
export const SHARE_POST = gql`
  mutation SharePost($input: SharePostInput!) {
    sharePost(input: $input) {
      success
      message
      sharedPost {
        id
        content
        createdAt
        author {
          id
          firstName
          lastName
          avatar
        }
        originalPost {
          id
          content
          author {
            id
            firstName
            lastName
            avatar
          }
        }
      }
      originalPost {
        id
        shareCount
      }
    }
  }
`;

// Save post mutation
export const SAVE_POST = gql`
  mutation SavePost($postId: ID!) {
    savePost(postId: $postId) {
      success
      message
      savedAt
    }
  }
`;

// Unsave post mutation
export const UNSAVE_POST = gql`
  mutation UnsavePost($postId: ID!) {
    unsavePost(postId: $postId) {
      success
      message
    }
  }
`;

// Hide post from feed
export const HIDE_POST = gql`
  mutation HidePost($postId: ID!) {
    hidePost(postId: $postId) {
      success
      message
    }
  }
`;

// Report post mutation
export const REPORT_POST = gql`
  mutation ReportPost($input: ReportPostInput!) {
    reportPost(input: $input) {
      success
      message
      reportId
    }
  }
`;

// Pin post mutation
export const PIN_POST = gql`
  mutation PinPost($postId: ID!) {
    pinPost(postId: $postId) {
      success
      message
      post {
        id
        isPinned
      }
    }
  }
`;

// Unpin post mutation
export const UNPIN_POST = gql`
  mutation UnpinPost($postId: ID!) {
    unpinPost(postId: $postId) {
      success
      message
      post {
        id
        isPinned
      }
    }
  }
`;

// Upload media for post
export const UPLOAD_POST_MEDIA = gql`
  mutation UploadPostMedia($files: [Upload!]!, $postId: ID) {
    uploadPostMedia(files: $files, postId: $postId) {
      success
      media {
        id
        type
        url
        thumbnailUrl
        width
        height
        altText
      }
    }
  }
`;

// Tag users in post
export const TAG_USERS = gql`
  mutation TagUsers($postId: ID!, $tags: [UserTagInput!]!) {
    tagUsers(postId: $postId, tags: $tags) {
      success
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
    }
  }
`;

// Add reaction to comment
export const ADD_COMMENT_REACTION = gql`
  mutation AddCommentReaction($commentId: ID!, $type: ReactionType!) {
    addCommentReaction(commentId: $commentId, type: $type) {
      success
      comment {
        id
        reactions {
          type
          count
          reacted
        }
        reactionCount
      }
    }
  }
`;

// Turn off comments for post
export const TOGGLE_COMMENTS = gql`
  mutation ToggleComments($postId: ID!, $enabled: Boolean!) {
    toggleComments(postId: $postId, enabled: $enabled) {
      success
      post {
        id
        commentsEnabled
      }
    }
  }
`;
