/**
 * Autoscaling Configuration
// Kubernetes HPA and Custom Metrics for autoscaling
 */

// =====================================================
// Kubernetes Horizontal Pod Autoscaler (HPA) Configs
// =====================================================

export const HPA_CONFIGS = {
  // Gateway HPA
  gateway: {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name: 'gateway-hpa',
      namespace: 'facebook-clone',
    },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'gateway',
      },
      minReplicas: 2,
      maxReplicas: 20,
      metrics: [
        {
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: 70,
            },
          },
        },
        {
          type: 'Resource',
          resource: {
            name: 'memory',
            target: {
              type: 'Utilization',
              averageUtilization: 80,
            },
          },
        },
      ],
      behavior: {
        scaleDown: {
          stabilizationWindowSeconds: 300,
          policies: [
            {
              type: 'Percent',
              value: 10,
              periodSeconds: 60,
            },
            {
              type: 'Pods',
              value: 2,
              periodSeconds: 60,
            },
          ],
        },
        scaleUp: {
          stabilizationWindowSeconds: 0,
          policies: [
            {
              type: 'Percent',
              value: 100,
              periodSeconds: 15,
            },
            {
              type: 'Pods',
              value: 4,
              periodSeconds: 15,
            },
          ],
        },
      },
    },
  },

  // Chat Service HPA (more aggressive scaling)
  chat: {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name: 'chat-service-hpa',
      namespace: 'facebook-clone',
    },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'chat-service',
      },
      minReplicas: 3,
      maxReplicas: 50,
      metrics: [
        {
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: 60,
            },
          },
        },
        {
          type: 'Pods',
          pods: {
            metric: {
              name: 'websocket_connections',
            },
            target: {
              type: 'AverageValue',
              averageValue: 1000,
            },
          },
        },
      ],
    },
  },

  // Feed Service HPA
  feed: {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name: 'feed-service-hpa',
      namespace: 'facebook-clone',
    },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'feed-service',
      },
      minReplicas: 3,
      maxReplicas: 30,
      metrics: [
        {
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: 70,
            },
          },
        },
      ],
    },
  },
};

// =====================================================
// Custom Metrics for Autoscaling
// =====================================================

export const CUSTOM_METRICS = {
  // WebSocket connections per pod
  websocketConnections: {
    name: 'websocket_connections',
    query: 'sum(websocket_connections{namespace="facebook-clone"}) by (pod)',
    type: 'Pods',
    target: 1000, // Scale when avg connections per pod > 1000
  },

  // Request latency
  requestLatency: {
    name: 'http_request_duration_seconds',
    query: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace="facebook-clone"}[5m])) by (le, pod))',
    type: 'Pods',
    target: 0.5, // Scale when P95 latency > 500ms
  },

  // Queue depth
  queueDepth: {
    name: 'queue_depth',
    query: 'sum(queue_depth{namespace="facebook-clone"}) by (service)',
    type: 'Object',
    target: 1000,
  },

  // Active users
  activeUsers: {
    name: 'active_users',
    query: 'sum(active_users{namespace="facebook-clone"})',
    type: 'External',
    target: 10000, // Scale when active users > 10k per instance
  },
};

// =====================================================
// Vertical Pod Autoscaler (VPA) Configs
// =====================================================

export const VPA_CONFIGS = {
  gateway: {
    apiVersion: 'autoscaling.k8s.io/v1',
    kind: 'VerticalPodAutoscaler',
    metadata: {
      name: 'gateway-vpa',
      namespace: 'facebook-clone',
    },
    spec: {
      targetRef: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'gateway',
      },
      updatePolicy: {
        updateMode: 'Auto',
      },
      resourcePolicy: {
        containerPolicies: [
          {
            containerName: 'gateway',
            minAllowed: {
              cpu: '100m',
              memory: '256Mi',
            },
            maxAllowed: {
              cpu: '2',
              memory: '4Gi',
            },
            controlledResources: ['cpu', 'memory'],
          },
        ],
      },
    },
  },
};

// =====================================================
// Cluster Autoscaler Configuration
// =====================================================

