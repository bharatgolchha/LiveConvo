'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  realtimeConnected?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onSearch, onNavigateToSettings, onMenuClick, realtimeConnected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const { show: showIntercom } = useIntercom();

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
      className="relative z-40 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Logo and Menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              <Bars3Icon className="w-6 h-6 text-muted-foreground" />
            </button>
          )}
          <img
            src={resolvedTheme === 'dark' ? '/Logos/DarkMode.png' : '/Logos/LightMode.png'}
            alt="liveprompt.ai"
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </div>

        {/* Search Bar */}
        <div className="hidden sm:block flex-1 max-w-md mx-4 lg:mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-app-primary focus:border-transparent bg-background text-foreground"
            />
          </div>
        </div>

        {/* Mobile Search Button */}
        <button
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="sm:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="w-6 h-6 text-muted-foreground" />
        </button>
        
        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Help / Intercom - Hidden on mobile */}
          <button
            type="button"
            onClick={showIntercom}
            className="hidden sm:block p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Help & Support"
          >
            <QuestionMarkCircleIcon className="w-6 h-6 text-muted-foreground" />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="relative user-menu-container">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors relative"
            >
              <div className="relative">
                <UserCircleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
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
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.planDisplayName || `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan`}</p>
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
          <div className="p-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                className="w-full pl-10 pr-10 py-2 border border-input rounded-lg focus:ring-2 focus:ring-app-primary focus:border-transparent bg-background text-foreground"
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
                <XMarkIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default React.memo(DashboardHeader); 