/**
 * Live Stream Service
 * WebRTC-based live streaming with real-time interactions
 */

import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { RedisClient } from '../cache-system/redis';

const router = Router();
const redis = new RedisClient();

// Stream states
type StreamStatus = 'scheduled' | 'live' | 'ended';

interface LiveStream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: StreamStatus;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  viewerCount: number;
  peakViewerCount: number;
  totalViews: number;
  duration: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
  ingestUrl?: string;
  streamKey?: string;
  settings: StreamSettings;
  monetization: MonetizationSettings;
}

interface StreamSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  allowSharing: boolean;
  allowRecording: boolean;
  latencyMode: 'realtime' | 'low' | 'normal';
  quality: '720p' | '1080p' | '4k';
}

interface MonetizationSettings {
  enabled: boolean;
  ticketPrice?: number;
  currency?: string;
  maxParticipants?: number;
}

interface StreamComment {
  id: string;
  streamId: string;
  userId: string;
  content: string;
  timestamp: Date;
  isPinned: boolean;
}

interface StreamReaction {
  streamId: string;
  userId: string;
  type: 'like' | 'love' | 'wow' | 'haha' | 'sad' | 'angry';
  timestamp: Date;
}

// Active streams cache
const activeStreams = new Map<string, Set<WebSocket>>();

/**
 * Create a new live stream
 * POST /api/v1/live-streams
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { title, description, scheduledAt, settings } = req.body;

    // Generate stream key and URLs
    const streamKey = generateStreamKey();
    const ingestUrl = `rtmp://ingest.facebook-clone.com/live/${streamKey}`;
    const playbackUrl = `https://cdn.facebook-clone.com/live/${streamKey}/index.m3u8`;

    const stream: LiveStream = {
      id: generateId(),
      userId,
      title,
      description,
      status: scheduledAt ? 'scheduled' : 'live',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      startedAt: scheduledAt ? undefined : new Date(),
      viewerCount: 0,
      peakViewerCount: 0,
      totalViews: 0,
      duration: 0,
      thumbnailUrl: undefined,
      playbackUrl,
      ingestUrl,
      streamKey,
      settings: {
        isPublic: settings?.isPublic ?? true,
        allowComments: settings?.allowComments ?? true,
        allowReactions: settings?.allowReactions ?? true,
        allowSharing: settings?.allowSharing ?? true,
        allowRecording: settings?.allowRecording ?? true,
        latencyMode: settings?.latencyMode ?? 'low',
        quality: settings?.quality ?? '1080p',
      },
      monetization: {
        enabled: false,
      },
    };

    // Store stream
    await redis.hset('livestreams', stream.id, JSON.stringify(stream));

    // Notify followers
    await notifyFollowers(userId, {
      type: 'live_stream_started',
      streamId: stream.id,
      title: stream.title,
    });

    res.status(201).json({
      success: true,
      data: {
        id: stream.id,
        title: stream.title,
        status: stream.status,
        streamKey,
        ingestUrl,
        playbackUrl,
      },
    });
  } catch (error) {
    console.error('Stream creation error:', error);
    res.status(500).json({ success: false, error: 'STREAM_CREATION_FAILED' });
  }
});

/**
 * Start a scheduled stream
 * POST /api/v1/live-streams/:id/start
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);
    
    if (stream.userId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    stream.status = 'live';
    stream.startedAt = new Date();

    await redis.hset('livestreams', id, JSON.stringify(stream));
    await redis.sadd('active_streams', id);

    // Broadcast stream start
    await broadcastStreamEvent(id, 'stream_started', { streamId: id });

    res.json({ success: true, data: stream });
  } catch (error) {
    console.error('Stream start error:', error);
    res.status(500).json({ success: false, error: 'STREAM_START_FAILED' });
  }
});

/**
 * End a live stream
 * POST /api/v1/live-streams/:id/end
 */
