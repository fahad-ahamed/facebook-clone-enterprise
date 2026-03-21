# Facebook Clone - Enterprise Architecture

A comprehensive Facebook clone implementation with enterprise-level architecture, featuring microservices, real-time communication, and scalable infrastructure.

## 🏗️ Architecture Overview

```
facebook/
├── apps/                    # Frontend Applications
│   ├── web/                 # Next.js Web App
│   ├── mobile/              # React Native (placeholder)
│   └── admin-dashboard/     # Admin Dashboard
│
├── gateway/                 # API Gateway Layer
│   ├── rest/                # REST API Gateway
│   ├── graphql/             # GraphQL Gateway
│   ├── auth-middleware/     # Authentication Middleware
│   └── rate-limiter/        # Rate Limiting
│
├── services/                # Microservices
│   ├── auth-service/        # Authentication & Authorization
│   ├── user-service/        # User Management
│   ├── social-graph-service/# Friends & Followers
│   ├── post-service/        # Posts & Content
│   ├── feed-system/         # Feed Ranking & Fanout
│   ├── chat-system/         # Real-time Messaging
│   ├── notification-system/ # Push & Email Notifications
│   ├── search-system/       # Elasticsearch Integration
│   ├── recommendation-system/# AI/ML Recommendations
│   ├── moderation-system/   # Content Moderation
│   ├── media-system/        # Upload & Processing
│   └── ... more
│
├── database/                # Data Layer
│   ├── sql/                 # PostgreSQL
│   ├── nosql/               # MongoDB/Cassandra
│   ├── graph-db/            # Neo4j
│   └── cache/               # Redis
│
├── infrastructure/          # DevOps
│   ├── docker/              # Docker Compose
│   ├── kubernetes/          # K8s Configurations
│   └── ci-cd/               # CI/CD Pipelines
│
└── shared/                  # Shared Code
    ├── utils/               # Utility Functions
    ├── constants/           # Constants
    ├── types/               # TypeScript Types
    └── sdk/                 # Service SDKs
```

## 🚀 Features

### Implemented Features
- ✅ User Authentication (JWT, OAuth ready)
- ✅ User Profiles & Settings
- ✅ Posts, Comments, Reactions
- ✅ Friends & Followers System
- ✅ Real-time Chat (WebSocket)
- ✅ Notifications
- ✅ Stories & Reels
- ✅ Groups & Pages
- ✅ Events & RSVP
- ✅ Marketplace
- ✅ Search System
- ✅ Feed Ranking Algorithm
- ✅ Content Moderation
- ✅ Admin Dashboard
- ✅ Rate Limiting
- ✅ Device Tracking
- ✅ Two-Factor Authentication

### Planned Features
- 🔲 Video/Live Streaming
- 🔲 Ads System
- 🔲 AI Recommendations
- 🔲 Mobile App (React Native)
- 🔲 GraphQL API

## 🛠️ Technology Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui

### Backend
- Node.js / Bun
- Express / Next.js API Routes
- Prisma ORM
- Socket.io

### Databases
- PostgreSQL (SQL)
- MongoDB (NoSQL)
- Redis (Cache)
- Neo4j (Graph DB)
- Elasticsearch (Search)

### Infrastructure
- Docker
- Kubernetes
- Kafka / RabbitMQ
- Prometheus / Grafana
- Jaeger (Tracing)

## 📦 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/fahad-ahamed/facebook-clone-enterprise.git
cd facebook-clone-enterprise

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Start databases with Docker
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Run database migrations
bunx prisma db push

# Start development server
bun dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/facebook"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"

# Email (Resend)
RESEND_API_KEY="your-resend-key"
```

## 📚 API Documentation

### Authentication
```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login
POST /api/auth/logout      # Logout
GET  /api/auth/me          # Get current user
```

### Posts
```
GET    /api/posts          # Get feed
POST   /api/posts          # Create post
DELETE /api/posts/:id      # Delete post
POST   /api/posts/:id/react # Add reaction
```

### Social
```
GET  /api/friends          # Get friends
POST /api/friends          # Send friend request
GET  /api/follow           # Get followers/following
POST /api/follow           # Follow/unfollow
```

### Chat
```
GET  /api/conversations    # Get conversations
POST /api/conversations    # Create conversation
GET  /api/conversations/:id # Get messages
POST /api/conversations/:id # Send message
```

## 🔧 Development

### Project Structure

Each service follows a consistent structure:
```
service-name/
├── index.ts           # Service entry point
├── routes/            # API routes
├── controllers/       # Request handlers
├── services/          # Business logic
├── models/            # Data models
└── tests/             # Unit tests
```

### Running Tests
```bash
bun test
```

### Linting
```bash
bun lint
```

## 🐳 Docker

### Build & Run
```bash
# Build all services
docker-compose -f infrastructure/docker/docker-compose.yml build

# Run all services
docker-compose -f infrastructure/docker/docker-compose.yml up
```

## ☸️ Kubernetes

### Deploy to K8s
```bash
kubectl apply -f infrastructure/kubernetes/
```

## 📊 Monitoring

Access monitoring dashboards:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002
- Jaeger: http://localhost:16686

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Facebook for inspiration
- All open-source contributors
- shadcn/ui for beautiful components

---

**Note**: This is a educational project and is not affiliated with Meta/Facebook.
