/**
 * Service Discovery Configuration
 * Consul-based service discovery for microservices
 */

import Consul from 'consul';

// =====================================================
// Consul Configuration
// =====================================================

export const CONSUL_CONFIG = {
  host: process.env.CONSUL_HOST || 'localhost',
  port: parseInt(process.env.CONSUL_PORT || '8500'),
  secure: process.env.CONSUL_SECURE === 'true',
  defaults: {
    token: process.env.CONSUL_TOKEN,
  },
};

// =====================================================
// Service Registration
// =====================================================

interface ServiceRegistration {
  name: string;
  id: string;
  address: string;
  port: number;
  tags?: string[];
  meta?: Record<string, string>;
  check?: {
    http?: string;
    tcp?: string;
    interval: string;
    timeout: string;
    deregisterCriticalServiceAfter: string;
  };
}

export class ServiceDiscovery {
  private consul: Consul;
  private serviceId: string;
  private serviceName: string;

  constructor() {
    this.consul = new Consul(CONSUL_CONFIG);
  }

  /**
   * Register service with Consul
   */
  async registerService(service: ServiceRegistration): Promise<void> {
    await this.consul.agent.service.register({
      name: service.name,
      id: service.id,
      address: service.address,
      port: service.port,
      tags: service.tags || [],
      meta: service.meta || {},
      check: service.check || {
        http: `http://${service.address}:${service.port}/health`,
        interval: '10s',
        timeout: '5s',
        deregisterCriticalServiceAfter: '1m',
      },
    });

    this.serviceId = service.id;
    this.serviceName = service.name;

    console.log(`Service registered: ${service.name} (${service.id})`);
  }

  /**
   * Deregister service
   */
  async deregisterService(serviceId?: string): Promise<void> {
    await this.consul.agent.service.deregister(serviceId || this.serviceId);
    console.log(`Service deregistered: ${serviceId || this.serviceId}`);
  }

  /**
   * Discover service instances
   */
  async discoverService(serviceName: string): Promise<Array<{
    ID: string;
    Service: string;
    Address: string;
    Port: number;
    Tags: string[];
    Meta: Record<string, string>;
  }>> {
    const services = await this.consul.catalog.service.nodes(serviceName);
    return services.map((s: any) => ({
      ID: s.ServiceID,
      Service: s.ServiceName,
      Address: s.Address,
      Port: s.ServicePort,
      Tags: s.ServiceTags || [],
      Meta: s.ServiceMeta || {},
    }));
  }

  /**
   * Get healthy service instances only
   */
  async getHealthyInstances(serviceName: string): Promise<Array<{
    Address: string;
    Port: number;
  }>> {
    const { Health } = await this.consul.health.service(serviceName);
    
    return Health.filter((h: any) => 
      h.Checks.every((c: any) => c.Status === 'passing')
    ).map((h: any) => ({
      Address: h.Service.Address,
      Port: h.Service.Port,
    }));
  }

  /**
   * Watch for service changes
   */
  watchService(serviceName: string, callback: (instances: any[]) => void): void {
    const watch = this.consul.watch({
      method: this.consul.health.service,
      options: { service: serviceName },
    });

    watch.on('change', (data: any) => {
      const instances = data.map((d: any) => ({
        ID: d.Service.ID,
        Address: d.Service.Address,
        Port: d.Service.Port,
        Status: d.Checks.every((c: any) => c.Status === 'passing') ? 'healthy' : 'unhealthy',
      }));
      callback(instances);
    });

    watch.on('error', (err: Error) => {
      console.error(`Watch error for ${serviceName}:`, err);
    });
  }

  /**
   * Get key-value from Consul KV store
   */
  async getKV(key: string): Promise<string | undefined> {
    const result = await this.consul.kv.get(key);
    return result?.Value;
  }

  /**
   * Set key-value in Consul KV store
   */
  async setKV(key: string, value: string): Promise<void> {
    await this.consul.kv.set(key, value);
  }

  /**
   * Get all services
   */
  async listServices(): Promise<Record<string, string[]>> {
    return this.consul.agent.services();
  }
}

// =====================================================
// Service Registry
// =====================================================

export const SERVICE_REGISTRY = {
  // API Services
  gateway: {
    name: 'gateway',
    port: 4000,
    healthPath: '/health',
  },
  graphql: {
    name: 'graphql',
    port: 4002,
    healthPath: '/health',
  },
  
  // Core Services
  auth: {
    name: 'auth-service',
    port: 4010,
    healthPath: '/health',
  },
  user: {
    name: 'user-service',
    port: 4011,
    healthPath: '/health',
  },
  post: {
    name: 'post-service',
    port: 4012,
    healthPath: '/health',
  },
  feed: {
    name: 'feed-service',
    port: 4013,
    healthPath: '/health',
  },
  chat: {
    name: 'chat-service',
    port: 4014,
    healthPath: '/health',
  },
  notification: {
    name: 'notification-service',
    port: 4015,
    healthPath: '/health',
  },
  search: {
    name: 'search-service',
    port: 4016,
    healthPath: '/health',
  },
  media: {
    name: 'media-service',
    port: 4017,
    healthPath: '/health',
  },
  ads: {
    name: 'ads-service',
    port: 4018,
    healthPath: '/health',
  },
  
  // WebSocket
  websocket: {
    name: 'websocket-server',
    port: 4001,
    healthPath: '/health',
  },
};

// =====================================================
// DNS-based Service Discovery
// =====================================================

export const DNS_SERVICE_DISCOVERY = {
  /**
   * Get service URL via DNS
   */
  getServiceUrl(serviceName: string, namespace: string = 'default'): string {
    // Kubernetes DNS format
    return `${serviceName}.${namespace}.svc.cluster.local`;
  },

  /**
   * Get service URL with port
   */
  getServiceAddress(serviceName: string, port: number, namespace: string = 'default'): string {
    return `http://${serviceName}.${namespace}.svc.cluster.local:${port}`;
  },
};

// =====================================================
// Load Balancer Integration
// =====================================================

export class ServiceResolver {
  private discovery: ServiceDiscovery;
  private cache: Map<string, { instances: any[]; expiry: number }> = new Map();
  private cacheTTL = 30000; // 30 seconds

  constructor() {
    this.discovery = new ServiceDiscovery();
  }

  /**
   * Resolve service with caching
   */
  async resolve(serviceName: string): Promise<{ Address: string; Port: number } | null> {
    // Check cache
    const cached = this.cache.get(serviceName);
    if (cached && cached.expiry > Date.now()) {
      const instances = cached.instances;
      if (instances.length > 0) {
        return this.selectInstance(instances);
      }
    }

    // Fetch from discovery
    const instances = await this.discovery.getHealthyInstances(serviceName);
    
    if (instances.length === 0) {
      console.warn(`No healthy instances for service: ${serviceName}`);
      return null;
    }

    // Update cache
    this.cache.set(serviceName, {
      instances,
      expiry: Date.now() + this.cacheTTL,
    });

    return this.selectInstance(instances);
  }

  /**
   * Select instance (round-robin)
   */
  private selectInstance(instances: any[]): { Address: string; Port: number } {
    // Simple round-robin selection
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  /**
   * Get all instances for a service
   */
  async getAllInstances(serviceName: string): Promise<Array<{ Address: string; Port: number }>> {
    return this.discovery.getHealthyInstances(serviceName);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export default {
  CONSUL_CONFIG,
  ServiceDiscovery,
  SERVICE_REGISTRY,
  DNS_SERVICE_DISCOVERY,
  ServiceResolver,
};