export const CLUSTER_AUTOSCALER_CONFIG = {
  // Scale up when nodes are underutilized
  scaleDownUtilizationThreshold: 0.5,
  
  // Minimum nodes in cluster
  minNodes: 3,
  
  // Maximum nodes in cluster
  maxNodes: 100,
  
  // Cooldown period before scaling down
  scaleDownCooldown: '10m',
  
  // Unneeded node grace period
  unneededNodeGracePeriod: '10m',
  
  // Node groups
  nodeGroups: [
    {
      name: 'frontend-nodes',
      minSize: 2,
      maxSize: 20,
      instanceType: 'c5.large',
      labels: {
        'node-type': 'frontend',
      },
    },
    {
      name: 'backend-nodes',
      minSize: 3,
      maxSize: 50,
      instanceType: 'c5.xlarge',
      labels: {
        'node-type': 'backend',
      },
    },
    {
      name: 'worker-nodes',
      minSize: 2,
      maxSize: 30,
      instanceType: 'm5.xlarge',
      labels: {
        'node-type': 'worker',
      },
    },
  ],
};

// =====================================================
// Predictive Autoscaling
// =====================================================

export const PREDICTIVE_AUTOSCALING = {
  enabled: true,
  
  // Historical data window for prediction
  historyWindow: '7d',
  
  // Prediction horizon
  predictionHorizon: '1h',
  
  // Confidence threshold
  confidenceThreshold: 0.8,
  
  // Peak times (pre-scale before expected traffic)
  peakTimes: [
    { hour: 8, scale: 1.5 },   // Morning
    { hour: 12, scale: 2.0 },  // Lunch
    { hour: 18, scale: 2.5 },  // Evening
    { hour: 21, scale: 3.0 },  // Prime time
  ],
  
  // Schedule-based scaling
  scheduledScaling: [
    {
      name: 'weekday-morning',
      timezone: 'America/New_York',
      recurrence: '0 6 * * MON-FRI',
      minReplicas: 10,
      maxReplicas: 30,
    },
    {
      name: 'weekday-evening',
      timezone: 'America/New_York',
      recurrence: '0 18 * * MON-FRI',
      minReplicas: 20,
      maxReplicas: 100,
    },
    {
      name: 'weekend',
      timezone: 'America/New_York',
      recurrence: '0 10 * * SAT,SUN',
      minReplicas: 15,
      maxReplicas: 80,
    },
  ],
};

// =====================================================
// Autoscaling Metrics Server
// =====================================================

export const METRICS_SERVER_CONFIG = {
  // Prometheus adapter for custom metrics
  prometheusAdapter: {
    enabled: true,
    prometheusUrl: 'http://prometheus:9090',
    metricsRelistInterval: '1m',
    
    // Custom metrics rules
    rules: [
      {
        seriesQuery: 'websocket_connections{namespace!="",pod!=""}',
        resources: {
          overrides: {
            namespace: { resource: 'namespace' },
            pod: { resource: 'pod' },
          },
        },
        name: { as: 'websocket_connections' },
        metricsQuery: 'sum(websocket_connections{namespace="<<.Namespace>>"}) by (<<.GroupBy>>)',
      },
    ],
  },
};

// =====================================================
// Cost Optimization
// =====================================================

export const COST_OPTIMIZATION = {
  // Use spot instances for worker nodes
  spotInstances: {
    enabled: true,
    maxPrice: '0.05',
    instanceTypes: ['c5.large', 'c5.xlarge', 'm5.large'],
  },
  
  // Scale to zero for development
  scaleToZero: {
    enabled: false,
    namespace: 'development',
    idleTimeout: '30m',
  },
  
  // Resource recommendations
  resourceRecommendations: {
    enabled: true,
    historyDays: 7,
    recommendationRefreshInterval: '24h',
  },
};

export default {
  HPA_CONFIGS,
  CUSTOM_METRICS,
  VPA_CONFIGS,
  CLUSTER_AUTOSCALER_CONFIG,
  PREDICTIVE_AUTOSCALING,
  METRICS_SERVER_CONFIG,
  COST_OPTIMIZATION,
};
