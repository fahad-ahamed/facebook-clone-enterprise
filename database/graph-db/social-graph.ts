// =====================================================
// Neo4j Graph Database Schema - Social Graph
// Cypher queries for social relationships
// =====================================================

// =====================================================
// Node Types
// =====================================================

// User Node
// CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
// CREATE INDEX user_username_index IF NOT EXISTS FOR (u:User) ON (u.username);
// CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email);

/*
User Node Properties:
{
  id: UUID,
  username: String,
  email: String,
  fullName: String,
  createdAt: DateTime,
  lastActive: DateTime
}
*/

// Page Node
/*
Page Node Properties:
{
  id: UUID,
  name: String,
  category: String,
  createdAt: DateTime
}
*/

// Group Node
/*
Group Node Properties:
{
  id: UUID,
  name: String,
  privacy: String (public, private, secret),
  createdAt: DateTime
}
*/

// =====================================================
// Relationship Types
// =====================================================

// FRIEND - Bidirectional friendship
// (:User)-[:FRIEND {since: DateTime, status: String}]->(:User)

// FOLLOW - Asymmetric follow
// (:User)-[:FOLLOW {since: DateTime}]->(:User)

// BLOCK - User blocking
// (:User)-[:BLOCK {since: DateTime, reason: String}]->(:User)

// LIKES_PAGE - Page like
// (:User)-[:LIKES_PAGE {since: DateTime}]->(:Page)

// MEMBER_OF - Group membership
// (:User)-[:MEMBER_OF {since: DateTime, role: String}]->(:Group)

// ADMIN_OF - Group/Page admin
// (:User)-[:ADMIN_OF {since: DateTime}]->(:Group|:Page)

// MENTIONED - User mentioned in content
// (:Post|:Comment)-[:MENTIONED {at: DateTime}]->(:User)

// TAGGED - User tagged in media
// (:Photo|:Video)-[:TAGGED {position: Object}]->(:User)

// =====================================================
// Cypher Queries
// =====================================================

/**
 * Create User Node
 */
export const CREATE_USER = `
CREATE (u:User {
  id: $id,
  username: $username,
  email: $email,
  fullName: $fullName,
  createdAt: datetime(),
  lastActive: datetime()
})
RETURN u
`;

/**
 * Create Friendship
 */
export const CREATE_FRIENDSHIP = `
MATCH (u1:User {id: $userId1})
MATCH (u2:User {id: $userId2})
MERGE (u1)-[r1:FRIEND {since: datetime(), status: 'accepted'}]->(u2)
MERGE (u2)-[r2:FRIEND {since: datetime(), status: 'accepted'}]->(u1)
RETURN r1, r2
`;

/**
 * Create Follow Relationship
 */
export const CREATE_FOLLOW = `
MATCH (follower:User {id: $followerId})
MATCH (following:User {id: $followingId})
MERGE (follower)-[r:FOLLOW {since: datetime()}]->(following)
RETURN r
`;

/**
 * Get Friends of Friends (Potential Suggestions)
 */
export const GET_FRIENDS_OF_FRIENDS = `
MATCH (u:User {id: $userId})-[:FRIEND]-(friend:User)-[:FRIEND]-(fof:User)
WHERE NOT (u)-[:FRIEND]-(fof) AND u <> fof
RETURN fof.id as userId, fof.username, fof.fullName, count(friend) as mutualFriends
ORDER BY mutualFriends DESC
LIMIT $limit
`;

/**
 * Get Mutual Friends
 */
export const GET_MUTUAL_FRIENDS = `
MATCH (u1:User {id: $userId1})-[:FRIEND]-(mutual:User)-[:FRIEND]-(u2:User {id: $userId2})
RETURN mutual.id as userId, mutual.username, mutual.fullName
LIMIT $limit
`;

/**
 * Get User's Social Graph
 */
export const GET_SOCIAL_GRAPH = `
MATCH (u:User {id: $userId})
OPTIONAL MATCH (u)-[:FRIEND]-(friend:User)
OPTIONAL MATCH (u)-[:FOLLOW]->(following:User)
OPTIONAL MATCH (u)<-[:FOLLOW]-(follower:User)
RETURN 
  collect(DISTINCT friend.id) as friends,
  collect(DISTINCT following.id) as following,
  collect(DISTINCT follower.id) as followers
`;

