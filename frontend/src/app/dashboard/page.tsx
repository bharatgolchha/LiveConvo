'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  PlusIcon,
  MicrophoneIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  TrashIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { OnboardingModal } from '@/components/auth/OnboardingModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions, type Session } from '@/lib/hooks/useSessions';
import { useUserStats, defaultStats } from '@/lib/hooks/useUserStats';
import { useSessionData } from '@/lib/hooks/useSessionData';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';

// Types (using Session from useSessions hook)

interface User {
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'team';
}

interface UsageStats {
  monthlyAudioHours: number;
  monthlyAudioLimit: number;
  monthlyMinutesUsed?: number;
  monthlyMinutesLimit?: number;
  minutesRemaining?: number;
  totalSessions: number;
  completedSessions: number;
}

// No mock data - using real data from hooks

// Components
const DashboardHeader: React.FC<{ user: User; onSearch: (query: string) => void }> = ({ user, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { theme } = useTheme();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    // The ProtectedRoute component will handle the redirect
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
      className="bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <img 
              src={theme === 'dark' 
                ? "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
                : "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//light.png"
              }
              alt="liveprompt.ai"
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
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

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">
            <BellIcon className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-app-error rounded-full"></span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="relative user-menu-container">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <UserCircleIcon className="w-8 h-8 text-muted-foreground" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.plan} Plan</p>
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
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center space-x-2">
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center space-x-2">
                    <UserCircleIcon className="w-4 h-4" />
                    <span>Profile</span>
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
    </motion.header>
  );
};

