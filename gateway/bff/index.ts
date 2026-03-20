/**
 * Backend for Frontend (BFF) Gateway
 * Optimized endpoints specific to frontend client needs
 * Aggregates multiple service calls into single endpoints
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { authMiddleware } from '../auth-middleware';
import { rateLimiter } from '../rate-limiter';

// BFF Services
import { HomeFeedAggregator } from './aggregators/home-feed.aggregator';
import { ProfileAggregator } from './aggregators/profile.aggregator';
import { NotificationAggregator } from './aggregators/notification.aggregator';
import { ChatAggregator } from './aggregators/chat.aggregator';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Aggregators
const homeFeedAggregator = new HomeFeedAggregator();
const profileAggregator = new ProfileAggregator();
const notificationAggregator = new NotificationAggregator();
const chatAggregator = new ChatAggregator();

/**
 * Home Feed BFF Endpoint
 * Aggregates: Feed, Stories, Friend Suggestions, Birthdays
 */
app.get('/api/bff/home', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const homeData = await homeFeedAggregator.aggregate(userId, {
      feedLimit: Number(limit),
      feedOffset: Number(offset),
      includeStories: true,
      includeSuggestions: true,
      includeBirthdays: true,
    });
    
    res.json({
      success: true,
      data: homeData,
    });
  } catch (error) {
    console.error('Home feed aggregation error:', error);
    res.status(500).json({ success: false, error: 'Failed to load home data' });
  }
});

/**
 * Profile BFF Endpoint
 * Aggregates: User Profile, Posts, Friends, Photos, Groups
 */
app.get('/api/bff/profile/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const viewerId = (req as any).user.id;
    const profileUserId = req.params.userId;
    const { tab = 'posts' } = req.query;
    
    const profileData = await profileAggregator.aggregate(profileUserId, viewerId, {
      includePosts: tab === 'posts',
      includeFriends: tab === 'friends',
      includePhotos: tab === 'photos',
      includeGroups: tab === 'groups',
      includeAbout: true,
    });
    
    res.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error('Profile aggregation error:', error);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
});

/**
 * Notifications BFF Endpoint
 * Aggregates: Notifications, Message Previews, Friend Requests
 */
app.get('/api/bff/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 20 } = req.query;
    
    const notificationData = await notificationAggregator.aggregate(userId, {
      notificationLimit: Number(limit),
      includeMessagePreviews: true,
      includeFriendRequests: true,
    });
    
    res.json({
      success: true,
      data: notificationData,
    });
  } catch (error) {
    console.error('Notification aggregation error:', error);
    res.status(500).json({ success: false, error: 'Failed to load notifications' });
  }
});

/**
 * Chat BFF Endpoint
 * Aggregates: Conversations, Online Users, Unread Counts
 */
app.get('/api/bff/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const chatData = await chatAggregator.aggregate(userId, {
      includeConversations: true,
      includeOnlineFriends: true,
      includeUnreadCounts: true,
    });
    
    res.json({
      success: true,
      data: chatData,
    });
  } catch (error) {
    console.error('Chat aggregation error:', error);
    res.status(500).json({ success: false, error: 'Failed to load chat data' });
  }
});

/**
 * Search BFF Endpoint
 * Aggregates: Search Results across all content types
 */
app.get('/api/bff/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { q, type = 'all', limit = 10 } = req.query;
    
    const searchResults = await searchAggregator.aggregate(q as string, userId, {
      type: type as string,
      limit: Number(limit),
    });
    
    res.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error('Search aggregation error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

const PORT = process.env.BFF_PORT || 4010;

app.listen(PORT, () => {
  console.log(`🎯 BFF Gateway running on port ${PORT}`);
});

export default app;