router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);
    
    if (stream.userId !== userId) {
      return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    stream.duration = stream.startedAt 
      ? Math.floor((stream.endedAt.getTime() - new Date(stream.startedAt).getTime()) / 1000)
      : 0;

    await redis.hset('livestreams', id, JSON.stringify(stream));
    await redis.srem('active_streams', id);

    // Close all viewer connections
    const viewers = activeStreams.get(id);
    if (viewers) {
      viewers.forEach(ws => {
        ws.send(JSON.stringify({ type: 'stream_ended', streamId: id }));
      });
      activeStreams.delete(id);
    }

    // Generate VOD if recording was enabled
    if (stream.settings.allowRecording) {
      await generateVOD(stream);
    }

    res.json({ 
      success: true, 
      data: {
        id: stream.id,
        status: stream.status,
        duration: stream.duration,
        totalViews: stream.totalViews,
        peakViewerCount: stream.peakViewerCount,
      },
    });
  } catch (error) {
    console.error('Stream end error:', error);
    res.status(500).json({ success: false, error: 'STREAM_END_FAILED' });
  }
});

/**
 * Get stream details
 * GET /api/v1/live-streams/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);

    res.json({ success: true, data: stream });
  } catch (error) {
    console.error('Stream fetch error:', error);
    res.status(500).json({ success: false, error: 'STREAM_FETCH_FAILED' });
  }
});

/**
 * Get active streams
 * GET /api/v1/live-streams/active
 */
router.get('/active', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const activeStreamIds = await redis.smembers('active_streams');
    const streams: LiveStream[] = [];

    for (const id of activeStreamIds.slice(Number(offset), Number(offset) + Number(limit))) {
      const streamData = await redis.hget('livestreams', id);
      if (streamData) {
        streams.push(JSON.parse(streamData));
      }
    }

    // Sort by viewer count
    streams.sort((a, b) => b.viewerCount - a.viewerCount);

    res.json({ 
      success: true, 
      data: streams,
      pagination: {
        total: activeStreamIds.length,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    console.error('Active streams fetch error:', error);
    res.status(500).json({ success: false, error: 'ACTIVE_STREAMS_FETCH_FAILED' });
  }
});

/**
 * Join a live stream (viewer)
 * POST /api/v1/live-streams/:id/join
 */
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);
    
    if (stream.status !== 'live') {
      return res.status(400).json({ success: false, error: 'STREAM_NOT_LIVE' });
    }

    // Increment viewer count
    stream.viewerCount++;
    stream.totalViews++;
    if (stream.viewerCount > stream.peakViewerCount) {
      stream.peakViewerCount = stream.viewerCount;
    }

    await redis.hset('livestreams', id, JSON.stringify(stream));
    await redis.hset(`stream_viewers:${id}`, userId || 'anonymous', Date.now().toString());

    // Broadcast viewer joined
    await broadcastStreamEvent(id, 'viewer_joined', { viewerCount: stream.viewerCount });

    res.json({ 
      success: true, 
      data: {
        playbackUrl: stream.playbackUrl,
        viewerCount: stream.viewerCount,
        settings: stream.settings,
      },
    });
  } catch (error) {
    console.error('Stream join error:', error);
    res.status(500).json({ success: false, error: 'STREAM_JOIN_FAILED' });
  }
});

/**
 * Leave a live stream (viewer)
 * POST /api/v1/live-streams/:id/leave
 */
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 'anonymous';

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);
    
    // Decrement viewer count
    stream.viewerCount = Math.max(0, stream.viewerCount - 1);
    await redis.hset('livestreams', id, JSON.stringify(stream));
    await redis.hdel(`stream_viewers:${id}`, userId);

    // Broadcast viewer left
    await broadcastStreamEvent(id, 'viewer_left', { viewerCount: stream.viewerCount });

    res.json({ success: true, data: { viewerCount: stream.viewerCount } });
  } catch (error) {
    console.error('Stream leave error:', error);
    res.status(500).json({ success: false, error: 'STREAM_LEAVE_FAILED' });
  }
});

/**
 * Send comment in live stream
 * POST /api/v1/live-streams/:id/comments
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content } = req.body;

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);
    
    if (!stream.settings.allowComments) {
      return res.status(400).json({ success: false, error: 'COMMENTS_DISABLED' });
    }

    const comment: StreamComment = {
      id: generateId(),
      streamId: id,
      userId,
      content,
      timestamp: new Date(),
      isPinned: false,
    };

    // Store comment
    await redis.lpush(`stream_comments:${id}`, JSON.stringify(comment));
    await redis.ltrim(`stream_comments:${id}`, 0, 999); // Keep last 1000

    // Broadcast comment to all viewers
    await broadcastStreamEvent(id, 'new_comment', comment);

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ success: false, error: 'COMMENT_FAILED' });
  }
});

/**
 * Send reaction in live stream
 * POST /api/v1/live-streams/:id/react
 */
