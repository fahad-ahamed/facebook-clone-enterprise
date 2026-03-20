# Facebook Clone

A comprehensive Facebook clone built with Next.js 16, TypeScript, Tailwind CSS 4, and Prisma ORM.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)
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
- **Personal Information** management (bio, workplace, education, etc.)
- **Username System** with uniqueness validation
- **Profile Visibility Settings** (public, friends, private)
- **Friend List & Follower/Following** counts

### Social Features
- **Posts** - Create, like, comment, share, save
- **Stories** - 24-hour ephemeral content
- **Reels** - Short-form videos
- **Reactions** - Like, Love, Haha, Wow, Sad, Angry (with viewer dialog)
- **Share Modal** - Share to timeline, message, or group

### Communication
- **Direct Messaging** with real-time updates
- **Media Sharing** in messages (photos/videos)
- **Online Status** indicators
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

### Additional Features
- **Marketplace** - Buy and sell items
- **Groups** - Create, join, manage
- **Pages** - Create and follow business pages
- **Events** - Create and RSVP to events
- **Gaming** section
- **Favorites** management
- **Notifications** system
- **Search** functionality

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **Database:** Prisma ORM with SQLite
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Email:** Resend API (optional)

## Getting Started

### Prerequisites
- Node.js 18+
- Bun (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/fahad-ahamed/facebook-clone.git
cd facebook-clone

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up the database
bun run db:push

# (Optional) Seed test users
bun run prisma/seed-users.ts

# Start development server
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

- **User** - User accounts with profile info, settings, and privacy controls
- **Post** - User posts with media, reactions, comments
- **Story** - 24-hour ephemeral content
- **Reel** - Short-form vertical videos
- **Message/Conversation** - Direct messaging system
- **Friendship/FriendRequest** - Social connections
- **Notification** - User notifications
- **Group/Page/Event** - Community features
- **MarketplaceListing** - Buy/sell marketplace

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
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/[id]/react` - Add reaction
- `POST /api/posts/[id]/comment` - Add comment

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
- `GET /api/reels` - Get reels
- `POST /api/reels` - Create reel
- `GET /api/saved-posts` - Get saved posts
- `POST /api/saved-posts` - Save/unsave post
- `POST /api/share` - Share post

### Messaging
- `GET /api/conversations` - Get conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/[id]` - Get messages
- `POST /api/conversations/[id]` - Send message

### More
- `GET /api/notifications` - Get notifications
- `GET /api/search` - Global search
- `GET /api/groups` - Groups
- `GET /api/pages` - Pages
- `GET /api/events` - Events
- `GET /api/marketplace` - Marketplace listings
- `GET /api/admin` - Admin panel

## Project Structure

```
facebook-clone/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed-users.ts      # Test user seeder
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── page.tsx       # Main application component
│   │   └── layout.tsx     # Root layout
│   ├── components/
│   │   └── ui/            # shadcn/ui components
│   └── lib/
│       ├── api.ts         # API client
│       ├── auth.ts        # Auth utilities
│       ├── db.ts          # Database client
│       ├── hooks.ts       # Custom hooks
│       └── utils.ts       # Utility functions
├── public/                 # Static assets
├── .env                    # Environment variables
└── package.json            # Dependencies
```

## Key Components

### Main Application (`page.tsx`)
- **AuthScreen** - Login/Register with email verification
- **PostItem** - Post display with reactions, comments, share
- **StoryRing/StoryViewer** - Stories feature
- **ChatView** - Messaging interface
- **ShareModal** - Share post options
- **ReactionViewersDialog** - See who reacted
- **VideoPlayer** - Adaptive quality video player
- **EditProfileModal** - Profile editing
- **CreateStoryModal** - Story creation
- **Settings Panel** - Complete settings UI

## Recent Updates

### Version 2.0 (Latest)
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Prisma](https://www.prisma.io/)
- [Lucide Icons](https://lucide.dev/)
- [Framer Motion](https://www.framer.com/motion/)