/**
 * Get Shortest Path Between Users
 */
export const GET_CONNECTION_PATH = `
MATCH path = shortestPath(
  (u1:User {id: $userId1})-[:FRIEND|FOLLOW*]-(u2:User {id: $userId2})
)
RETURN [node in nodes(path) | node.id] as path,
       [rel in relationships(path) | type(rel)] as relationships
`;

/**
 * Get Suggested Friends (Based on multiple factors)
 */
export const GET_SUGGESTED_FRIENDS = `
MATCH (u:User {id: $userId})
// Friends of friends
OPTIONAL MATCH (u)-[:FRIEND]-(friend:User)-[:FRIEND]-(fof:User)
WHERE NOT (u)-[:FRIEND]-(fof) AND u <> fof
WITH u, fof, count(friend) as mutualFriends
// People from same groups
OPTIONAL MATCH (u)-[:MEMBER_OF]->(g:Group)<-[:MEMBER_OF]-(groupMember:User)
WHERE NOT (u)-[:FRIEND]-(groupMember) AND u <> groupMember
WITH u, fof, mutualFriends, groupMember, count(g) as sharedGroups
// People who follow the same pages
OPTIONAL MATCH (u)-[:LIKES_PAGE]->(p:Page)<-[:LIKES_PAGE]-(pageLiker:User)
WHERE NOT (u)-[:FRIEND]-(pageLiker) AND u <> pageLiker
WITH u, 
     collect(DISTINCT {user: fof, score: mutualFriends * 10}) as fofSuggestions,
     collect(DISTINCT {user: groupMember, score: sharedGroups * 5}) as groupSuggestions,
     collect(DISTINCT {user: pageLiker, score: count(p) * 3}) as pageSuggestions
WITH fofSuggestions + groupSuggestions + pageSuggestions as allSuggestions
UNWIND allSuggestions as suggestion
WITH suggestion.user as suggested, sum(suggestion.score) as totalScore
RETURN suggested.id as userId, suggested.username, suggested.fullName, totalScore as score
ORDER BY totalScore DESC
LIMIT $limit
`;

/**
 * Block User
 */
export const BLOCK_USER = `
MATCH (blocker:User {id: $blockerId})
MATCH (blocked:User {id: $blockedId})
// Remove any existing relationships
OPTIONAL MATCH (blocker)-[f1:FRIEND]-(blocked) DELETE f1
OPTIONAL MATCH (blocker)-[fo1:FOLLOW]->(blocked) DELETE fo1
OPTIONAL MATCH (blocker)<-[fo2:FOLLOW]-(blocked) DELETE fo2
// Create block relationship
MERGE (blocker)-[r:BLOCK {since: datetime()}]->(blocked)
RETURN r
`;

/**
 * Get User's Network Statistics
 */
export const GET_NETWORK_STATS = `
MATCH (u:User {id: $userId})
OPTIONAL MATCH (u)-[:FRIEND]-(friend:User) 
WITH u, count(DISTINCT friend) as friendCount
OPTIONAL MATCH (u)-[:FOLLOW]->(following:User)
WITH u, friendCount, count(DISTINCT following) as followingCount
OPTIONAL MATCH (u)<-[:FOLLOW]-(follower:User)
WITH friendCount, followingCount, count(DISTINCT follower) as followerCount
RETURN friendCount, followingCount, followerCount
`;

/**
 * Find Communities (Label Propagation)
 */
export const FIND_COMMUNITIES = `
CALL gds.louvain.stream({
  nodeProjection: 'User',
  relationshipProjection: 'FRIEND',
  maxIterations: 20
})
YIELD nodeId, communityId
MATCH (u:User) WHERE id(u) = nodeId
RETURN communityId, collect(u.id) as members, count(u) as size
ORDER BY size DESC
LIMIT $limit
`;

/**
 * Get Network Influence Score
 */
