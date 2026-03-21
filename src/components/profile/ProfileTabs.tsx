// Profile tabs navigation - allows switching between profile sections
// Inspired by Facebook's profile tab layout

'use client';

import { motion } from 'framer-motion';
import { FileText, Users, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ProfileTabType = 'posts' | 'about' | 'friends' | 'photos';

interface ProfileTab {
  id: ProfileTabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: ProfileTab[] = [
  { id: 'posts', label: 'Posts', icon: <Grid3X3 className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <FileText className="w-4 h-4" /> },
  { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
  { id: 'photos', label: 'Photos', icon: <ImageIcon className="w-4 h-4" /> },
];

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="bg-white rounded-lg shadow mt-4 overflow-hidden">
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-6 py-3 font-medium transition-colors",
              "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
              activeTab === tab.id
                ? "text-[#1877F2]"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>

            {/* Active indicator */}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1877F2]"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Additional navigation for mobile */}
      <div className="md:hidden flex overflow-x-auto scrollbar-hide border-t">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium min-w-[70px]",
              activeTab === tab.id
                ? "text-[#1877F2]"
                : "text-gray-500"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Optional: Tab content wrapper for consistent styling
interface TabContentProps {
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ children, className }: TabContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn("bg-white rounded-lg shadow mt-4 p-6", className)}
    >
      {children}
    </motion.div>
  );
}
