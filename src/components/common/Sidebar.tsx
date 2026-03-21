// Left sidebar - navigation and shortcuts

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Home, Users, Briefcase, ShoppingBag, Gamepad2, Heart,
  UsersRound, Calendar, Clock, ChevronDown, Bookmark, Flag
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getInitials } from '@/utils/stringUtils';
import type { User } from '@/types';

interface SidebarProps {
  currentUser: User;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'friends', icon: Users, label: 'Friends' },
  { id: 'watch', icon: Gamepad2, label: 'Watch' },
  { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { id: 'groups', icon: UsersRound, label: 'Groups' },
  { id: 'gaming', icon: Gamepad2, label: 'Gaming' },
];

export function Sidebar({ currentUser, currentPage, onNavigate }: SidebarProps) {
  return (
    <div className="w-[360px] h-full overflow-y-auto p-2">
      {/* Profile link */}
      <button
        onClick={() => onNavigate('profile')}
        className={cn(
          "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors",
          currentPage === 'profile' ? "bg-gray-100" : "hover:bg-gray-100"
        )}
      >
        <Avatar className="w-9 h-9">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback>{getInitials(currentUser.firstName, currentUser.lastName)}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-[15px]">
          {currentUser.firstName} {currentUser.lastName}
        </span>
      </button>

      {/* Navigation items */}
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors",
            currentPage === item.id ? "bg-gray-100" : "hover:bg-gray-100"
          )}
        >
          <div className="w-9 h-9 flex items-center justify-center">
            <item.icon className="w-7 h-7 text-[#1877F2]" />
          </div>
          <span className="font-medium text-[15px]">{item.label}</span>
        </button>
      ))}

      {/* See more */}
      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100">
        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
          <ChevronDown className="w-5 h-5" />
        </div>
        <span className="font-medium text-[15px]">See more</span>
      </button>

      <hr className="my-2" />

      {/* Shortcuts section */}
      <div className="px-2 mb-2">
        <h3 className="text-[17px] font-semibold text-gray-500">Your shortcuts</h3>
      </div>

      {/* Shortcuts */}
      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100">
        <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center">
          <Heart className="w-5 h-5 text-pink-500" />
        </div>
        <span className="text-[15px]">Dating</span>
      </button>

      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100">
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
          <Bookmark className="w-5 h-5 text-blue-500" />
        </div>
        <span className="text-[15px]">Saved</span>
      </button>

      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100">
        <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
          <Flag className="w-5 h-5 text-orange-500" />
        </div>
        <span className="text-[15px]">Pages</span>
      </button>

      <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100">
        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-5 h-5 text-purple-500" />
        </div>
        <span className="text-[15px]">Events</span>
      </button>
    </div>
  );
}