export const GET_INFLUENCE_SCORE = `
MATCH (u:User {id: $userId})
OPTIONAL MATCH (u)<-[:FOLLOW]-(follower:User)
OPTIONAL MATCH (u)<-[:FRIEND]-(friend:User)
OPTIONAL MATCH (u)-[:LIKES_PAGE]->(pages)
WITH u, 
     count(DISTINCT follower) as followers,
     count(DISTINCT friend) as friends,
     count(DISTINCT pages) as pagesLiked
// Calculate influence score (simplified PageRank-like)
WITH followers * 1.0 + friends * 0.5 + pagesLiked * 0.2 as influenceScore
RETURN influenceScore
`;

/**
 * Create Group Membership
 */
export const CREATE_GROUP_MEMBERSHIP = `
MATCH (u:User {id: $userId})
MATCH (g:Group {id: $groupId})
MERGE (u)-[r:MEMBER_OF {since: datetime(), role: $role}]->(g)
RETURN r
`;

/**
 * Get Group Members
 */
export const GET_GROUP_MEMBERS = `
MATCH (g:Group {id: $groupId})<-[:MEMBER_OF]-(member:User)
RETURN member.id as userId, member.username, member.fullName
ORDER BY member.username
SKIP $offset
LIMIT $limit
`;

/**
 * Create Page Like
 */
export const CREATE_PAGE_LIKE = `
MATCH (u:User {id: $userId})
MATCH (p:Page {id: $pageId})
MERGE (u)-[r:LIKES_PAGE {since: datetime()}]->(p)
RETURN r
`;

/**
 * Get Similar Users (Based on interests and connections)
 */
export const GET_SIMILAR_USERS = `
MATCH (u:User {id: $userId})
// Find users with similar connections
MATCH (u)-[:FRIEND|FOLLOW|LIKES_PAGE|MEMBER_OF]->(entity)<-[:FRIEND|FOLLOW|LIKES_PAGE|MEMBER_OF]-(similar:User)
WHERE u <> similar
WITH similar, count(entity) as sharedEntities
// Calculate similarity score
MATCH (u)-[uConnections:FRIEND|FOLLOW|LIKES_PAGE|MEMBER_OF]->()
WITH similar, sharedEntities, count(uConnections) as uTotal
MATCH (similar)-[sConnections:FRIEND|FOLLOW|LIKES_PAGE|MEMBER_OF]->()
WITH similar, sharedEntities, uTotal, count(sConnections) as sTotal
WITH similar, (sharedEntities * 2.0) / (uTotal + sTotal) as jaccardSimilarity
RETURN similar.id as userId, similar.username, similar.fullName, jaccardSimilarity
ORDER BY jaccardSimilarity DESC
LIMIT $limit
`;

// =====================================================
// Indexes and Constraints
// =====================================================

export const CREATE_INDEXES = `
// User constraints
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE;

// Page constraints
CREATE CONSTRAINT page_id_unique IF NOT EXISTS FOR (p:Page) REQUIRE p.id IS UNIQUE;

// Group constraints  
CREATE CONSTRAINT group_id_unique IF NOT EXISTS FOR (g:Group) REQUIRE g.id IS UNIQUE;

// Performance indexes
CREATE INDEX user_created_at_index IF NOT EXISTS FOR (u:User) ON (u.createdAt);
CREATE INDEX user_last_active_index IF NOT EXISTS FOR (u:User) ON (u.lastActive);
`;

export default {
  CREATE_USER,
  CREATE_FRIENDSHIP,
  CREATE_FOLLOW,
  GET_FRIENDS_OF_FRIENDS,
  GET_MUTUAL_FRIENDS,
  GET_SOCIAL_GRAPH,
  GET_CONNECTION_PATH,
  GET_SUGGESTED_FRIENDS,
  BLOCK_USER,
  GET_NETWORK_STATS,
  FIND_COMMUNITIES,
  GET_INFLUENCE_SCORE,
  CREATE_GROUP_MEMBERSHIP,
  GET_GROUP_MEMBERS,
  CREATE_PAGE_LIKE,
  GET_SIMILAR_USERS,
  CREATE_INDEXES,
};
