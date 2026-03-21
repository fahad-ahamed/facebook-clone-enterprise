'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@apollo/client';
import {
  Users,
  Clock,
  Bookmark,
  Users2,
  Calendar,
  ChevronDown,
  Store,
  Heart,
  Settings,
  Flag,
  Gamepad2,
  Film,
} from 'lucide-react';
import { GET_USER_FRIENDS } from '@/graphql/queries/userQueries';
import type { User } from '@/types/user';

interface SidebarProps {
  user: User | null;
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
}

function SidebarItem({ href, icon, label, badge }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
      </span>
      {badge && (
        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const { data: friendsData } = useQuery(GET_USER_FRIENDS, {
    variables: { limit: 9 },
  });

  const shortcuts = [
    { id: 'friends', href: '/friends', icon: <Users className="w-5 h-5 text-blue-500" />, label: 'Friends', badge: 3 },
    { id: 'memories', href: '/memories', icon: <Clock className="w-5 h-5 text-blue-500" />, label: 'Memories' },
    { id: 'saved', href: '/saved', icon: <Bookmark className="w-5 h-5 text-purple-500" />, label: 'Saved' },
    { id: 'groups', href: '/groups', icon: <Users2 className="w-5 h-5 text-blue-500" />, label: 'Groups' },
    { id: 'video', href: '/watch', icon: <Film className="w-5 h-5 text-blue-500" />, label: 'Video' },
    { id: 'marketplace', href: '/marketplace', icon: <Store className="w-5 h-5 text-blue-500" />, label: 'Marketplace' },
    { id: 'events', href: '/events', icon: <Calendar className="w-5 h-5 text-red-500" />, label: 'Events' },
    { id: 'gaming', href: '/gaming', icon: <Gamepad2 className="w-5 h-5 text-blue-500" />, label: 'Gaming' },
    { id: 'donations', href: '/donations', icon: <Heart className="w-5 h-5 text-red-500" />, label: 'Fundraisers' },
  ];

  const friends = friendsData?.userFriends?.friends?.slice(0, 9) || [];

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar pr-2">
      <div className="space-y-1">
        {/* User Profile Link */}
        {user && (
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 ring-2 ring-blue-500 ring-offset-2">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  width={36}
                  height={36}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                  {user.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </span>
          </Link>
        )}

        {/* Shortcuts */}
        {shortcuts.map((item) => (
          <SidebarItem
            key={item.id}
            href={item.href}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
          />
        ))}

        {/* See More */}
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
            <ChevronDown className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">See More</span>
        </button>
      </div>

      {/* Divider */}
      <hr className="my-3 border-gray-200 dark:border-gray-700" />

      {/* Your Shortcuts Section */}
      <div className="px-3 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Your Shortcuts
        </h3>
      </div>

      {/* Online Friends */}
      <div className="px-3 mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Contacts
          </h3>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Friends List */}
      <div className="space-y-1">
        {friends.length > 0 ? (
          friends.map((friendData: { id: string; friend: User; isOnline?: boolean }) => {
            const friend = friendData.friend;
            return (
              <Link
                key={friend.id}
                href={`/profile/${friend.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600">
                    {friend.avatar ? (
                      <Image
                        src={friend.avatar}
                        alt={`${friend.firstName} ${friend.lastName}`}
                        width={36}
                        height={36}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                        {friend.firstName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  {/* Online indicator */}
                  {friend.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                  )}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {friend.firstName} {friend.lastName}
                </span>
              </Link>
            );
          })
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No friends online
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="px-3 mt-4 text-xs text-gray-400 dark:text-gray-500">
        <div className="flex flex-wrap gap-1">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <span>·</span>
          <Link href="/advertising" className="hover:underline">Advertising</Link>
          <span>·</span>
          <Link href="/ad-choices" className="hover:underline">Ad Choices</Link>
          <span>·</span>
          <Link href="/cookies" className="hover:underline">Cookies</Link>
          <span>·</span>
          <button className="hover:underline">More</button>
        </div>
        <p className="mt-2">Meta © {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
