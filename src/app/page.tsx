// Main Facebook Clone App
// A comprehensive social media platform
// Started: Jan 2024, last updated: March 2024
// Author: Development Team

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { Feed } from '@/components/feed/Feed';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { StoryRing, StoryViewer, CreateStoryModal } from '@/components/stories';
import { ChatView } from '@/components/chat';
import { EditProfileModal, ProfileHeader, ProfileTabs, PhotoGrid, FriendsList } from '@/components/profile';
import { NotificationsPanel, NotificationBadge } from '@/components/notifications';
import { FriendRequests, FriendSuggestions } from '@/components/friends';
import { GroupsList, CreateGroupModal } from '@/components/groups';
import { EventsList, CreateEventModal } from '@/components/events';
import { ListingsGrid, CreateListingModal } from '@/components/marketplace';
import { ReelsViewer } from '@/components/reels';

// Hooks
import { useAuth, usePosts, useFriends, useNotifications, useStories, useConversations, useGroups, useEvents, useMarketplace, useReels } from '@/lib/hooks';

// Types
import type { User, Post, Story, Notification, Chat, Group, Event, MarketplaceListing, Reel } from '@/types';

// Utils
import { cn } from '@/utils/cn';

// Default user for guests
const defaultUser: User = {
  id: 'guest',
  firstName: 'Guest',
  lastName: 'User',
  email: 'guest@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
  isVerified: false,
  isOnline: true,
};

