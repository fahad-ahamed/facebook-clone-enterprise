'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@apollo/client';
import { 
  Search, 
  Home, 
  Users, 
  PlayCircle, 
  Store, 
  Gamepad2, 
  Menu,
  Bell,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuth';
import { GET_USER_NOTIFICATIONS, GET_ONLINE_FRIENDS } from '@/graphql/queries/userQueries';
import { NotificationsDropdown } from './NotificationsDropdown';
import { MessagesDropdown } from './MessagesDropdown';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { data: notificationsData } = useQuery(GET_USER_NOTIFICATIONS, {
    variables: { limit: 5, unreadOnly: true },
    pollInterval: 30000, // Poll every 30 seconds
  });

  const { data: onlineFriends } = useQuery(GET_ONLINE_FRIENDS, {
    pollInterval: 60000, // Poll every minute
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setShowMessages(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notificationsData?.unreadNotificationCount || 0;

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', href: '/' },
    { id: 'friends', icon: Users, label: 'Friends', href: '/friends' },
    { id: 'watch', icon: PlayCircle, label: 'Watch', href: '/watch' },
    { id: 'marketplace', icon: Store, label: 'Marketplace', href: '/marketplace' },
    { id: 'gaming', icon: Gamepad2, label: 'Gaming', href: '/gaming' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left Section: Logo and Search */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <span className="text-blue-600 text-3xl font-bold">f</span>
            </Link>

            {/* Search Bar */}
            <div className="relative hidden md:block">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Facebook"
                className="w-60 lg:w-72 h-10 pl-10 pr-4 bg-gray-100 dark:bg-gray-700 
                         rounded-full text-sm focus:outline-none focus:ring-2 
                         focus:ring-blue-500 dark:text-white dark:placeholder-gray-400"
              />
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" 
              />
            </div>
          </div>

          {/* Center Section: Navigation */}
          <nav className="hidden lg:flex items-center justify-center flex-1 max-w-xl">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center justify-center w-24 h-12 rounded-lg transition-colors
                          ${activeNav === item.id 
                            ? 'text-blue-600 border-b-4 border-blue-600 bg-gray-100 dark:bg-gray-700' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
              >
                <item.icon className="w-6 h-6" />
              </Link>
            ))}
          </nav>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            </button>

            {/* Notifications */}
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowMessages(false);
                  setShowUserMenu(false);
                }}
                className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center 
                                 bg-red-500 text-white text-xs font-bold rounded-full px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationsDropdown 
                  notifications={notificationsData?.notifications || []}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="relative">
              <button
                onClick={() => {
                  setShowMessages(!showMessages);
                  setShowNotifications(false);
                  setShowUserMenu(false);
                }}
                className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <MessageCircle className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center 
                               bg-red-500 text-white text-xs font-bold rounded-full px-1">
                  3
                </span>
              </button>
              {showMessages && (
                <MessagesDropdown 
                  onlineFriends={onlineFriends?.onlineFriends || []}
                  onClose={() => setShowMessages(false)}
                />
              )}
            </div>

            {/* User Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                  setShowMessages(false);
                }}
                className="flex items-center gap-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={`${user.firstName} ${user.lastName}`}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              {showUserMenu && (
                <UserMenu 
                  user={user}
                  onClose={() => setShowUserMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
