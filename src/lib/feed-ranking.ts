/**
 * Feed Ranking/Recommendation System for Facebook Clone
 * Implements a basic scoring algorithm for post ranking
 */

import { db } from './db';

interface PostForRanking {
  id: string;
  authorId: string;
  content?: string | null;
  mediaType?: string | null;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  visibility: string;
  groupId?: string | null;
  pageId?: string | null;
}

interface RankingFactors {
  // Time decay
  timeDecay: number; // 0-1, newer posts score higher
  
  // Engagement
  engagementRate: number; // Combined likes, comments, shares
  
  // Relationship
  relationshipScore: number; // 0-1, how close the user is to author
  
  // Content type
  contentTypeBonus: number; // Photos/videos get bonus
  
  // Author influence
  authorInfluence: number; // Verified users, active users
  
  // Diversity
  diversityScore: number; // Ensures variety in feed
}

// Time decay function - posts lose score over time
function calculateTimeDecay(createdAt: Date): number {
  const now = new Date();
  const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // Exponential decay with half-life of 24 hours
  const halfLife = 24;
  return Math.pow(0.5, ageInHours / halfLife);
}

// Engagement rate calculation
function calculateEngagementRate(post: PostForRanking, viewsCount: number = 100): number {
  const totalEngagement = post.likeCount + (post.commentCount * 2) + (post.shareCount * 3);
  return Math.min(1, totalEngagement / viewsCount);
}

// Relationship score based on interactions
async function calculateRelationshipScore(userId: string, authorId: string): Promise<number> {
  if (userId === authorId) return 1.0;

  let score = 0;

  // Check if friends
  const friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { user1Id: userId, user2Id: authorId },
        { user1Id: authorId, user2Id: userId }
      ]
    }
  });
  if (friendship) score += 0.5;

  // Check if following
  const follow = await db.follow.findFirst({
    where: { followerId: userId, followingId: authorId }
  });
  if (follow) score += 0.2;

  // Check interaction history (likes, comments on author's posts)
  const interactions = await db.reaction.count({
    where: {
      userId,
      post: { authorId }
    }
  });
  score += Math.min(0.3, interactions * 0.01);

  return Math.min(1, score);
}

// Content type bonus
function calculateContentTypeBonus(post: PostForRanking): number {
  if (post.mediaType === 'video') return 0.3;
  if (post.mediaType === 'image') return 0.2;
  if (post.content && post.content.length > 100) return 0.1;
  return 0;
}

// Author influence score
async function calculateAuthorInfluence(authorId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: authorId },
    select: {
      isVerified: true,
      _count: {
        select: {
          followers: true,
          posts: true
        }
      }
    }
  });

  if (!user) return 0;

  let score = 0;
  
  // Verified bonus
  if (user.isVerified) score += 0.3;
  
  // Follower count bonus (capped)
  score += Math.min(0.4, user._count.followers / 1000);
  
  // Activity bonus
  if (user._count.posts > 10) score += 0.1;

  return Math.min(1, score);
}

// Weights for different factors
const WEIGHTS = {
  timeDecay: 0.25,
  engagementRate: 0.25,
  relationshipScore: 0.30,
  contentTypeBonus: 0.10,
  authorInfluence: 0.10
};

/**
 * Calculate ranking score for a post
 */
export async function calculatePostScore(
  post: PostForRanking,
  userId: string,
  seenPostIds: Set<string> = new Set()
): Promise<number> {
  const factors: RankingFactors = {
    timeDecay: calculateTimeDecay(post.createdAt),
    engagementRate: calculateEngagementRate(post),
    relationshipScore: await calculateRelationshipScore(userId, post.authorId),
    contentTypeBonus: calculateContentTypeBonus(post),
    authorInfluence: await calculateAuthorInfluence(post.authorId),
    diversityScore: seenPostIds.has(post.id) ? 0 : 1
  };

  // Weighted sum
  let score = 
    factors.timeDecay * WEIGHTS.timeDecay +
    factors.engagementRate * WEIGHTS.engagementRate +
    factors.relationshipScore * WEIGHTS.relationshipScore +
    factors.contentTypeBonus * WEIGHTS.contentTypeBonus +
    factors.authorInfluence * WEIGHTS.authorInfluence;

  // Apply diversity penalty
  score *= factors.diversityScore;

  return score;
}

/**
 * Get ranked feed for a user
 */
