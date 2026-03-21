// Top navigation bar
// Logo, search, and user controls

import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, MessageCircle, Bell, Menu, Home, Users, 
  ShoppingBag, UsersRound, Gamepad2, ChevronDown
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import type { User } from '@/types';

interface NavbarProps {
  currentUser: User | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenMessenger: () => void;
  onOpenNotifications: () => void;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  onLogout: () => void;
}

export function Navbar({
  currentUser,
  currentPage,
  onNavigate,
  onOpenMessenger,
  onOpenNotifications,
  unreadMessageCount,
  unreadNotificationCount,
  onLogout,
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navIcons = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'friends', icon: Users, label: 'Friends' },
    { id: 'watch', icon: Gamepad2, label: 'Watch' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { id: 'groups', icon: UsersRound, label: 'Groups' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Would navigate to search results
      console.log('Search:', searchQuery);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 px-4">
      <div className="h-full flex items-center justify-between max-w-[2520px] mx-auto">
        {/* Left section - Logo and search */}
        <div className="flex items-center gap-2">
          {/* Logo */}
          <button 
            onClick={() => onNavigate('home')}
            className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center"
          >
            <span className="text-white text-2xl font-bold">f</span>
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search Facebook"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[240px] h-10 pl-9 bg-gray-100 border-0 rounded-full focus:ring-0 focus:bg-white focus:shadow"
            />
          </form>
        </div>

        {/* Center - Nav icons */}
        <nav className="hidden md:flex items-center h-full">
          {navIcons.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "h-full px-10 flex items-center justify-center border-b-4 transition-all",
                currentPage === item.id 
                  ? "border-[#1877F2] text-[#1877F2]" 
                  : "border-transparent text-gray-500 hover:bg-gray-100"
              )}
            >
              <item.icon className="w-6 h-6" />
            </button>
          ))}
        </nav>

        {/* Right - Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile menu */}
          <button className="md:hidden w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Menu className="w-5 h-5" />
          </button>

          {/* Messenger */}
          <button
            onClick={onOpenMessenger}
            className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessageCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </Badge>
            )}
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </Badge>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="text-xs">
                  {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : '?'}
                </AvatarFallback>
              </Avatar>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border overflow-hidden">
                {/* Profile section */}
                <button
                  onClick={() => { onNavigate('profile'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100"
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={currentUser?.avatar} />
                    <AvatarFallback>
                      {currentUser ? getInitials(currentUser.firstName, currentUser.lastName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-semibold">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">See your profile</p>
                  </div>
                </button>

                <hr />

                {/* Settings */}
                <button
                  onClick={() => { onNavigate('settings'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Settings & privacy</p>
                  </div>
                </button>

                {/* Help */}
                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-100">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Help & support</p>
                  </div>
                </button>

                {/* Logout */}
                <button
                  onClick={() => { onLogout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Log Out</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
