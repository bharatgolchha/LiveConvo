'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIntercom } from '@/lib/hooks/useIntercom';

export interface DashboardUser {
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'team';
  planDisplayName?: string;
  is_admin?: boolean;
}

interface DashboardHeaderProps {
  user: DashboardUser;
  onSearch: (query: string) => void;
  onNavigateToSettings: () => void;
  onMenuClick?: () => void;
  onNewMeeting?: () => void;
  realtimeConnected?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onSearch, onNavigateToSettings, onMenuClick, onNewMeeting, realtimeConnected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const { show: showIntercom } = useIntercom();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    // ProtectedRoute handles redirect
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-40 bg-card/95 backdrop-blur-sm border-b border-border px-3 sm:px-4 py-1.5 sm:py-2"
    >
      <div className="flex items-center justify-between">
        {/* Logo and Menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-1 rounded-md hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              <Bars3Icon className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <img
            src={resolvedTheme === 'dark' ? '/Logos/DarkMode.png' : '/Logos/LightMode.png'}
            alt="liveprompt.ai"
            className="h-6 sm:h-7 w-auto object-contain"
          />
        </div>

        {/* Search Bar */}
        <div className="hidden sm:block flex-1 max-w-md mx-4 lg:mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className="w-full pl-8 pr-3 py-1.5 border border-input rounded-md focus:ring-1 focus:ring-app-primary focus:border-transparent bg-background text-foreground text-sm"
            />
          </div>
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="sm:hidden p-1 rounded-md hover:bg-accent transition-colors"
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* New Meeting Button */}
          {onNewMeeting && (
            <button
              onClick={onNewMeeting}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-primary-foreground rounded-md text-xs sm:text-sm font-medium transition-all hover:shadow-md"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span className="hidden sm:inline">New Meeting</span>
            <span className="sm:hidden">New</span>
            </button>
          )}
          
          {/* Help / Intercom - Hidden on mobile */}
          <button
            type="button"
            onClick={showIntercom}
            className="hidden sm:block p-1 rounded-md hover:bg-accent transition-colors"
            aria-label="Help & Support"
          >
            <QuestionMarkCircleIcon className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="relative user-menu-container">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-1 rounded-md hover:bg-accent transition-colors relative"
            >
              <div className="relative">
                <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                {/* Real-time status indicator */}
                <div 
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-background ${
                    realtimeConnected === undefined 
                      ? 'hidden' 
                      : realtimeConnected 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  }`}
                  title={realtimeConnected ? 'Real-time connected' : 'Real-time disconnected'}
                />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-foreground">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{user.planDisplayName || `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan`}</p>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-50"
                >
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      onNavigateToSettings();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center space-x-2"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>

                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* Mobile Search Bar */}
      {isMobileSearchOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="sm:hidden border-t border-border"
        >
          <div className="p-1.5">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                className="w-full pl-8 pr-8 py-1.5 border border-input rounded-md focus:ring-1 focus:ring-app-primary focus:border-transparent bg-background text-foreground text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  onSearch('');
                  setIsMobileSearchOpen(false);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-accent transition-colors"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default React.memo(DashboardHeader); 