/**
 * Scaling Manager
 * Manages horizontal scaling for WebSocket cluster
 * 
 * Features:
 * - Instance discovery and registration
 * - Load balancing coordination
 * - Sticky sessions support
 * - Instance health monitoring
 * - Graceful instance shutdown
 * - Connection rebalancing
 */

import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import { Logger } from '../../services/observability/index';

interface InstanceInfo {
  id: string;
  host: string;
  port: number;
  startedAt: number;
  lastHeartbeat: number;
  connections: number;
  maxConnections: number;
  cpu: number;
  memory: number;
  status: 'starting' | 'healthy' | 'draining' | 'unhealthy';
  version: string;
  region?: string;
  zone?: string;
}

interface ScalingConfig {
  instanceId: string;
  host: string;
  port: number;
  maxConnections: number;
  heartbeatInterval: number;
  healthCheckInterval: number;
  drainTimeout: number;
  region?: string;
  zone?: string;
}

const defaultConfig: Omit<ScalingConfig, 'instanceId'> = {
  host: process.env.POD_IP || 'localhost',
  port: parseInt(process.env.WS_PORT || '4000', 10),
  maxConnections: parseInt(process.env.MAX_WS_CONNECTIONS || '100000', 10),
  heartbeatInterval: 5000,
  healthCheckInterval: 10000,
  drainTimeout: 30000,
  region: process.env.REGION,
  zone: process.env.ZONE,
};

export class ScalingManager {
  private io: Server;
  private pubClient: Redis;
  private subClient: Redis;
  private config: ScalingConfig;
  private instanceInfo: InstanceInfo;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private readonly keys = {
    instances: 'ws:scaling:instances',
    instance: (id: string) => `ws:scaling:instance:${id}`,
    routing: 'ws:scaling:routing',
    metrics: 'ws:scaling:metrics',
  };

  constructor(
    io: Server,
    pubClient?: Redis,
    subClient?: Redis,
    config?: Partial<ScalingConfig>
  ) {
    this.io = io;
    this.pubClient = pubClient || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subClient = subClient || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.config = {
      ...defaultConfig,
      ...config,
      instanceId: config?.instanceId || this.generateInstanceId(),
    };

    this.instanceInfo = {
      id: this.config.instanceId,
      host: this.config.host,
      port: this.config.port,
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
      connections: 0,
      maxConnections: this.config.maxConnections,
      cpu: 0,
      memory: 0,
      status: 'starting',
      version: process.env.npm_package_version || '1.0.0',
      region: this.config.region,
      zone: this.config.zone,
    };
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    const hostname = require('os').hostname();
    const pid = process.pid;
    const random = Math.random().toString(36).substr(2, 9);
    return `${hostname}-${pid}-${random}`;
  }

  /**
   * Start scaling manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.instanceInfo.status = 'healthy';

    // Register instance
    await this.registerInstance();

    // Start heartbeat
    this.startHeartbeat();

    // Start health check
    this.startHealthCheck();

    // Subscribe to scaling commands
    await this.subscribeToCommands();

    Logger.info(`Scaling manager started for instance ${this.config.instanceId}`);
  }

  /**
   * Stop scaling manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Deregister instance
    await this.deregisterInstance();

    Logger.info(`Scaling manager stopped for instance ${this.config.instanceId}`);
  }

  /**
   * Register instance in Redis
   */
  private async registerInstance(): Promise<void> {
    const key = this.keys.instance(this.config.instanceId);
    
    await this.pubClient.hset(key, {
      id: this.instanceInfo.id,
      host: this.instanceInfo.host,
      port: this.instanceInfo.port.toString(),
      startedAt: this.instanceInfo.startedAt.toString(),
      lastHeartbeat: this.instanceInfo.lastHeartbeat.toString(),
      connections: this.instanceInfo.connections.toString(),
      maxConnections: this.instanceInfo.maxConnections.toString(),
      cpu: this.instanceInfo.cpu.toString(),
      memory: this.instanceInfo.memory.toString(),
      status: this.instanceInfo.status,
      version: this.instanceInfo.version,
      region: this.instanceInfo.region || '',
      zone: this.instanceInfo.zone || '',
    });

    // Add to instances set
    await this.pubClient.sadd(this.keys.instances, this.config.instanceId);

    // Set expiration
    await this.pubClient.expire(key, 60);

    Logger.debug(`Instance registered: ${this.config.instanceId}`);
  }