export async function getRankedFeed(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    includeGroups?: boolean;
    includePages?: boolean;
  } = {}
): Promise<{ posts: PostForRanking[]; hasMore: boolean }> {
  const { limit = 20, offset = 0, includeGroups = true, includePages = true } = options;

  // Get user's friends
  const friendships = await db.friendship.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }]
    }
  });
  const friendIds = friendships.map(f => 
    f.user1Id === userId ? f.user2Id : f.user1Id
  );

  // Get user's following
  const follows = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true }
  });
  const followingIds = follows.map(f => f.followingId);

  // Get user's groups
  let groupIds: string[] = [];
  if (includeGroups) {
    const memberships = await db.groupMember.findMany({
      where: { userId },
      select: { groupId: true }
    });
    groupIds = memberships.map(m => m.groupId);
  }

  // Get user's liked pages
  let pageIds: string[] = [];
  if (includePages) {
    const pageLikes = await db.pageLike.findMany({
      where: { userId },
      select: { pageId: true }
    });
    pageIds = pageLikes.map(p => p.pageId);
  }

  // Combined author sources
  const authorIds = [...new Set([...friendIds, ...followingIds, userId])];

  // Fetch candidate posts
  const candidatePosts = await db.post.findMany({
    where: {
      deletedAt: null,
      OR: [
        // Posts from friends/following
        { authorId: { in: authorIds } },
        // Posts from groups
        ...(includeGroups ? [{ groupId: { in: groupIds } }] : []),
        // Posts from pages
        ...(includePages ? [{ pageId: { in: pageIds } }] : []),
        // Public posts (with lower priority - handled by visibility)
        { visibility: 'public' }
      ]
    },
    include: {
      author: {
        select: { id: true, firstName: true, lastName: true, avatar: true, isVerified: true }
      },
      reactions: { select: { type: true, userId: true } },
      group: { select: { id: true, name: true, avatar: true } },
      page: { select: { id: true, name: true, avatar: true } }
    },
    take: 100, // Get more candidates for ranking
    orderBy: { createdAt: 'desc' }
  });

  // Score and rank posts
  const seenPostIds = new Set<string>();
  const scoredPosts = await Promise.all(
    candidatePosts.map(async (post) => {
      const score = await calculatePostScore(post, userId, seenPostIds);
      return { post, score };
    })
  );

  // Sort by score
  scoredPosts.sort((a, b) => b.score - a.score);

  // Paginate
  const paginatedPosts = scoredPosts.slice(offset, offset + limit + 1);
  const hasMore = paginatedPosts.length > limit;
  const posts = paginatedPosts.slice(0, limit).map(sp => sp.post);

  // Get user's reactions
  const userReactions = await db.reaction.findMany({
    where: {
      userId,
      postId: { in: posts.map(p => p.id) }
    },
    select: { postId: true, type: true }
  });

  const reactionMap = new Map(userReactions.map(r => [r.postId, r.type]));

  // Add user reaction to posts
  const postsWithUserReaction = posts.map(post => ({
    ...post,
    userReaction: reactionMap.get(post.id) || null
  }));

  return { posts: postsWithUserReaction as PostForRanking[], hasMore };
}

/**
 * Get friend recommendations for a user
 */
export async function getFriendRecommendations(userId: string, limit: number = 10) {
  // Get existing friends
  const friendships = await db.friendship.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }]
    }
  });
  const friendIds = friendships.map(f => 
    f.user1Id === userId ? f.user2Id : f.user1Id
  );

  // Get pending requests
  const pendingRequests = await db.friendRequest.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: 'pending'
    }
  });
  const pendingUserIds = pendingRequests.map(r => 
    r.senderId === userId ? r.receiverId : r.senderId
  );

  // Get friends of friends with mutual count
  const friendsOfFriends = await db.friendship.findMany({
    where: {
      OR: [
        { user1Id: { in: friendIds } },
        { user2Id: { in: friendIds } }
      ],
      NOT: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    },
    include: {
      user1: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      user2: { select: { id: true, firstName: true, lastName: true, avatar: true } }
    }
  });

  // Count mutual friends
  const mutualCounts = new Map<string, { user: typeof friendsOfFriends[0]['user1']; count: number }>();
  
  friendsOfFriends.forEach(f => {
    const targetUser = f.user1Id !== userId ? f.user1 : f.user2;
    if (!friendIds.includes(targetUser.id) && !pendingUserIds.includes(targetUser.id)) {
      const existing = mutualCounts.get(targetUser.id);
      if (existing) {
        existing.count++;
      } else {
        mutualCounts.set(targetUser.id, { user: targetUser, count: 1 });
      }
    }
  });

  // Sort by mutual count and return top recommendations
  const recommendations = Array.from(mutualCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(r => ({ ...r.user, mutualFriends: r.count }));

  return recommendations;
}

/**
 * Get content recommendations (posts user might like)
 */
export async function getContentRecommendations(userId: string, limit: number = 10) {
  // Get user's recent interactions
  const recentLikes = await db.reaction.findMany({
    where: { userId },
    include: { post: { include: { author: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Extract patterns (authors liked, content types)
  const likedAuthorIds = new Set(recentLikes.filter(l => l.post).map(l => l.post!.authorId));
  const likedPostIds = new Set(recentLikes.filter(l => l.postId).map(l => l.postId as string));

  // Find similar posts
  const recommendations = await db.post.findMany({
    where: {
      deletedAt: null,
      id: { notIn: Array.from(likedPostIds) },
      OR: [
        { authorId: { in: Array.from(likedAuthorIds) } },
        { visibility: 'public' }
      ]
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      reactions: { select: { type: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return recommendations;
}
