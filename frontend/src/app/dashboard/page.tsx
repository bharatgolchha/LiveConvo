'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions, type Session } from '@/lib/hooks/useSessions';
import { useUserStats, defaultStats } from '@/lib/hooks/useUserStats';

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
  totalSessions: number;
  completedSessions: number;
}

// No mock data - using real data from hooks

// Components
const DashboardHeader: React.FC<{ user: User; onSearch: (query: string) => void }> = ({ user, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { signOut } = useAuth();

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
      className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <MicrophoneIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">LiveConvo</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <BellIcon className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative user-menu-container">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <UserCircleIcon className="w-8 h-8 text-gray-400" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.plan} Plan</p>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                    <UserCircleIcon className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
}> = ({ usageStats, activePath, onNavigate, currentUser }) => {
  const navItems = [
    { path: 'conversations', label: 'Conversations', icon: MicrophoneIcon, count: usageStats.totalSessions },
    { path: 'templates', label: 'Templates', icon: DocumentTextIcon },
    { path: 'archive', label: 'Archive', icon: ArchiveBoxIcon, count: 3 },
    { path: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { path: 'settings', label: 'Settings', icon: Cog6ToothIcon }
  ];

  return (
    <motion.aside 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-64 bg-gray-50/80 border-r border-gray-200 flex flex-col"
    >
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
              activePath === item.path
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.count && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Usage Stats Widget */}
      <div className="p-4 border-t border-gray-200">
        <Card className="p-4 bg-white">
          <h3 className="text-sm font-medium text-gray-900 mb-3">This Month</h3>
          
          {/* Audio Usage */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Audio Hours</span>
              <span className="font-medium">{usageStats.monthlyAudioHours}/{usageStats.monthlyAudioLimit}h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(usageStats.monthlyAudioHours / usageStats.monthlyAudioLimit) * 100}%` }}
              />
            </div>
          </div>

          {/* Session Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Total</p>
              <p className="font-semibold text-lg">{usageStats.totalSessions}</p>
            </div>
            <div>
              <p className="text-gray-600">Completed</p>
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
        </Card>
      </div>
    </motion.aside>
  );
};

const ConversationInboxItem: React.FC<{ 
  session: Session; 
  onResume: (id: string) => void;
  onViewSummary: (id: string) => void;
  onArchive: (id: string) => void;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ session, onResume, onViewSummary, onArchive, isSelected = false, onClick }) => {
  const getStatusIndicator = (status: Session['status']) => {
    switch (status) {
      case 'active': return { color: 'bg-green-500', label: 'Live', pulse: true };
      case 'completed': return { color: 'bg-blue-500', label: 'Done', pulse: false };
      case 'draft': return { color: 'bg-amber-500', label: 'Draft', pulse: false };
      case 'archived': return { color: 'bg-gray-400', label: 'Archived', pulse: false };
      default: return { color: 'bg-gray-400', label: 'Unknown', pulse: false };
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
      whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.8)' }}
      onClick={onClick}
      className={`
        group relative flex items-center px-6 py-4 border-b border-gray-100 cursor-pointer
        transition-all duration-200 hover:shadow-sm
        ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50/50'}
      `}
    >
      {/* Selection Checkbox and Status Indicator */}
      <div className="flex items-center mr-4 gap-3">
        <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onClick}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        
        <div className="relative">
          <div className={`
            w-3 h-3 rounded-full ${statusIndicator.color}
            ${statusIndicator.pulse ? 'animate-pulse' : ''}
          `} />
          {session.status === 'active' && (
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-30" />
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
                ${session.status === 'archived' ? 'text-gray-500' : 'text-gray-900'}
                ${isSelected ? 'text-blue-900' : ''}
              `}>
                {session.title}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                {session.conversation_type}
              </span>
            </div>
            
            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
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
                <span className="text-green-600 font-medium">
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
              ${session.status === 'active' ? 'bg-green-100 text-green-700' :
                session.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                session.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'}
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
                  className="text-xs px-3 py-1 h-7 bg-green-100 hover:bg-green-200 text-green-700"
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
                  className="text-xs px-3 py-1 h-7 bg-blue-100 hover:bg-blue-200 text-blue-700"
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
                  className="text-xs px-3 py-1 h-7 bg-amber-100 hover:bg-amber-200 text-amber-700"
                >
                  Continue
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(session.id);
                }}
                className="text-xs px-2 py-1 h-7 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <ArchiveBoxIcon className="w-3 h-3" />
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
    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
      <MicrophoneIcon className="w-12 h-12 text-blue-600" />
    </div>
    
    <h2 className="text-2xl font-semibold mb-4 text-gray-900">Ready for your first conversation?</h2>
    <p className="text-gray-600 mb-8 max-w-md">
      Start a new session and experience AI-powered conversation guidance in real-time.
    </p>
    
    <div className="space-y-4">
      <Button 
        size="lg" 
        onClick={onNewConversation}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
}> = ({ isOpen, onClose, onStart }) => {
  const [step, setStep] = useState(1);
  const [conversationType, setConversationType] = useState('');
  const [title, setTitle] = useState('');
  const [contextText, setContextText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

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
      }
    });
    onClose();
    setStep(1);
    setConversationType('');
    setTitle('');
    setContextText('');
    setUploadedFiles([]);
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Start New Conversation</h2>
                  <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center mt-4 space-x-2">
                  {[1, 2, 3].map((stepNum) => (
                    <div key={stepNum} className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                        step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {stepNum}
                      </div>
                      {stepNum < 3 && (
                        <div className={`w-12 h-0.5 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  ))}
                  <div className="ml-4 text-sm text-gray-600">
                    {step === 1 && 'Choose Type'}
                    {step === 2 && 'Add Title'}
                    {step === 3 && 'Add Context'}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
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
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <h4 className="font-medium text-gray-900">{type.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Give your conversation a title</h3>
                    <input
                      type="text"
                      placeholder={`Enter a title for your ${conversationType.replace('_', ' ')}...`}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Don't worry, you can change this later.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Add context to help the AI understand your conversation</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Share relevant documents, notes, or background information to get more targeted guidance.
                    </p>

                    {/* Text Context Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Context
                      </label>
                      <textarea
                        placeholder="Add any relevant context, talking points, background information, or specific goals for this conversation..."
                        value={contextText}
                        onChange={(e) => setContextText(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* File Upload Area */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Documents
                      </label>
                      
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                          border-2 border-dashed rounded-lg p-8 text-center transition-colors
                          ${dragOver 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                          }
                        `}
                      >
                        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-sm text-gray-600 mb-2">
                          Drag and drop files here, or{' '}
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
                        <p className="text-xs text-gray-500">
                          Supports: PDF, DOC, DOCX, TXT, CSV, JSON (max 10MB each)
                        </p>
                      </div>

                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-blue-600 text-xs font-bold">i</span>
                        </div>
                        <div>
                          <p className="text-sm text-blue-800 font-medium mb-1">Pro Tip</p>
                          <p className="text-sm text-blue-700">
                            The more context you provide, the better the AI can tailor its guidance to your specific situation and goals.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <Button
                  variant="ghost"
                  onClick={step === 1 ? onClose : () => setStep(step - 1)}
                >
                  {step === 1 ? 'Cancel' : 'Back'}
                </Button>
                <div className="flex gap-2">
                  {step === 3 && (
                    <Button
                      variant="ghost"
                      onClick={handleStart}
                      className="text-blue-600"
                    >
                      Skip Context
                    </Button>
                  )}
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
  const [activePath, setActivePath] = useState('conversations');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
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

  // Create user object from auth data
  const currentUser: User = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    plan: 'free' // TODO: Get actual plan from subscription
  };

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session => {
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
    // Create a new session via API
    const newSession = await createSession({
      title: config.title,
      conversation_type: config.conversationType,
      selected_template_id: config.templateId
    });
    
    if (newSession) {
      // Store conversation config in localStorage for the conversation page to pick up
      const conversationConfig = {
        id: newSession.id,
        title: config.title,
        type: config.conversationType,
        context: config.context || { text: '', files: [] },
        createdAt: new Date().toISOString()
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`conversation_${newSession.id}`, JSON.stringify(conversationConfig));
        
        // Navigate to the conversation page with the session ID
        window.location.href = `/app?cid=${newSession.id}`;
      }
    }
  };

  const handleResumeSession = (sessionId: string) => {
    // Find the session to get its details
    const session = sessions.find(s => s.id === sessionId);
    if (session && typeof window !== 'undefined') {
      // Store basic session config for resuming
      const conversationConfig = {
        id: sessionId,
        title: session.title,
        type: session.conversation_type,
        context: { text: '', files: [] }, // Context would be loaded from backend in real app
        createdAt: session.created_at,
        isResuming: true
      };
      
      localStorage.setItem(`conversation_${sessionId}`, JSON.stringify(conversationConfig));
      
      // Navigate to conversation page
      window.location.href = `/app?cid=${sessionId}`;
    }
  };

  const handleViewSummary = (sessionId: string) => {
    window.location.href = `/summary/${sessionId}`;
  };

  const handleArchiveSession = async (sessionId: string) => {
    await updateSession(sessionId, { status: 'archived' });
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
    const updatePromises = Array.from(selectedSessions).map(sessionId => 
      updateSession(sessionId, { status: 'archived' })
    );
    await Promise.all(updatePromises);
    setSelectedSessions(new Set());
  };

  const activeSessions = filteredSessions.filter(s => s.status === 'active');
  const hasAnySessions = sessions.length > 0;

  // Show loading state while checking authentication
  if (!user && !sessionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your dashboard.</p>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Expired</h1>
          <p className="text-gray-600 mb-6">Your session has expired. Please sign in again.</p>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <DashboardHeader user={currentUser} onSearch={handleSearch} />
      
      <div className="flex h-[calc(100vh-80px)]">
        <DashboardSidebar 
          usageStats={userStats || defaultStats}
          activePath={activePath}
          onNavigate={setActivePath}
          currentUser={currentUser}
        />
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Hero Section */}
            {hasAnySessions && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Welcome back, {currentUser.name}!</h1>
                    <p className="text-blue-100">
                      {activeSessions.length > 0 
                        ? `You have ${activeSessions.length} active conversation${activeSessions.length === 1 ? '' : 's'}`
                        : 'Ready to start a new conversation?'}
                    </p>
                  </div>
                  <Button 
                    variant="secondary"
                    onClick={handleNewConversation}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
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
              <div>
                {/* Search Results Header */}
                {searchQuery && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4"
                  >
                    <p className="text-gray-600">
                      {filteredSessions.length} result{filteredSessions.length === 1 ? '' : 's'} for "{searchQuery}"
                    </p>
                  </motion.div>
                )}

                {/* Conversations Inbox List */}
                {filteredSessions.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* List Header */}
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Select All Checkbox */}
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                          
                          <h2 className="text-sm font-medium text-gray-900">
                            {selectedSessions.size > 0 ? (
                              `${selectedSessions.size} selected`
                            ) : (
                              `Conversations (${filteredSessions.length})`
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
                                Archive Selected
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSessions(new Set())}
                                className="text-xs text-gray-500"
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {selectedSessions.size === 0 && (
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Active ({filteredSessions.filter(s => s.status === 'active').length})
                            </span>
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              Completed ({filteredSessions.filter(s => s.status === 'completed').length})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conversation List */}
                    <div className="divide-y divide-gray-100">
                      {filteredSessions.map((session, index) => (
                        <ConversationInboxItem
                          key={session.id}
                          session={session}
                          isSelected={selectedSessions.has(session.id)}
                          onClick={() => handleSessionSelect(session.id)}
                          onResume={handleResumeSession}
                          onViewSummary={handleViewSummary}
                          onArchive={handleArchiveSession}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="text-center py-16">
                      <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
                      <p className="text-gray-600 mb-6">Try adjusting your search terms or start a new conversation.</p>
                      <Button
                        variant="primary"
                        onClick={handleNewConversation}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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