const DashboardSidebar: React.FC<{ 
  usageStats: UsageStats; 
  activePath: string;
  onNavigate: (path: string) => void;
  currentUser: User;
  sessions: Session[];
}> = ({ usageStats, activePath, onNavigate, currentUser, sessions }) => {
  // Calculate archived count from parent component's sessions
  const archivedCount = sessions.filter(s => s.status === 'archived').length;
  const activeCount = sessions.filter(s => s.status !== 'archived').length;

  // Format minutes to hours and minutes
  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`;
  };

  const navItems = [
    { path: 'conversations', label: 'Conversations', icon: MicrophoneIcon, count: activeCount },
    { path: 'archive', label: 'Archive', icon: ArchiveBoxIcon, count: archivedCount },
    { path: 'settings', label: 'Settings', icon: Cog6ToothIcon }
  ];

  // Calculate usage percentage
  const usagePercentage = Math.min(
    (usageStats.monthlyMinutesLimit || 600) > 0 
      ? ((usageStats.monthlyMinutesUsed || 0) / (usageStats.monthlyMinutesLimit || 600)) * 100 
      : 0, 
    100
  );

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
              activePath === item.path
                ? 'bg-app-primary/10 text-app-primary border border-app-primary/20'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.count !== undefined && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Usage Stats Widget */}
      <div className="p-4 border-t border-border">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">This Month</h3>
          
          {/* Audio Usage */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Usage</span>
              <span className="font-medium">
                {formatMinutes(usageStats.monthlyMinutesUsed || 0)} / {formatMinutes(usageStats.monthlyMinutesLimit || 600)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  usagePercentage > 80 
                    ? 'bg-red-500' 
                    : usagePercentage > 60 
                    ? 'bg-yellow-500'
                    : 'bg-app-primary'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            {usageStats.minutesRemaining !== undefined && usageStats.minutesRemaining < 60 && (
              <p className="text-xs text-warning mt-1">
                Only {formatMinutes(usageStats.minutesRemaining)} remaining
              </p>
            )}
          </div>

          {/* Session Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold text-lg">{usageStats.totalSessions}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Completed</p>
              <p className="font-semibold text-lg">{usageStats.completedSessions}</p>
            </div>
          </div>

          {/* Upgrade CTA for free users */}
          {currentUser.plan === 'free' && (
            <Button 
              variant="primary" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => onNavigate('pricing')}
            >
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};

const ConversationInboxItem: React.FC<{ 
  session: Session; 
  onResume: (id: string) => void;
  onViewSummary: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ session, onResume, onViewSummary, onArchive, onDelete, isSelected = false, onClick }) => {
  const getStatusIndicator = (status: Session['status']) => {
    switch (status) {
      case 'active': return { color: 'bg-app-success', label: 'Live', pulse: true };
      case 'completed': return { color: 'bg-app-primary', label: 'Done', pulse: false };
      case 'draft': return { color: 'bg-app-warning', label: 'Draft', pulse: false };
      case 'archived': return { color: 'bg-muted-foreground', label: 'Archived', pulse: false };
      default: return { color: 'bg-muted-foreground', label: 'Unknown', pulse: false };
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const statusIndicator = getStatusIndicator(session.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`
        group relative flex items-center px-6 py-4 border-b border-border cursor-pointer
        transition-all duration-200 hover:shadow-sm
        ${isSelected ? 'bg-app-primary/5 border-app-primary/20' : 'bg-card hover:bg-muted/30'}
      `}
    >
      {/* Selection Checkbox and Status Indicator */}
      <div className="flex items-center mr-4 gap-3">
        <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onClick}
            className="rounded border-input text-app-primary focus:ring-app-primary"
          />
        </label>
        
        <div className="relative">
          <div className={`
            w-3 h-3 rounded-full ${statusIndicator.color}
            ${statusIndicator.pulse ? 'animate-pulse' : ''}
          `} />
          {session.status === 'active' && (
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-app-success animate-ping opacity-30" />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          {/* Left Side - Title and Type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`
                text-sm font-medium truncate
                ${session.status === 'archived' ? 'text-muted-foreground' : 'text-foreground'}
                ${isSelected ? 'text-app-primary' : ''}
              `}>
                {session.title}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground shrink-0">
                {session.conversation_type}
              </span>
            </div>
            
            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {formatDate(session.created_at)}
              </span>
              
              {session.duration && (
                <span className="flex items-center gap-1">
                  <MicrophoneIcon className="w-3 h-3" />
                  {formatDuration(session.duration)}
                </span>
              )}
              
              {session.wordCount && (
                <span>{session.wordCount} words</span>
              )}
              
              {session.lastActivity && session.status === 'active' && (
                <span className="text-app-success font-medium">
                  • {session.lastActivity}
                </span>
              )}
            </div>
          </div>

          {/* Right Side - Status and Actions */}
          <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quick Status Label */}
            <span className={`
              text-xs px-2 py-1 rounded-full font-medium
              ${session.status === 'active' ? 'bg-app-success/10 text-app-success' :
                session.status === 'completed' ? 'bg-app-primary/10 text-app-primary' :
                session.status === 'draft' ? 'bg-app-warning/10 text-app-warning' :
                'bg-muted text-muted-foreground'}
            `}>
              {statusIndicator.label}
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {session.status === 'active' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume(session.id);
                  }}
                  className="text-xs px-3 py-1 h-7 bg-app-success/10 text-app-success"
                >
                  Resume
                </Button>
              )}
              
              {session.status === 'completed' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewSummary(session.id);
                  }}
                  className="text-xs px-3 py-1 h-7 bg-app-primary/10 text-app-primary"
                >
                  Summary
                </Button>
              )}

              {session.status === 'draft' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume(session.id);
                  }}
                  className="text-xs px-3 py-1 h-7 bg-app-warning/10 text-app-warning"
                >
                  Continue
                </Button>
              )}

              {session.status !== 'archived' ? (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(session.id);
                  }}
                  className="text-xs px-2 py-1 h-7 text-muted text-muted-foreground hover:bg-muted/30"
                  title="Archive conversation"
                >
                  <ArchiveBoxIcon className="w-3 h-3" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(session.id);
                  }}
                  className="text-xs px-2 py-1 h-7 text-app-primary hover:bg-app-primary/10"
                  title="Unarchive conversation"
                >
                  <ArchiveBoxIcon className="w-3 h-3" />
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="text-xs px-2 py-1 h-7 text-destructive hover:bg-destructive/10"
              >
                <TrashIcon className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState: React.FC<{ onNewConversation: () => void }> = ({ onNewConversation }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center min-h-[400px] text-center"
  >
    <div className="w-24 h-24 bg-app-primary/10 rounded-full flex items-center justify-center mb-6">
      <MicrophoneIcon className="w-12 h-12 text-app-primary" />
    </div>
    
    <h2 className="text-2xl font-semibold mb-4 text-foreground">Ready for your first conversation?</h2>
    <p className="text-muted-foreground mb-8 max-w-md">
      Start a new session and experience AI-powered conversation guidance in real-time.
    </p>
    
    <div className="space-y-4">
      <Button 
        variant="primary"
        size="lg" 
        onClick={onNewConversation}
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        Start Your First Conversation
      </Button>
      <Button variant="ghost" size="lg">
        Take a Quick Tour
      </Button>
    </div>
  </motion.div>
);

const NewConversationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: any) => void;
  sessions?: Session[];
}> = ({ isOpen, onClose, onStart, sessions = [] }) => {
  const [step, setStep] = useState(1);
  const [conversationType, setConversationType] = useState('');
  const [title, setTitle] = useState('');
  const [contextText, setContextText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPreviousConversations, setSelectedPreviousConversations] = useState<string[]>([]);
  const [showPreviousConversations, setShowPreviousConversations] = useState(false);
  const [previousConversationSearch, setPreviousConversationSearch] = useState('');

  // Feature flag to hide document upload temporarily
  const ENABLE_DOCUMENT_UPLOAD = false;

  const conversationTypes = [
    { id: 'sales_call', label: 'Sales Call', description: 'Discovery calls, demos, negotiations' },
    { id: 'interview', label: 'Interview', description: 'Job interviews, candidate screening' },
    { id: 'meeting', label: 'Meeting', description: 'Team meetings, planning sessions' },
    { id: 'consultation', label: 'Consultation', description: 'Client consultations, advisory calls' }
  ];

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const validTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/json'
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      return validTypes.includes(file.type) && file.size <= maxSize;
    });
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    onStart({
      conversationType,
      title: title || `New ${conversationType.replace('_', ' ')}`,
      context: {
        text: contextText,
        files: uploadedFiles
      },
      selectedPreviousConversations
    });
    onClose();
    setStep(1);
    setConversationType('');
    setTitle('');
    setContextText('');
    setUploadedFiles([]);
    setSelectedPreviousConversations([]);
    setPreviousConversationSearch('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] border border-border flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Start New Conversation</h2>
                  <button 
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center mt-4 space-x-2">
                  {[1, 2, 3].map((stepNum) => (
                    <div key={stepNum} className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                        step >= stepNum ? 'bg-app-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {stepNum}
                      </div>
                      {stepNum < 3 && (
                        <div className={`w-12 h-0.5 ${step > stepNum ? 'bg-app-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                  ))}
                  <div className="ml-4 text-sm text-muted-foreground">
                    {step === 1 && 'Choose Type'}
                    {step === 2 && 'Add Title'}
                    {step === 3 && 'Add Context'}
                  </div>
                </div>
              </div>

              {/* Content - Now scrollable */}
              <div className="px-6 py-6 flex-1 overflow-y-auto min-h-0">
                {step === 1 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">What type of conversation will this be?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {conversationTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setConversationType(type.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-colors ${
                            conversationType === type.id
                              ? 'border-app-primary bg-app-primary/10'
                              : 'border-border hover:border-app-primary/50'
                          }`}
                        >
                          <h4 className="font-medium text-foreground">{type.label}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-foreground">Give your conversation a title</h3>
                    <input
                      type="text"
                      placeholder={`Enter a title for your ${conversationType.replace('_', ' ')}...`}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-app-primary focus:border-transparent bg-background text-foreground"
                      autoFocus
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Don't worry, you can change this later.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-foreground">Add context to help the AI understand your conversation</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Share relevant documents, notes, or background information to get more targeted guidance.
                    </p>

                    {/* Text Context Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Text Context
                      </label>
                      <textarea
                        placeholder="Add any relevant context, talking points, background information, or specific goals for this conversation..."
                        value={contextText}
                        onChange={(e) => setContextText(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-app-primary focus:border-transparent bg-background text-foreground resize-none"
                      />
                    </div>

                    {/* Previous Conversations Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Previous Conversations for Context
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPreviousConversations(!showPreviousConversations)}
                        className="w-full px-4 py-3 border border-input rounded-lg text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm text-foreground">
                          {selectedPreviousConversations.length > 0 
                            ? `${selectedPreviousConversations.length} conversation${selectedPreviousConversations.length > 1 ? 's' : ''} selected`
                            : 'Select previous conversations for context'
                          }
                        </span>
                        <ChevronDownIcon className={`w-4 h-4 text-muted-foreground transition-transform ${showPreviousConversations ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showPreviousConversations && (
                        <div className="mt-2 border border-input rounded-lg">
                          {/* Search Input */}
                          <div className="p-3 border-b border-input">
                            <div className="relative">
                              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Search conversations..."
                                value={previousConversationSearch}
                                onChange={(e) => setPreviousConversationSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-app-primary bg-background"
                              />
                              {previousConversationSearch && (
                                <button
                                  type="button"
                                  onClick={() => setPreviousConversationSearch('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <XCircleIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Conversations List */}
                          <div className="max-h-48 overflow-y-auto">
                            {(() => {
                              const filteredSessions = sessions
                                .filter(s => s.status === 'completed')
                                .filter(s => {
                                  if (!previousConversationSearch) return true;
                                  const searchLower = previousConversationSearch.toLowerCase();
                                  return (
                                    s.title?.toLowerCase().includes(searchLower) ||
                                    s.conversation_type?.toLowerCase().includes(searchLower)
                                  );
                                })
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .slice(0, 20); // Show up to 20 matching conversations

                              if (filteredSessions.length === 0) {
                                return (
                                  <p className="text-sm text-muted-foreground p-4 text-center">
                                    {previousConversationSearch 
                                      ? 'No matching conversations found'
                                      : 'No completed conversations available'
                                    }
                                  </p>
                                );
                              }

                              return (
                                <div>
                                  {previousConversationSearch && (
                                    <div className="px-3 py-2 text-xs text-muted-foreground border-b border-input">
                                      Found {filteredSessions.length} conversation{filteredSessions.length !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                  <div className="p-2 space-y-1">
                                    {filteredSessions.map(session => (
                                  <label
                                    key={session.id}
                                    className="flex items-start p-2 hover:bg-muted/50 rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPreviousConversations.includes(session.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPreviousConversations(prev => [...prev, session.id]);
                                        } else {
                                          setSelectedPreviousConversations(prev => prev.filter(id => id !== session.id));
                                        }
                                      }}
                                      className="mt-1 rounded border-input text-app-primary focus:ring-app-primary"
                                    />
                                    <div className="ml-3 flex-1">
                                      <p className="text-sm font-medium text-foreground">
                                        {session.title || 'Untitled'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {session.conversation_type} • {new Date(session.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      {selectedPreviousConversations.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Selected conversations will provide context to the AI coach
                        </p>
                      )}
                    </div>

                    {/* File Upload Area - Temporarily Hidden */}
                    {ENABLE_DOCUMENT_UPLOAD && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Upload Documents
                        </label>
                        
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`
                            border-2 border-dashed rounded-lg p-8 text-center transition-colors
                            ${dragOver 
                              ? 'border-app-primary bg-app-primary/10' 
                              : 'border-input hover:border-app-primary/50'
                            }
                          `}
                        >
                          <DocumentTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-foreground mb-2">
                            Drag and drop files here, or{' '}
                            <label className="text-app-primary hover:text-app-primary/80 cursor-pointer font-medium">
                              browse
                              <input
                                type="file"
                                multiple
                                accept=".txt,.pdf,.doc,.docx,.csv,.json"
                                onChange={(e) => handleFileUpload(e.target.files)}
                                className="hidden"
                              />
                            </label>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supports: PDF, DOC, DOCX, TXT, CSV, JSON (max 10MB each)
                          </p>
                        </div>

                        {/* Uploaded Files List */}
                        {uploadedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-foreground">Uploaded Files:</p>
                            {uploadedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-muted rounded-lg"
                              >
                                <div className="flex items-center space-x-3 flex-1">
                                  <DocumentTextIcon className="w-5 h-5 text-muted-foreground" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                                    </p>
                                    {/* Show information about text extraction */}
                                    {file.type === 'text/plain' && (
                                      <div className="mt-2 p-2 bg-background rounded border">
                                        <p className="text-xs text-app-primary">✓ Text will be extracted and processed</p>
                                      </div>
                                    )}
                                    {file.type === 'application/json' && (
                                      <div className="mt-2 p-2 bg-background rounded border">
                                        <p className="text-xs text-app-primary">✓ JSON structure will be processed</p>
                                      </div>
                                    )}
                                    {file.type === 'text/csv' && (
                                      <div className="mt-2 p-2 bg-background rounded border">
                                        <p className="text-xs text-app-primary">✓ CSV data will be formatted and processed</p>
                                      </div>
                                    )}
                                    {file.type === 'application/pdf' && (
                                      <div className="mt-2 p-2 bg-background rounded border">
                                        <p className="text-xs text-app-primary">✓ PDF text will be extracted after upload</p>
                                      </div>
                                    )}
                                    {file.type.includes('wordprocessingml') && (
                                      <div className="mt-2 p-2 bg-background rounded border">
                                        <p className="text-xs text-app-primary">✓ Word document text will be extracted after upload</p>
                                      </div>
                                    )}
                                    {file.type.includes('image/') && (
                                      <div className="mt-2 p-2 bg-background rounded border">
                                        <p className="text-xs text-muted-foreground">📷 OCR text extraction coming soon</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="text-destructive hover:text-destructive/80 text-sm ml-2"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 bg-app-primary rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-primary-foreground text-xs font-bold">i</span>
                        </div>
                        <div>
                          <p className="text-sm text-foreground font-medium mb-1">Pro Tip</p>
                          <p className="text-sm text-muted-foreground">
                            The more context you provide, the better the AI can tailor its guidance to your specific situation and goals.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - Always visible */}
              <div className="px-6 py-4 border-t border-border flex justify-between flex-shrink-0">
                <Button
                  variant="ghost"
                  onClick={step === 1 ? onClose : () => setStep(step - 1)}
                >
                  {step === 1 ? 'Cancel' : 'Back'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={step === 3 ? handleStart : () => setStep(step + 1)}
                    disabled={step === 1 && !conversationType}
                  >
                    {step === 1 ? 'Next' : step === 2 ? 'Add Context' : 'Start Conversation'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Standalone Context Upload Component
const ContextUploadWidget: React.FC<{
  onContextUpdate: (context: { text: string; files: File[] }) => void;
  initialText?: string;
  initialFiles?: File[];
  compact?: boolean;
}> = ({ onContextUpdate, initialText = '', initialFiles = [], compact = false }) => {
  const [contextText, setContextText] = useState(initialText);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>(initialFiles);
  const [dragOver, setDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const validTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/json'
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      return validTypes.includes(file.type) && file.size <= maxSize;
    });
    
    const newFiles = [...uploadedFiles, ...validFiles];
    setUploadedFiles(newFiles);
    onContextUpdate({ text: contextText, files: newFiles });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onContextUpdate({ text: contextText, files: newFiles });
  };

  const handleTextChange = (text: string) => {
    setContextText(text);
    onContextUpdate({ text, files: uploadedFiles });
  };

  if (compact && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Add Context</p>
              <p className="text-xs text-gray-500">
                {contextText || uploadedFiles.length > 0 
                  ? `${contextText ? 'Text added' : ''}${contextText && uploadedFiles.length > 0 ? ', ' : ''}${uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s)` : ''}`
                  : 'Help the AI understand your conversation better'
                }
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="text-blue-600"
          >
            {contextText || uploadedFiles.length > 0 ? 'Edit' : 'Add'}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Context & Documents</h3>
        {compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-gray-500"
          >
            Minimize
          </Button>
        )}
      </div>

      {/* Text Context */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Background Information
        </label>
        <textarea
          placeholder="Add context, talking points, background information, or specific goals..."
          value={contextText}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Documents
        </label>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            Drag files here or{' '}
            <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
              browse
              <input
                type="file"
                multiple
                accept=".txt,.pdf,.doc,.docx,.csv,.json"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-xs text-gray-500">PDF, DOC, TXT, CSV, JSON (max 10MB)</p>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border"
              >
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main Dashboard Component
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [activePath, setActivePath] = useState('conversations');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  // Get sessions and stats from hooks
  const { 
    sessions, 
    loading: sessionsLoading, 
    error: sessionsError,
    fetchSessions,
    updateSession,
    deleteSession,
    createSession 
  } = useSessions();
  
  const { 
    stats: userStats, 
    loading: statsLoading,
    error: statsError 
  } = useUserStats();

  // Get session data management hooks
  const { 
    uploadDocuments, 
    saveContext,
    documentsLoading,
    contextLoading 
  } = useSessionData();

  // Get auth session for API calls
  const { session: authSession } = useAuth();

  // Create user object from auth data
  const currentUser: User = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    plan: 'free' // TODO: Get actual plan from subscription
  };

  // Check if user needs onboarding
  useEffect(() => {
    console.log('🔍 Dashboard - checking onboarding:', { sessionsError, user: !!user });
    if (sessionsError && (sessionsError.includes('Setup required') || sessionsError.includes('Please complete onboarding first'))) {
      console.log('🚀 Dashboard - showing onboarding modal');
      setShowOnboardingModal(true);
    }
  }, [sessionsError]);

  // Filter sessions based on search query and active path
  const filteredSessions = sessions.filter(session => {
    // Filter by archive status
    if (activePath === 'archive' && session.status !== 'archived') return false;
    if (activePath === 'conversations' && session.status === 'archived') return false;
    
    // Filter by search query
    if (!searchQuery) return true;
    return session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           session.conversation_type?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  const handleStartConversation = async (config: any) => {
    try {
      // Create a new session with context data
      const newSession = await createSession({
        title: config.title,
        conversation_type: config.conversationType,
        selected_template_id: config.templateId,
        context: config.context?.text ? {
          text: config.context.text,
          metadata: {
            conversation_type: config.conversationType,
            created_from: 'dashboard',
            has_files: config.context?.files?.length > 0
          }
        } : undefined
      });
      
      if (newSession) {
        // Upload files if any were provided
        if (config.context?.files && config.context.files.length > 0) {
          try {
            await uploadDocuments(newSession.id, config.context.files);
            console.log('✅ Files uploaded successfully for session:', newSession.id);
          } catch (error) {
            console.error('❌ Failed to upload files:', error);
            // Don't block navigation if file upload fails
          }
        }

        // Store conversation config in localStorage for the conversation page to pick up
        const conversationConfig = {
          id: newSession.id,
          title: config.title,
          type: config.conversationType,
          context: config.context || { text: '', files: [] },
          selectedPreviousConversations: config.selectedPreviousConversations || [],
          createdAt: new Date().toISOString()
        };
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(`conversation_${newSession.id}`, JSON.stringify(conversationConfig));
          
          // Navigate to the conversation page with the session ID
          window.location.href = `/app?cid=${newSession.id}`;
        }
      }
    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      // TODO: Show error toast to user
    }
  };

  const handleResumeSession = (sessionId: string) => {
    // Find the session to get its details
    const session = sessions.find(s => s.id === sessionId);
    if (session && typeof window !== 'undefined') {
      // For completed sessions, just navigate without storing resuming config
      if (session.status === 'completed') {
        // Clear any existing localStorage state for completed sessions
        localStorage.removeItem(`conversation_${sessionId}`);
        localStorage.removeItem(`conversation_state_${sessionId}`);
      } else {
        // Only store resuming config for non-completed sessions
        const conversationConfig = {
          id: sessionId,
          title: session.title,
          type: session.conversation_type,
          context: { text: '', files: [] }, // Context will be loaded from backend in conversation page
          createdAt: session.created_at,
          isResuming: true
        };
        
        localStorage.setItem(`conversation_${sessionId}`, JSON.stringify(conversationConfig));
      }
      
      // Navigate to conversation page
      window.location.href = `/app?cid=${sessionId}`;
    }
  };

  const handleViewSummary = (sessionId: string) => {
    window.location.href = `/summary/${sessionId}`;
  };

  const handleArchiveSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      // Toggle between archived and previous status
      const newStatus = session.status === 'archived' 
        ? (session.recording_ended_at ? 'completed' : 'draft')
        : 'archived';
      await updateSession(sessionId, { status: newStatus });
    }
  };

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionTitle: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: null,
    isLoading: false
  });

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    setDeleteModal({
      isOpen: true,
      sessionId,
      sessionTitle: session?.title || 'Untitled Conversation',
      isLoading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.sessionId) return;

    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      const success = await deleteSession(deleteModal.sessionId);
      if (success) {
        setDeleteModal({
          isOpen: false,
          sessionId: null,
          sessionTitle: null,
          isLoading: false
        });
      } else {
        // Error handling is done in the hook
        setDeleteModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCloseDeleteModal = () => {
    if (deleteModal.isLoading) return;
    setDeleteModal({
      isOpen: false,
      sessionId: null,
      sessionTitle: null,
      isLoading: false
    });
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleBulkArchive = async () => {
    // Update all selected sessions
    const updatePromises = Array.from(selectedSessions).map(sessionId => {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        const newStatus = session.status === 'archived' 
          ? (session.recording_ended_at ? 'completed' : 'draft')
          : 'archived';
        return updateSession(sessionId, { status: newStatus });
      }
      return Promise.resolve();
    });
    await Promise.all(updatePromises);
    setSelectedSessions(new Set());
  };

  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    isOpen: boolean;
    count: number;
    isLoading: boolean;
  }>({
    isOpen: false,
    count: 0,
    isLoading: false
  });

  const handleBulkDelete = async () => {
    setBulkDeleteModal({
      isOpen: true,
      count: selectedSessions.size,
      isLoading: false
    });
  };

  const handleConfirmBulkDelete = async () => {
    setBulkDeleteModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Delete all selected sessions
      const deletePromises = Array.from(selectedSessions).map(sessionId => 
        deleteSession(sessionId)
      );
      await Promise.all(deletePromises);
      setSelectedSessions(new Set());
      setBulkDeleteModal({
        isOpen: false,
        count: 0,
        isLoading: false
      });
    } catch (error) {
      console.error('Error deleting sessions:', error);
      setBulkDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCloseBulkDeleteModal = () => {
    if (bulkDeleteModal.isLoading) return;
    setBulkDeleteModal({
      isOpen: false,
      count: 0,
      isLoading: false
    });
  };

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false);
    // Refresh the page to reload data with the new organization
    window.location.reload();
  };

  const activeSessions = filteredSessions.filter(s => s.status === 'active');
  const hasAnySessions = sessions.length > 0;

  // Show loading state while checking authentication
  if (!user && !sessionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access your dashboard.</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.href = '/auth/login'}>
              Sign In
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/auth/signup'}>
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there are errors
  if (sessionsError && sessionsError.includes('sign in')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Expired</h1>
          <p className="text-muted-foreground mb-6">Your session has expired. Please sign in again.</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.href = '/auth/login'}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (sessionsLoading && sessions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={currentUser} onSearch={handleSearch} />
      
      <div className="flex h-[calc(100vh-80px)]">
        <DashboardSidebar 
          usageStats={userStats || defaultStats}
          activePath={activePath}
          onNavigate={(path) => {
            if (path === 'settings') {
              router.push('/settings');
            } else {
              setActivePath(path);
            }
          }}
          currentUser={currentUser}
          sessions={sessions}
        />
        
        <main className="flex-1 overflow-auto flex flex-col">
          <div className="p-6 flex flex-col flex-1">
            {/* Hero Section */}
            {hasAnySessions && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2 text-foreground">Welcome back, {currentUser.name}!</h1>
                    <p className="text-muted-foreground">
                      {activeSessions.length > 0 
                        ? `You have ${activeSessions.length} active conversation${activeSessions.length === 1 ? '' : 's'}`
                        : 'Ready to start a new conversation?'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleNewConversation}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    New Conversation
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Main Content */}
            {!hasAnySessions ? (
              <EmptyState onNewConversation={handleNewConversation} />
            ) : (
              <div className="flex flex-col flex-1">
                {/* Search Results Header */}
                {searchQuery && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4"
                  >
                    <p className="text-muted-foreground">
                      {filteredSessions.length} result{filteredSessions.length === 1 ? '' : 's'} for "{searchQuery}"
                    </p>
                  </motion.div>
                )}

                {/* Conversations Inbox List */}
                {filteredSessions.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg shadow-sm border border-border overflow-hidden flex flex-col flex-1"
                  >
                    {/* List Header */}
                    <div className="px-6 py-3 bg-muted/30 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Select All Checkbox */}
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-input text-app-primary focus:ring-app-primary"
                            />
                          </label>
                          
                          <h2 className="text-sm font-medium text-foreground">
                            {selectedSessions.size > 0 ? (
                              `${selectedSessions.size} selected`
                            ) : (
                              activePath === 'archive' 
                                ? `Archived Conversations (${filteredSessions.length})`
                                : `Conversations (${filteredSessions.length})`
                            )}
                          </h2>
                          
                          {/* Bulk Actions */}
                          {selectedSessions.size > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkArchive}
                                className="text-xs"
                              >
                                {activePath === 'archive' ? 'Unarchive Selected' : 'Archive Selected'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="text-xs text-destructive"
                              >
                                Delete Selected
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSessions(new Set())}
                                className="text-xs text-muted-foreground"
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {selectedSessions.size === 0 && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-app-success"></div>
                              Active ({filteredSessions.filter(s => s.status === 'active').length})
                            </span>
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-app-primary"></div>
                              Completed ({filteredSessions.filter(s => s.status === 'completed').length})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conversation List */}
                    <div className="divide-y divide-border flex-1 overflow-y-auto">
                      {filteredSessions.map((session) => (
                        <div key={session.id} onClick={() => handleResumeSession(session.id)}>
                          <ConversationInboxItem
                            session={session}
                            isSelected={selectedSessions.has(session.id)}
                            onClick={() => handleSessionSelect(session.id)}
                            onResume={handleResumeSession}
                            onViewSummary={handleViewSummary}
                            onArchive={handleArchiveSession}
                            onDelete={handleDeleteSession}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
                  >
                    <div className="text-center py-16">
                      <MagnifyingGlassIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No conversations found</h3>
                      <p className="text-muted-foreground mb-6">Try adjusting your search terms or start a new conversation.</p>
                      <Button
                        onClick={handleNewConversation}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Start New Conversation
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onStart={handleStartConversation}
        sessions={sessions}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={handleOnboardingComplete}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation?"
        itemName={deleteModal.sessionTitle || undefined}
        isLoading={deleteModal.isLoading}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={bulkDeleteModal.isOpen}
        onClose={handleCloseBulkDeleteModal}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Multiple Conversations"
        description={`Are you sure you want to delete ${bulkDeleteModal.count} conversation${bulkDeleteModal.count === 1 ? '' : 's'}?`}
        isLoading={bulkDeleteModal.isLoading}
      />
    </div>
  );
};

const ProtectedDashboard = () => (
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
);

export default ProtectedDashboard; 