// ============ MAIN APP COMPONENT ============
export default function FacebookCloneApp() {
  // ========== API HOOKS ==========
  const { user: authUser, loading: authLoading, login, logout, setUser } = useAuth();
  const { posts, loading: postsLoading, createPost, reactToPost, commentOnPost, deletePost, refresh: refreshPosts } = usePosts();
  const { requests: friendRequests, suggestions: friendSuggestions, acceptRequest, rejectRequest, refresh: refreshFriends } = useFriends();
  const { notifications, unreadCount: notificationUnreadCount, markAsRead, refresh: refreshNotifications } = useNotifications();
  const { stories: apiStories, create: createStory, refresh: refreshStories } = useStories('feed');
  const { conversations } = useConversations();
  const { groups } = useGroups('all');
  const { events } = useEvents('upcoming');
  const { listings } = useMarketplace();
  const { reels } = useReels('feed');

  // ========== CURRENT USER ==========
  const currentUser: User = authUser || defaultUser;

  // ========== UI STATES ==========
  // Navigation
  const [currentPage, setCurrentPage] = useState('home');
  
  // Modals & Panels
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState<string | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showChat, setShowChat] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showReels, setShowReels] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  
  // Notifications & Friends
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  
  // Profile view
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [viewingUserPosts, setViewingUserPosts] = useState<Post[]>([]);
  const [profileTab, setProfileTab] = useState('Posts');

  // Story state
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewingStories, setViewingStories] = useState<Story[]>([]);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========== AUTH HANDLERS ==========
  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
  }) => {
    // Registration handled by AuthScreen component
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result;
  };

  const handleLogout = async () => {
    await logout();
    // Reset all states
    setCurrentPage('home');
    setShowCreatePost(false);
    setShowChat(null);
    setShowNotifications(false);
  };

  // ========== POST HANDLERS ==========
  const handleCreatePost = async (data: {
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    visibility?: string;
    feeling?: string;
    location?: string;
    taggedFriends?: string[];
    backgroundColor?: string;
  }) => {
    setIsSubmitting(true);
    try {
      await createPost({
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType as 'image' | 'video' | undefined,
        visibility: data.visibility || 'public',
        feeling: data.feeling,
        location: data.location,
      });
      setShowCreatePost(false);
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReact = async (postId: string, type: string) => {
    await reactToPost(postId, type);
  };

  const handleComment = async (postId: string, content: string) => {
    await commentOnPost(postId, content);
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
  };

  // ========== STORY HANDLERS ==========
  const handleViewStory = (storyId: string) => {
    // Find the story and related stories from same user
    const storyGroup = apiStories.find(group => 
      group.stories.some(s => s.id === storyId)
    );
    
    if (storyGroup) {
      setViewingStories(storyGroup.stories);
      const idx = storyGroup.stories.findIndex(s => s.id === storyId);
      setCurrentStoryIndex(idx >= 0 ? idx : 0);
      setShowStoryViewer(storyId);
    }
  };

  const handleCreateStory = async (story: { mediaUrl: string; mediaType: 'image' | 'video'; caption?: string }) => {
    await createStory({ mediaUrl: story.mediaUrl, mediaType: story.mediaType, caption: story.caption });
    setShowCreateStory(false);
  };

  const handleNextStory = () => {
    if (currentStoryIndex < viewingStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      // Close when no more stories
      setShowStoryViewer(null);
      setViewingStories([]);
      setCurrentStoryIndex(0);
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  // ========== PROFILE HANDLERS ==========
  const handleViewProfile = async (userId: string) => {
    if (userId === currentUser.id) {
      setCurrentPage('profile');
      return;
    }
    
    setViewingUserId(userId);
    // Fetch user profile
    try {
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      if (data.user) {
        setViewingUser(data.user);
        setViewingUserPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleEditProfile = async (data: Partial<User>) => {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return { error: 'Failed to update profile' };
    }
  };

  // ========== FRIEND HANDLERS ==========
  const handleAcceptFriend = async (senderId: string) => {
    await acceptRequest(senderId);
    refreshFriends();
  };

  const handleRejectFriend = async (senderId: string) => {
    await rejectRequest(senderId);
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId }),
      });
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  // ========== CHAT HANDLERS ==========
  const handleOpenChat = (userId: string) => {
    const existingChat = conversations.find(c => 
      c.participants?.some(p => p.id === userId)
    );
    if (existingChat) {
      setShowChat(existingChat.id);
    } else {
      // Create new conversation
      setShowChat(userId);
    }
  };

  const handleSendMessage = async (conversationId: string, content: string, mediaUrl?: string, mediaType?: string) => {
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, mediaUrl, mediaType }),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // ========== GROUP HANDLERS ==========
  const handleJoinGroup = async (groupId: string) => {
    try {
      await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const handleCreateGroup = async (data: { name: string; description?: string; privacy: string; coverImage?: string }) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      setShowCreateGroup(false);
      return result;
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  // ========== EVENT HANDLERS ==========
  const handleRsvpEvent = async (eventId: string, status: 'going' | 'interested' | 'not_going') => {
    try {
      await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to RSVP:', error);
    }
  };

  const handleCreateEvent = async (data: any) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      setShowCreateEvent(false);
      return result;
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  // ========== MARKETPLACE HANDLERS ==========
  const handleCreateListing = async (data: any) => {
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      setShowCreateListing(false);
      return result;
    } catch (error) {
      console.error('Failed to create listing:', error);
    }
  };

  // ========== LOADING STATE ==========
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#1877F2] rounded-full flex items-center justify-center">
            <span className="text-white text-3xl font-bold animate-pulse">f</span>
          </div>
          <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ========== AUTH SCREEN ==========
  if (!authUser) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        loading={authLoading}
      />
    );
  }

  // ========== MAIN APP ==========
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        onSearch={handleViewProfile}
        notificationCount={notificationUnreadCount}
        messageCount={conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenMessenger={() => setShowChat('list')}
        onCreatePost={() => setShowCreatePost(true)}
      />

      {/* Main Content Area */}
      <div className="pt-14 flex">
        {/* Left Sidebar - Desktop Only */}
        <aside className="hidden lg:block fixed left-0 top-14 w-[280px] h-[calc(100vh-56px)] overflow-y-auto">
          <Sidebar
            currentUser={currentUser}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            shortcuts={[
              { icon: 'users', label: 'Friends', onClick: () => setShowFriendRequests(true), badge: friendRequests.length },
              { icon: 'store', label: 'Marketplace', onClick: () => setCurrentPage('marketplace') },
              { icon: 'video', label: 'Watch', onClick: () => setShowReels(true) },
              { icon: 'calendar', label: 'Events', onClick: () => setCurrentPage('events') },
              { icon: 'users', label: 'Groups', onClick: () => setCurrentPage('groups') },
            ]}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-[280px] lg:mr-[280px]">
          <AnimatePresence mode="wait">
            {/* Home Feed */}
            {currentPage === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Stories Row */}
                {apiStories.length > 0 && (
                  <div className="bg-white border-b py-4 px-4 overflow-x-auto">
                    <div className="flex gap-2">
                      {/* Create Story */}
                      <StoryRing
                        story={{
                          id: 'create',
                          user: currentUser,
                          mediaUrl: currentUser.avatar || '',
                          createdAt: new Date().toISOString(),
                        }}
                        isCreate
                        onClick={() => setShowCreateStory(true)}
                      />
                      {/* User Stories */}
                      {apiStories.map((group, idx) => (
                        <StoryRing
                          key={group.user.id}
                          story={{
                            id: group.stories[0]?.id || `story-${idx}`,
                            user: group.user,
                            mediaUrl: group.stories[0]?.mediaUrl || '',
                            mediaType: group.stories[0]?.mediaType,
                            createdAt: group.stories[0]?.createdAt || new Date().toISOString(),
                            isViewed: group.stories[0]?.isViewed,
                          }}
                          onClick={() => handleViewStory(group.stories[0]?.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Feed */}
                <Feed
                  posts={posts}
                  loading={postsLoading}
                  currentUser={currentUser}
                  onReact={handleReact}
                  onComment={handleComment}
                  onDelete={handleDeletePost}
                  onShare={(postId) => console.log('Share:', postId)}
                  onSave={(postId) => console.log('Save:', postId)}
                  onViewProfile={handleViewProfile}
                  onCreatePost={() => setShowCreatePost(true)}
                />
              </motion.div>
            )}

            {/* Profile Page */}
            {currentPage === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ProfileHeader
                  user={viewingUser || currentUser}
                  isOwnProfile={!viewingUser || viewingUser.id === currentUser.id}
                  onEdit={() => setShowEditProfile(true)}
                  onAddFriend={() => {}}
                  onMessage={() => handleOpenChat(viewingUser?.id || currentUser.id)}
                />
                <ProfileTabs
                  activeTab={profileTab}
                  onTabChange={setProfileTab}
                />
                {profileTab === 'Posts' && (
                  <Feed
                    posts={viewingUser ? viewingUserPosts : posts.filter(p => p.author.id === currentUser.id)}
                    loading={postsLoading}
                    currentUser={currentUser}
                    onReact={handleReact}
                    onComment={handleComment}
                    onDelete={handleDeletePost}
                    onShare={() => {}}
                    onSave={() => {}}
                    onViewProfile={handleViewProfile}
                  />
                )}
                {profileTab === 'Friends' && (
                  <div className="p-4">
                    <FriendsList
                      friends={friendRequests}
                      onFriendClick={handleViewProfile}
                    />
                  </div>
                )}
                {profileTab === 'Photos' && (
                  <div className="p-4">
                    <PhotoGrid
                      photos={posts.filter(p => p.mediaUrl && p.mediaType === 'image').map(p => ({
                        id: p.id,
                        url: p.mediaUrl!,
                        caption: p.content,
                        createdAt: p.createdAt,
                      }))}
                      onPhotoClick={() => {}}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* Groups Page */}
            {currentPage === 'groups' && (
              <motion.div
                key="groups"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-2xl font-bold">Groups</h1>
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5]"
                  >
                    Create Group
                  </button>
                </div>
                <GroupsList
                  groups={groups}
                  onJoin={handleJoinGroup}
                  onLeave={handleLeaveGroup}
                />
              </motion.div>
            )}

            {/* Events Page */}
            {currentPage === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-2xl font-bold">Events</h1>
                  <button
                    onClick={() => setShowCreateEvent(true)}
                    className="px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5]"
                  >
                    Create Event
                  </button>
                </div>
                <EventsList
                  events={events}
                  onRsvp={handleRsvpEvent}
                />
              </motion.div>
            )}

            {/* Marketplace Page */}
            {currentPage === 'marketplace' && (
              <motion.div
                key="marketplace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-2xl font-bold">Marketplace</h1>
                  <button
                    onClick={() => setShowCreateListing(true)}
                    className="px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5]"
                  >
                    Create Listing
                  </button>
                </div>
                <ListingsGrid
                  listings={listings}
                  onListingClick={() => {}}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Sidebar - Desktop Only */}
        <aside className="hidden lg:block fixed right-0 top-14 w-[280px] h-[calc(100vh-56px)] overflow-y-auto p-4">
          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-500 text-sm mb-2">Friend Requests</h3>
              <FriendRequests
                requests={friendRequests.slice(0, 3)}
                onAccept={handleAcceptFriend}
                onReject={handleRejectFriend}
                maxDisplay={3}
              />
            </div>
          )}

          {/* Friend Suggestions */}
          {friendSuggestions.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-500 text-sm mb-2">People You May Know</h3>
              <FriendSuggestions
                suggestions={friendSuggestions.slice(0, 5)}
                onAddFriend={handleAddFriend}
                maxDisplay={5}
              />
            </div>
          )}

          {/* Online Contacts */}
          <div>
            <h3 className="font-semibold text-gray-500 text-sm mb-2">Contacts</h3>
            <div className="space-y-1">
              {conversations.slice(0, 8).map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleOpenChat(chat.participants?.[0]?.id || '')}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="relative">
                    <img
                      src={chat.participants?.[0]?.avatar || ''}
                      alt=""
                      className="w-9 h-9 rounded-full"
                    />
                    {chat.participants?.[0]?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    {chat.participants?.[0]?.firstName} {chat.participants?.[0]?.lastName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ========== MODALS & OVERLAYS ========== */}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onCreate={handleCreatePost}
        currentUser={currentUser}
        friends={friendSuggestions}
      />

      {/* Story Viewer */}
      <AnimatePresence>
        {showStoryViewer && viewingStories.length > 0 && (
          <StoryViewer
            story={viewingStories[currentStoryIndex]}
            onClose={() => {
              setShowStoryViewer(null);
              setViewingStories([]);
              setCurrentStoryIndex(0);
            }}
            onNext={handleNextStory}
            onPrev={handlePrevStory}
          />
        )}
      </AnimatePresence>

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onCreate={handleCreateStory}
        currentUser={currentUser}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        user={currentUser}
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSave={handleEditProfile}
      />

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <NotificationsPanel
                notifications={notifications}
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                onMarkAsRead={(id) => markAsRead(id)}
                onNotificationClick={(n) => {
                  setShowNotifications(false);
                  if (n.actor) handleViewProfile(n.actor.id);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat View */}
      <AnimatePresence>
        {showChat && (
          <ChatView
            chat={conversations.find(c => c.id === showChat) || {
              id: showChat,
              participants: [currentUser],
              unreadCount: 0,
              updatedAt: new Date().toISOString(),
            }}
            currentUser={currentUser}
            onBack={() => setShowChat(null)}
            onSendMessage={(content, mediaUrl, mediaType) => 
              handleSendMessage(showChat, content, mediaUrl, mediaType)
            }
          />
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleCreateGroup}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onCreate={handleCreateEvent}
      />

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={showCreateListing}
        onClose={() => setShowCreateListing(false)}
        onCreate={handleCreateListing}
      />

      {/* Reels Viewer */}
      <AnimatePresence>
        {showReels && reels.length > 0 && (
          <ReelsViewer
            reels={reels}
            currentIndex={reelIndex}
            onNext={() => setReelIndex(prev => Math.min(prev + 1, reels.length - 1))}
            onPrev={() => setReelIndex(prev => Math.max(prev - 1, 0))}
            onClose={() => setShowReels(false)}
            onLike={(id) => console.log('Like reel:', id)}
            onComment={(id, content) => console.log('Comment:', id, content)}
            onShare={(id) => console.log('Share reel:', id)}
            onSave={(id) => console.log('Save reel:', id)}
          />
        )}
      </AnimatePresence>

      {/* Friend Requests Panel */}
      <AnimatePresence>
        {showFriendRequests && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowFriendRequests(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">Friend Requests</h2>
                <button
                  onClick={() => setShowFriendRequests(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-96">
                <FriendRequests
                  requests={friendRequests}
                  onAccept={handleAcceptFriend}
                  onReject={handleRejectFriend}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
