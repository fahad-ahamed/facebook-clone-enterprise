/**
 * Load Balancer Configuration
 * Nginx and HAProxy configurations for load balancing
 */

// =====================================================
// Nginx Upstream Configuration
// =====================================================

export const NGINX_CONFIG = `
# Nginx Load Balancer Configuration
# Facebook Clone - Production Setup

upstream gateway_cluster {
    least_conn;
    server gateway-1:4000 weight=3;
    server gateway-2:4000 weight=3;
    server gateway-3:4000 weight=3;
    
    keepalive 32;
}

upstream websocket_cluster {
    ip_hash;  # Sticky sessions for WebSocket
    server ws-1:4001;
    server ws-2:4001;
    server ws-3:4001;
}

upstream graphql_cluster {
    least_conn;
    server graphql-1:4002;
    server graphql-2:4002;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# GeoIP for location-based routing
# geoip_country /usr/share/GeoIP/GeoIP.dat;

server {
    listen 80;
    server_name api.facebook-clone.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.facebook-clone.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
    
    # Connection limits
    limit_conn conn_limit 100;
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # Auth endpoints - stricter rate limit
    location /api/v1/auth {
        limit_req zone=auth_limit burst=5 nodelay;
        
        proxy_pass http://gateway_cluster;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://gateway_cluster;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Caching for GET requests
        proxy_cache api_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key $scheme$request_method$host$request_uri;
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # GraphQL endpoint
    location /graphql {
        proxy_pass http://graphql_cluster;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Longer timeout for complex queries
        proxy_read_timeout 60s;
    }
    
    # File upload endpoints
    location /api/v1/upload {
        client_max_body_size 100M;
        
        proxy_pass http://gateway_cluster;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}

# WebSocket Server
server {
    listen 443 ssl http2;
    server_name ws.facebook-clone.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    location / {
        proxy_pass http://websocket_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket specific settings
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}

# Cache configuration
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;
`;

// =====================================================
// HAProxy Configuration
// =====================================================

export const HAPROXY_CONFIG = `
# HAProxy Load Balancer Configuration
# Facebook Clone - TCP and HTTP Load Balancing

global
    log /dev/log local0
    log /dev/log local1 notice
    maxconn 50000
    user haproxy
    group haproxy
    daemon
    
    # SSL certificates
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  http-server-close
    option  forwardfor except 127.0.0.0/8
    option  redispatch
    retries 3
    timeout http-request    10s
    timeout queue           1m
    timeout connect         10s
    timeout client          1m
    timeout server          1m
    timeout http-keep-alive 10s
    timeout check           10s
    maxconn                 30000

# Rate limiting stick-tables
frontend rate_limiter
    bind 127.0.0.1:8199
    stick-table type ip size 100k expire 30s store http_req_rate(1s),conn_cur

# HTTP Frontend
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/haproxy/ssl/cert.pem alpn h2,http/1.1
    
    # ACLs for routing
    acl is_api path_beg /api
    acl is_graphql path_beg /graphql
    acl is_websocket hdr(Upgrade) -i websocket
    acl is_auth path_beg /api/v1/auth
    
    # Rate limiting
    http-request track-sc0 src table rate_limiter
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }
    
    # Security headers
    http-response set-header X-Frame-Options DENY
    http-response set-header X-Content-Type-Options nosniff
    http-response set-header Strict-Transport-Security max-age=31536000
    
    # Routing
    use_backend websocket if is_websocket
    use_backend graphql if is_graphql
    use_backend auth if is_auth
    use_backend api if is_api
    default_backend web

# Backend: Web Application
backend web
    balance leastconn
    option httpchk GET /health
    server web1 web-1:3000 check inter 5s fall 3 rise 2
    server web2 web-2:3000 check inter 5s fall 3 rise 2
    server web3 web-3:3000 check inter 5s fall 3 rise 2

# Backend: API Gateway
backend api
    balance leastconn
    option httpchk GET /health
    http-request set-header X-Forwarded-Proto https
    
    server gateway1 gateway-1:4000 check inter 5s fall 3 rise 2 weight 100
    server gateway2 gateway-2:4000 check inter 5s fall 3 rise 2 weight 100
    server gateway3 gateway-3:4000 check inter 5s fall 3 rise 2 weight 100

# Backend: Auth Service (with circuit breaker)
backend auth
    balance leastconn
    option httpchk GET /health
    timeout server 5s
    
    server auth1 auth-1:4010 check inter 3s fall 2 rise 2
    server auth2 auth-2:4010 check inter 3s fall 2 rise 2

# Backend: GraphQL
backend graphql
    balance leastconn
    timeout server 60s
    
    server graphql1 graphql-1:4002 check
    server graphql2 graphql-2:4002 check

# Backend: WebSocket (sticky sessions)
backend websocket
    balance source
    stick-table type ip size 200k expire 30m
    stick on src
    timeout server 1h
    timeout client 1h
    
    server ws1 ws-1:4001 check
    server ws2 ws-2:4001 check
    server ws3 ws-3:4001 check

# Statistics page
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST
`;

// =====================================================
// Health Check Configuration
// =====================================================

export const HEALTH_CHECK_CONFIG = {
  interval: 5000,      // 5 seconds
  timeout: 3000,       // 3 seconds
  unhealthyThreshold: 3,
  healthyThreshold: 2,
  path: '/health',
  expectedStatus: 200,
  expectedBody: 'healthy',
};

// =====================================================
// Load Balancing Algorithms
// =====================================================

export const LB_ALGORITHMS = {
  ROUND_ROBIN: 'round_robin',
  LEAST_CONNECTIONS: 'least_conn',
  IP_HASH: 'ip_hash',
  LEAST_TIME: 'least_time',
  RANDOM: 'random',
  CONSISTENT_HASH: 'consistent_hash',
};

// =====================================================
// Service Discovery Integration
// =====================================================

export const SERVICE_DISCOVERY_CONFIG = {
  // Consul integration
  consul: {
    host: 'consul.service.consul',
    port: 8500,
    servicePrefix: 'facebook-clone-',
    healthCheckInterval: '10s',
    healthCheckTimeout: '5s',
  },
  
  // Service endpoints (discovered dynamically)
  services: {
    gateway: {
      name: 'gateway',
      port: 4000,
      instances: 3,
    },
    websocket: {
      name: 'websocket',
      port: 4001,
      instances: 3,
    },
    graphql: {
      name: 'graphql',
      port: 4002,
      instances: 2,
    },
  },
};

export default {
  NGINX_CONFIG,
  HAPROXY_CONFIG,
  HEALTH_CHECK_CONFIG,
  LB_ALGORITHMS,
  SERVICE_DISCOVERY_CONFIG,
};