  /**
   * Deregister instance from Redis
   */
  private async deregisterInstance(): Promise<void> {
    const key = this.keys.instance(this.config.instanceId);

    // Remove from instances set
    await this.pubClient.srem(this.keys.instances, this.config.instanceId);

    // Delete instance info
    await this.pubClient.del(key);

    Logger.debug(`Instance deregistered: ${this.config.instanceId}`);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      // Update instance metrics
      await this.updateMetrics();

      // Update heartbeat
      const key = this.keys.instance(this.config.instanceId);
      this.instanceInfo.lastHeartbeat = Date.now();
      this.instanceInfo.connections = this.io.sockets.sockets.size;

      await this.pubClient.hset(key, {
        lastHeartbeat: this.instanceInfo.lastHeartbeat.toString(),
        connections: this.instanceInfo.connections.toString(),
        cpu: this.instanceInfo.cpu.toString(),
        memory: this.instanceInfo.memory.toString(),
        status: this.instanceInfo.status,
      });

      // Extend expiration
      await this.pubClient.expire(key, 60);
    } catch (error) {
      Logger.error('Heartbeat failed:', error);
    }
  }

  /**
   * Update instance metrics
   */
  private async updateMetrics(): Promise<void> {
    // Get CPU usage
    const usage = process.cpuUsage();
    this.instanceInfo.cpu = (usage.user + usage.system) / 1000000; // Convert to seconds

    // Get memory usage
    const memUsage = process.memoryUsage();
    this.instanceInfo.memory = memUsage.heapUsed / memUsage.heapTotal;
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkClusterHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Check cluster health
   */
  private async checkClusterHealth(): Promise<void> {
    try {
      const instanceIds = await this.pubClient.smembers(this.keys.instances);
      const now = Date.now();
      const staleThreshold = 30000; // 30 seconds

      for (const instanceId of instanceIds) {
        if (instanceId === this.config.instanceId) {
          continue;
        }

        const key = this.keys.instance(instanceId);
        const lastHeartbeat = await this.pubClient.hget(key, 'lastHeartbeat');

        if (lastHeartbeat) {
          const heartbeatTime = parseInt(lastHeartbeat);
          if (now - heartbeatTime > staleThreshold) {
            // Instance is stale, remove it
            Logger.warn(`Removing stale instance: ${instanceId}`);
            await this.pubClient.srem(this.keys.instances, instanceId);
            await this.pubClient.del(key);
          }
        }
      }
    } catch (error) {
      Logger.error('Health check failed:', error);
    }
  }

  /**
   * Subscribe to scaling commands
   */
  private async subscribeToCommands(): Promise<void> {
    const channel = `ws:scaling:commands:${this.config.instanceId}`;
    await this.subClient.subscribe(channel);

    this.subClient.on('message', async (ch, message) => {
      if (ch === channel) {
        await this.handleCommand(JSON.parse(message));
      }
    });
  }

  /**
   * Handle scaling command
   */
  private async handleCommand(command: {
    type: string;
    payload?: any;
  }): Promise<void> {
    switch (command.type) {
      case 'drain':
        await this.startDraining();
        break;
      case 'rebalance':
        await this.handleRebalance(command.payload);
        break;
      case 'health_check':
        await this.reportHealth();
        break;
      default:
        Logger.warn(`Unknown command: ${command.type}`);
    }
  }

  /**
   * Start draining connections
   */
  async startDraining(): Promise<void> {
    Logger.info(`Starting drain mode for instance ${this.config.instanceId}`);
    this.instanceInfo.status = 'draining';

    // Update status in Redis
    const key = this.keys.instance(this.config.instanceId);
    await this.pubClient.hset(key, 'status', 'draining');

    // Notify clients to reconnect
    this.io.emit('server:draining', {
      message: 'Server is draining connections',
      reconnectDelay: 1000,
    });

    // Wait for connections to drain or timeout
    const startTime = Date.now();
    while (
      this.io.sockets.sockets.size > 0 &&
      Date.now() - startTime < this.config.drainTimeout
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Disconnect remaining connections
    for (const socket of this.io.sockets.sockets.values()) {
      socket.disconnect(true);
    }
  }

  /**
   * Handle rebalance command
   */
  private async handleRebalance(payload: {
    targetInstance?: string;
    percentage?: number;
  }): Promise<void> {
    Logger.info(`Rebalancing connections: ${JSON.stringify(payload)}`);

    // In a real implementation, this would coordinate with the load balancer
    // to redirect connections to other instances
  }

  /**
   * Report health status
   */
  private async reportHealth(): Promise<void> {
    const health = {
      instanceId: this.config.instanceId,
      status: this.instanceInfo.status,
      connections: this.io.sockets.sockets.size,
      cpu: this.instanceInfo.cpu,
      memory: this.instanceInfo.memory,
      uptime: Date.now() - this.instanceInfo.startedAt,
    };

    await this.pubClient.publish(
      `ws:scaling:health:${this.config.instanceId}`,
      JSON.stringify(health)
    );
  }

  /**
   * Get all instances
   */
  async getAllInstances(): Promise<InstanceInfo[]> {
    const instanceIds = await this.pubClient.smembers(this.keys.instances);
    const instances: InstanceInfo[] = [];

    for (const instanceId of instanceIds) {
      const info = await this.getInstance(instanceId);
      if (info) {
        instances.push(info);
      }
    }

    return instances;
  }

  /**
   * Get specific instance info
   */
  async getInstance(instanceId: string): Promise<InstanceInfo | null> {
    const key = this.keys.instance(instanceId);
    const data = await this.pubClient.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      id: data.id,
      host: data.host,
      port: parseInt(data.port),
      startedAt: parseInt(data.startedAt),
      lastHeartbeat: parseInt(data.lastHeartbeat),
      connections: parseInt(data.connections),
      maxConnections: parseInt(data.maxConnections),
      cpu: parseFloat(data.cpu),
      memory: parseFloat(data.memory),
      status: data.status as InstanceInfo['status'],
      version: data.version,
      region: data.region || undefined,
      zone: data.zone || undefined,
    };
  }

  /**
   * Get best instance for new connection
   */
  async getBestInstance(): Promise<InstanceInfo | null> {
    const instances = await this.getAllInstances();
    
    // Filter healthy instances
    const healthyInstances = instances.filter(
      i => i.status === 'healthy' && i.connections < i.maxConnections
    );

    if (healthyInstances.length === 0) {
      return null;
    }

    // Sort by connections (least loaded first)
    healthyInstances.sort((a, b) => a.connections - b.connections);

    return healthyInstances[0];
  }

  /**
   * Get cluster statistics
   */
  async getClusterStats(): Promise<{
    totalInstances: number;
    healthyInstances: number;
    drainingInstances: number;
    totalConnections: number;
    maxConnections: number;
    averageCpu: number;
    averageMemory: number;
  }> {
    const instances = await this.getAllInstances();

    const stats = {
      totalInstances: instances.length,
      healthyInstances: 0,
      drainingInstances: 0,
      totalConnections: 0,
      maxConnections: 0,
      averageCpu: 0,
      averageMemory: 0,
    };

    let totalCpu = 0;
    let totalMemory = 0;

    for (const instance of instances) {
      stats.totalConnections += instance.connections;
      stats.maxConnections += instance.maxConnections;
      totalCpu += instance.cpu;
      totalMemory += instance.memory;

      if (instance.status === 'healthy') {
        stats.healthyInstances++;
      } else if (instance.status === 'draining') {
        stats.drainingInstances++;
      }
    }

    if (instances.length > 0) {
      stats.averageCpu = totalCpu / instances.length;
      stats.averageMemory = totalMemory / instances.length;
    }

    return stats;
  }

  /**
   * Get current instance info
   */
  getCurrentInstance(): InstanceInfo {
    return { ...this.instanceInfo };
  }

  /**
   * Check if instance can accept connections
   */
  canAcceptConnections(): boolean {
    return (
      this.instanceInfo.status === 'healthy' &&
      this.instanceInfo.connections < this.instanceInfo.maxConnections
    );
  }

  /**
   * Get instance load percentage
   */
  getLoadPercentage(): number {
    return (this.instanceInfo.connections / this.instanceInfo.maxConnections) * 100;
  }

  /**
   * Broadcast message across all instances
   */
  async broadcastGlobal(event: string, data: any): Promise<void> {
    await this.pubClient.publish(
      'ws:scaling:broadcast',
      JSON.stringify({ event, data })
    );
  }

  /**
   * Send message to specific user across all instances
   */
  async sendToUserGlobal(userId: string, event: string, data: any): Promise<void> {
    await this.pubClient.publish(
      'ws:scaling:user:message',
      JSON.stringify({ userId, event, data })
    );
  }
}

export { InstanceInfo, ScalingConfig };
