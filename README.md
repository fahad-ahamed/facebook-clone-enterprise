# Facebook Clone

A comprehensive Facebook clone built with Next.js 16, TypeScript, Tailwind CSS 4, and Prisma ORM.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)
![WebSocket](https://img.shields.io/badge/WebSocket-Socket.io-010101?style=flat-square&logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Features

### Authentication & Security
- **Email/Password Registration** with email verification
- **Login/Logout** functionality
- **Password Reset** via email verification code
- **Two-Factor Authentication** support (database ready)
- **Session Management** with secure cookies
- **Device Session Tracking** - See where you're logged in

### User Profile
- **Profile Picture & Cover Photo** upload
- **Personal Information** management (bio, workplace, education, country, etc.)
- **Username System** with uniqueness validation
- **Country Selection** - Choose from 45+ countries
- **Profile Visibility Settings** (public, friends, private)
- **Friend List & Follower/Following** counts
- **Profile Lock System** - Lock profile to restrict non-friends from viewing details
- **Blue Badge Verification** - Request verification for authenticity

### Social Features
- **Posts** - Create, like, comment, share, save
- **Stories** - 24-hour ephemeral content
- **Reels** - Short-form videos
- **Reactions** - Like, Love, Haha, Wow, Sad, Angry (with viewer dialog)
- **Share Modal** - Share to timeline, message, or group

### Post Privacy System
- **Public** - Everyone can see
- **Friends** - Only friends can see
- **Friends Except** - Friends except specific people
- **Specific Friends** - Only selected friends
- **Only Me** - Private post

### Media Delete Protection
- Only post author can delete their own posts
- Only story author can delete their own stories
- Only reel author can delete their own reels

### Comment System
- Post comments with proper authorship
- Delete permissions: Comment author OR Post author can delete comments
- Nested replies support

### Optimized Search
- Search by username (prefix with @)
- Search by name, email
- Search posts by content
- Visibility-aware search results
- Categorized results (Users, Posts, Groups, Pages, Events, Marketplace)

### Messaging System (NEW!)
- **Real-time Messaging** via WebSocket (Socket.io)
- **Audio & Video Calls** with WebRTC signaling
  - Call states: Calling, Ringing, Connected, Ended, Missed, Declined
  - Call duration tracking
  - Full-screen call UI with avatar display
- **Voice Messages** 
  - Record and send voice messages
  - Waveform visualization
  - Duration display
  - Playback controls
- **File Attachments**
  - Photos (image/jpeg, image/png, image/gif, image/webp)
  - Videos (video/mp4, video/webm, video/quicktime)
  - Documents (PDF, DOC, DOCX, TXT)
  - File size and name display
- **Message Delivery Status**
  - ✓ Sent (single gray check)
  - ✓✓ Delivered (double gray check)
  - ✓✓ Read (double blue check)
- **Typing Indicators** - Real-time typing status
- **End-to-End Encryption** indicator with lock icon
- **Online/Offline Status** indicators
- **Message Requests** settings

### Friends System
- **Friend Requests** - Send, accept, reject
- **Friend Suggestions** based on mutual friends
- **Block/Unblock** users
- **Remove Friends** functionality

### Video & Media
- **Adaptive Video Quality** - Auto, 1080p, 720p, 480p, 360p
- **Network Speed Detection** for optimal quality
- **Original Quality Upload** - No compression
- **File Size Display** during upload

### Settings & Privacy
- **Dark Mode** toggle
- **Active Status** visibility control
- **Notification Preferences**
- **Sound Settings**
- **Autoplay Videos** toggle
- **Audience & Visibility** controls
- **Who Can Send Friend Requests** settings
- **Who Can Message You** settings
- **Profile Lock** toggle
- **Blue Badge Request** system

### Additional Features
- **Marketplace** - Buy and sell items
- **Groups** - Create, join, manage
- **Pages** - Create and follow business pages
- **Events** - Create and RSVP to events
- **Gaming** section
- **Favorites** management
- **Notifications** system

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **Database:** Prisma ORM with SQLite
- **Real-time:** Socket.io for WebSocket communication
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Email:** Resend API (optional)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   REST API      │────▶│   SQLite DB     │
│   (Port 3000)   │     │   /api/*        │     │   (Prisma)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │ WebSocket
        ▼
┌─────────────────┐
│  Socket.io      │
│  (Port 3003)    │
│  Real-time Chat │
└─────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- Bun (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/facebook-clone.git
cd facebook-clone

# Install dependencies
bun install

# Install mini-service dependencies
cd mini-services/chat-service && bun install && cd ../..

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up the database
bun run db:push

# (Optional) Seed test users
bun run prisma/seed-users.ts

# Start development server (Next.js auto-starts)
# Start WebSocket service manually:
cd mini-services/chat-service && bun run dev &

# Or run everything with:
bun run dev
```

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="file:./dev.db"
RESEND_API_KEY="re_xxxxxxxx"  # Optional: Get from https://resend.com
SESSION_SECRET="your-secret-key-here"
```

## Database Schema

The project uses Prisma with the following main models:

- **User** - User accounts with profile info, settings, privacy controls, country, badge type, profile lock
- **Post** - User posts with media, reactions, comments, custom visibility
- **Story** - 24-hour ephemeral content
- **Reel** - Short-form vertical videos
- **Message/Conversation** - Direct messaging system with encryption support
- **Call** - Audio/Video call records with duration tracking
- **Friendship/FriendRequest** - Social connections
- **Notification** - User notifications
- **Group/Page/Event** - Community features
- **MarketplaceListing** - Buy/sell marketplace
- **VerificationRequest** - Blue badge verification requests

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password

### Posts
- `GET /api/posts` - Get feed posts
- `POST /api/posts` - Create post
- `DELETE /api/posts/[id]` - Delete post (author only)
- `POST /api/posts/[id]/react` - Add reaction
- `POST /api/posts/[id]/comment` - Add comment
- `DELETE /api/posts/[id]/comment` - Delete comment (author or post owner)

### Users
- `GET /api/users` - Search users
- `GET /api/users/[id]` - Get user profile
- `PUT /api/users` - Update profile
- `GET /api/users/check-username` - Check username availability

### Social
- `GET /api/friends` - Get friends/requests/suggestions
- `POST /api/friends` - Send/accept/reject friend request
- `GET /api/follow` - Get followers/following
- `POST /api/follow` - Follow/unfollow user
- `POST /api/block` - Block/unblock user

### Content
- `GET /api/stories` - Get stories
- `POST /api/stories` - Create story
- `DELETE /api/stories` - Delete story (author only)
- `GET /api/reels` - Get reels
- `POST /api/reels` - Create reel
- `DELETE /api/reels` - Delete reel (author only)
- `GET /api/saved-posts` - Get saved posts
- `POST /api/saved-posts` - Save/unsave post
- `POST /api/share` - Share post

### Messaging
- `GET /api/conversations` - Get conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/[id]` - Get messages
- `POST /api/conversations/[id]` - Send message

### WebSocket Events (Port 3003)
- `auth` - Authenticate user
- `join-conversation` - Join a chat room
- `typing-start/typing-stop` - Typing indicators
- `send-message` - Send real-time message
- `message-delivered` - Delivery confirmation
- `message-read` - Read receipt
- `call-initiate` - Start audio/video call
- `call-answer/call-decline/call-end` - Call handling
- `webrtc-offer/webrtc-answer/webrtc-ice-candidate` - WebRTC signaling

### Search
- `GET /api/search` - Global search (users, posts, groups, pages, events, marketplace)

### Verification
- `POST /api/verification` - Submit verification request
- `GET /api/verification` - Get verification status
- `PUT /api/verification` - Admin approve/reject

### More
- `GET /api/notifications` - Get notifications
- `GET /api/groups` - Groups
- `GET /api/pages` - Pages
- `GET /api/events` - Events
- `GET /api/marketplace` - Marketplace listings
- `GET /api/admin` - Admin panel

## Project Structure

```
facebook-clone/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed-users.ts          # Test user seeder
├── mini-services/
│   └── chat-service/
│       ├── index.ts           # Socket.io WebSocket server
│       └── package.json       # Service dependencies
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── posts/         # Posts endpoints
│   │   │   ├── conversations/ # Messaging endpoints
│   │   │   ├── friends/       # Friends system
│   │   │   ├── stories/       # Stories endpoints
│   │   │   ├── reels/         # Reels endpoints
│   │   │   ├── users/         # User management
│   │   │   ├── search/        # Search functionality
│   │   │   ├── groups/        # Groups endpoints
│   │   │   ├── pages/         # Pages endpoints
│   │   │   ├── events/        # Events endpoints
│   │   │   ├── marketplace/   # Marketplace endpoints
│   │   │   ├── notifications/ # Notifications
│   │   │   ├── verification/  # Blue badge verification
│   │   │   ├── admin/         # Admin panel
│   │   │   ├── block/         # Block users
│   │   │   ├── follow/        # Follow system
│   │   │   ├── saved-posts/   # Saved posts
│   │   │   ├── share/         # Share posts
│   │   │   └── analytics/     # Analytics
│   │   ├── page.tsx           # Main application component
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       ├── api.ts             # API client
│       ├── auth.ts            # Auth utilities
│       ├── db.ts              # Database client
│       ├── hooks.ts           # Custom hooks
│       ├── jwt.ts             # JWT utilities
│       ├── email.ts           # Email service
│       ├── rate-limit.ts      # Rate limiting
│       ├── feed-ranking.ts    # Feed algorithm
│       ├── auth-store.ts      # Auth state management
│       └── utils.ts           # Utility functions
├── public/                     # Static assets
├── .env                        # Environment variables
├── Caddyfile                   # Gateway configuration
└── package.json                # Dependencies
```

## Key Components

### Main Application (`page.tsx`)
- **AuthScreen** - Login/Register with email verification
- **PostItem** - Post display with reactions, comments, share
- **StoryRing/StoryViewer** - Stories feature
- **ChatView** - Messaging interface with:
  - Audio/Video call UI
  - Voice message recording
  - File attachments
  - Message status indicators
  - Typing indicators
  - E2E encryption badge
- **ShareModal** - Share post options
- **ReactionViewersDialog** - See who reacted
- **VideoPlayer** - Adaptive quality video player
- **EditProfileModal** - Profile editing with country selection
- **CreateStoryModal** - Story creation
- **Settings Panel** - Complete settings UI including profile lock and verification

## Recent Updates

### Version 4.0 (Latest)
- ✅ Audio & Video Call system in messaging
- ✅ Voice message recording with waveform visualization
- ✅ File/document/photo/video attachments in chat
- ✅ Message delivery status (✓ sent, ✓✓ delivered, ✓✓ blue read)
- ✅ Typing indicators
- ✅ End-to-end encryption indicator
- ✅ WebSocket service with Socket.io

### Version 3.0
- ✅ Country system with 45+ countries selection
- ✅ Optimized search (username, name, posts)
- ✅ Media delete protection (author only)
- ✅ Comment delete system (post owner or comment author)
- ✅ Post privacy system (Public, Friends, Friends Except, Specific Friends, Only Me)
- ✅ Profile lock system like Facebook
- ✅ Blue badge verification request system

### Version 2.0
- ✅ Added Share Modal with multiple share options
- ✅ Added Reaction Viewers Dialog to see who reacted
- ✅ Fixed Create Post Modal UI (sticky footer, proper overflow)
- ✅ Added Original Quality Upload (no compression)
- ✅ Added Video Quality Selector with network detection
- ✅ Added File Size Display during upload

### Version 1.0
- Initial release with core features
- Authentication system
- Posts, Stories, Reels
- Friends system
- Messaging
- Settings & Privacy

## WebSocket Service

The chat service runs on port 3003 and provides real-time features:

```typescript
// Connect to WebSocket
const socket = io('/?XTransformPort=3003')

// Authenticate
socket.emit('auth', { userId, username, avatar, conversations })

// Send message
socket.emit('send-message', { conversationId, content, ... })

// Typing indicator
socket.emit('typing-start', { conversationId, userId, userName })

// Call signaling
socket.emit('call-initiate', { callId, conversationId, callType, ... })
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Prisma](https://www.prisma.io/)
- [Socket.io](https://socket.io/)
- [Lucide Icons](https://lucide.dev/)
- [Framer Motion](https://www.framer.com/motion/)