router.post('/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { type } = req.body;

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);
    
    if (!stream.settings.allowReactions) {
      return res.status(400).json({ success: false, error: 'REACTIONS_DISABLED' });
    }

    const reaction: StreamReaction = {
      streamId: id,
      userId,
      type,
      timestamp: new Date(),
    };

    // Increment reaction counter
    await redis.hincrby(`stream_reactions:${id}`, type, 1);

    // Broadcast reaction
    await broadcastStreamEvent(id, 'new_reaction', reaction);

    res.json({ success: true });
  } catch (error) {
    console.error('Reaction error:', error);
    res.status(500).json({ success: false, error: 'REACTION_FAILED' });
  }
});

/**
 * Get stream comments
 * GET /api/v1/live-streams/:id/comments
 */
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    const comments = await redis.lrange(`stream_comments:${id}`, 0, Number(limit) - 1);
    const parsedComments = comments.map(c => JSON.parse(c));

    res.json({ success: true, data: parsedComments });
  } catch (error) {
    console.error('Comments fetch error:', error);
    res.status(500).json({ success: false, error: 'COMMENTS_FETCH_FAILED' });
  }
});

/**
 * Get stream analytics
 * GET /api/v1/live-streams/:id/analytics
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;

    const streamData = await redis.hget('livestreams', id);
    if (!streamData) {
      return res.status(404).json({ success: false, error: 'STREAM_NOT_FOUND' });
    }

    const stream: LiveStream = JSON.parse(streamData);
    const reactions = await redis.hgetall(`stream_reactions:${id}`);

    res.json({
      success: true,
      data: {
        totalViews: stream.totalViews,
        peakViewerCount: stream.peakViewerCount,
        duration: stream.duration,
        reactions,
        averageViewDuration: 0, // Would calculate from actual viewer data
      },
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ success: false, error: 'ANALYTICS_FETCH_FAILED' });
  }
});

// ==================== WebSocket Server ====================

export function setupLiveStreamWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost');
    const streamId = url.searchParams.get('streamId');
    const token = url.searchParams.get('token');

    if (!streamId) {
      ws.close(4000, 'Stream ID required');
      return;
    }

    // Add to active viewers
    if (!activeStreams.has(streamId)) {
      activeStreams.set(streamId, new Set());
    }
    activeStreams.get(streamId)!.add(ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleWebSocketMessage(streamId, ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      activeStreams.get(streamId)?.delete(ws);
    });

    // Send initial state
    sendInitialState(ws, streamId);
  });
}

async function handleWebSocketMessage(streamId: string, ws: WebSocket, message: any) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    
    case 'comment':
      // Handle comment through API instead
      break;
    
    case 'reaction':
      // Handle reaction through API instead
      break;
  }
}

async function sendInitialState(ws: WebSocket, streamId: string) {
  const streamData = await redis.hget('livestreams', streamId);
  if (streamData) {
    const stream: LiveStream = JSON.parse(streamData);
    ws.send(JSON.stringify({
      type: 'stream_state',
      data: {
        viewerCount: stream.viewerCount,
        status: stream.status,
      },
    }));
  }
}

// ==================== Helper Functions ====================

function generateStreamKey(): string {
  return `sk_${Math.random().toString(36).substring(2, 15)}`;
}

function generateId(): string {
  return `ls_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function broadcastStreamEvent(streamId: string, eventType: string, data: any) {
  const viewers = activeStreams.get(streamId);
  if (viewers) {
    const message = JSON.stringify({ type: eventType, data });
    viewers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

async function notifyFollowers(userId: string, notification: any) {
  // Publish to notification queue
  await redis.lpush('notifications:queue', JSON.stringify({
    type: 'live_stream',
    userId,
    data: notification,
  }));
}

async function generateVOD(stream: LiveStream) {
  // In production, trigger video processing pipeline
  console.log(`Generating VOD for stream ${stream.id}`);
}

export default router;
