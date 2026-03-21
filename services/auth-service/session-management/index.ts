/**
 * Session Management Service
 * Handles user sessions, device tracking, and session security
 */

export interface Session {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  userAgent?: string;
  lastActive: Date;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  refreshTokenHash?: string;
}

export interface SessionConfig {
  maxSessionsPerUser: number;
  sessionTimeout: number; // milliseconds
  absoluteTimeout: number; // milliseconds
  renewOnActivity: boolean;
  trackLocation: boolean;
}

export class SessionManagementService {
  private config: SessionConfig;
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      maxSessionsPerUser: 5,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      absoluteTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
      renewOnActivity: true,
      trackLocation: true,
      ...config,
    };
  }

  /**
   * Create new session
   */
  async createSession(data: {
    userId: string;
    deviceName: string;
    deviceType: Session['deviceType'];
    browser?: string;
    os?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  }): Promise<Session> {
    // Check session limit
    const userSessionIds = this.userSessions.get(data.userId) || new Set();
    
    if (userSessionIds.size >= this.config.maxSessionsPerUser) {
      // Remove oldest session
      await this.removeOldestSession(data.userId);
    }

    const session: Session = {
      id: this.generateSessionId(),
      userId: data.userId,
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      browser: data.browser,
      os: data.os,
      ipAddress: data.ipAddress,
      location: data.location,
      userAgent: data.userAgent,
      lastActive: new Date(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout),
      isActive: true,
    };

    this.sessions.set(session.id, session);
    
    if (!this.userSessions.has(data.userId)) {
      this.userSessions.set(data.userId, new Set());
    }
    this.userSessions.get(data.userId)!.add(session.id);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (session.expiresAt < new Date()) {
      await this.invalidateSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && session.isActive) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    session.lastActive = new Date();
    
    if (this.config.renewOnActivity) {
      session.expiresAt = new Date(Date.now() + this.config.sessionTimeout);
    }

    this.sessions.set(sessionId, session);
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    this.sessions.delete(sessionId);

    const userSessionIds = this.userSessions.get(session.userId);
    if (userSessionIds) {
      userSessionIds.delete(sessionId);
    }
  }

  /**
   * Invalidate all sessions for a user (except current)
   */
  async invalidateOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    let invalidated = 0;

    for (const sessionId of sessionIds) {
      if (sessionId !== currentSessionId) {
        await this.invalidateSession(sessionId);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const count = sessionIds.size;

    for (const sessionId of sessionIds) {
      await this.invalidateSession(sessionId);
    }

    return count;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleaned = 0;
    const now = new Date();

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now || !session.isActive) {
        await this.invalidateSession(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get session count
   */
  async getSessionCount(userId?: string): Promise<number> {
    if (userId) {
      return (this.userSessions.get(userId) || new Set()).size;
    }
    return this.sessions.size;
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null && session.isActive;
  }

  // Private helper methods
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private async removeOldestSession(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    if (sessions.length > 0) {
      // Sort by last active and remove oldest
      sessions.sort((a, b) => a.lastActive.getTime() - b.lastActive.getTime());
      await this.invalidateSession(sessions[0].id);
    }
  }
}

export const sessionService = new SessionManagementService();
