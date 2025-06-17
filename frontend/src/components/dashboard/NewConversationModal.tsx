import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PhoneIcon,
  UserGroupIcon,
  PresentationChartBarIcon,
  CheckIcon,
  ClockIcon,
  CalendarDaysIcon,
  MicrophoneIcon,
  SparklesIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { 
  PhoneIcon as PhoneSolid,
  UserGroupIcon as UserGroupSolid,
  PresentationChartBarIcon as PresentationSolid,
  MicrophoneIcon as MicrophoneSolid,
  SparklesIcon as SparklesSolid,
  PencilSquareIcon as PencilSquareSolid
} from '@heroicons/react/24/solid';
import type { ConversationConfig } from '@/types/app';
import type { Session } from '@/lib/hooks/useSessions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: ConversationConfig) => void;
  sessions?: Session[];
}

const conversationTypes = [
  {
    id: 'sales' as const,
    title: 'Sales Call',
    description: 'Prospecting, demos, negotiations, and closing deals',
    icon: PhoneIcon,
    iconSolid: PhoneSolid,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300'
  },
  {
    id: 'support' as const,
    title: 'Customer Support',
    description: 'Troubleshooting, onboarding, and customer success',
    icon: UserGroupIcon,
    iconSolid: UserGroupSolid,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'meeting' as const,
    title: 'Team Meeting',
    description: 'Stand-ups, planning, reviews, and team discussions',
    icon: PresentationChartBarIcon,
    iconSolid: PresentationSolid,
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-300'
  },
  {
    id: 'interview' as const,
    title: 'Interview',
    description: 'Candidate screening, technical interviews, and evaluations',
    icon: MicrophoneIcon,
    iconSolid: MicrophoneSolid,
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'coaching' as const,
    title: 'Coaching Session',
    description: '1-on-1s, performance reviews, and mentoring calls',
    icon: SparklesIcon,
    iconSolid: SparklesSolid,
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    textColor: 'text-pink-700 dark:text-pink-300'
  },
  {
    id: 'custom' as const,
    title: 'Custom',
    description: 'Define your own conversation type and focus',
    icon: PencilSquareIcon,
    iconSolid: PencilSquareSolid,
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300'
  }
];

const NewConversationModal: React.FC<Props> = ({ isOpen, onClose, onStart, sessions = [] }) => {
  const [conversationType, setConversationType] = useState<'sales' | 'support' | 'meeting' | 'interview' | 'coaching' | 'custom'>('sales');
  const [customType, setCustomType] = useState('');
  const [title, setTitle] = useState('');
  const [contextText, setContextText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<0 | 1>(0);
  const [isStarting, setIsStarting] = useState(false);

  const filteredSessions = sessions
    .filter(s => s.status === 'completed') // Only show completed sessions
    .filter(s =>
      s.title?.toLowerCase().includes(search.toLowerCase()) || 
      s.conversation_type?.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 20); // Limit to 20 for performance

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleStart = async () => {
    if (!title.trim()) {
      // Focus title input if empty
      return;
    }

    if (conversationType === 'custom' && !customType.trim()) {
      // Custom type requires a name
      return;
    }

    setIsStarting(true);
    
    try {
      await onStart({
        conversationType: conversationType === 'custom' ? customType.trim() : conversationType,
        context: { text: contextText, files: [] },
        title: title.trim(),
        selectedPreviousConversations: selectedIds
      } as unknown as ConversationConfig);
      onClose();
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = () => {
    if (isStarting) return;
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setCustomType('');
    setContextText('');
    setSelectedIds([]);
    setSearch('');
    setStep(0);
    setIsStarting(false);
  };

  const selectedType = conversationTypes.find(t => t.id === conversationType)!;
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <AnimatePresence onExitComplete={resetForm}>
      {isOpen && (
        <Dialog open={isOpen} as="div" className="fixed inset-0 z-50" onClose={handleClose}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full border border-border/50 overflow-hidden"
            >
              {/* Header */}
              <div className="relative px-8 py-6 bg-gradient-to-r from-background/80 to-muted/30 border-b border-border/50">
                <button
                  onClick={handleClose}
                  disabled={isStarting}
                  className="absolute right-6 top-6 p-2 hover:bg-muted/50 rounded-full transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className="pr-12">
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Start New Conversation
                  </h2>
                  
                  {/* Progress Indicator */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full transition-colors ${step === 0 ? 'bg-primary' : 'bg-primary/60'}`} />
                      <span className={`text-sm font-medium transition-colors ${step === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Setup
                      </span>
                    </div>
                    <div className="w-8 h-px bg-border" />
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
                      <span className={`text-sm font-medium transition-colors ${step === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Context
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6 min-h-[400px]">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="step-0"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* Title Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Conversation Title *
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter a descriptive title for this conversation..."
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                          maxLength={100}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            A clear title helps you find this conversation later
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {title.length}/100
                          </span>
                        </div>
                      </div>

                      {/* Context Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Conversation Context
                          <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                        </label>
                        <textarea
                          value={contextText}
                          onChange={(e) => setContextText(e.target.value)}
                          placeholder={
                            conversationType === 'custom' 
                              ? "Describe what you want to achieve in this conversation and any specific guidance you need..."
                              : "Add any relevant background information, goals, or context that will help the AI provide better guidance..."
                          }
                          rows={4}
                          className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground resize-none"
                          maxLength={2000}
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">
                            {conversationType === 'custom' 
                              ? 'Help AI understand your specific needs and goals'
                              : 'This helps AI provide more relevant guidance'
                            }
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {contextText.length}/2000
                          </span>
                        </div>
                      </div>

                      {/* Conversation Type */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">
                          Conversation Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {conversationTypes.map((type) => {
                            const Icon = conversationType === type.id ? type.iconSolid : type.icon;
                            const isSelected = conversationType === type.id;
                            
                            return (
                              <motion.button
                                key={type.id}
                                onClick={() => setConversationType(type.id)}
                                className={`relative p-3 rounded-lg border-2 transition-all text-left group ${
                                  isSelected 
                                    ? `${type.borderColor} ${type.bgColor}` 
                                    : 'border-border hover:border-border/80 hover:bg-muted/30'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`p-1.5 rounded-md ${isSelected ? `bg-gradient-to-br ${type.color}` : 'bg-muted'}`}>
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-medium ${isSelected ? type.textColor : 'text-foreground'} truncate`}>
                                      {type.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 overflow-hidden" style={{ 
                                      display: '-webkit-box', 
                                      WebkitLineClamp: 2, 
                                      WebkitBoxOrient: 'vertical' 
                                    }}>
                                      {type.description}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="p-0.5 bg-primary rounded-full flex-shrink-0"
                                    >
                                      <CheckIcon className="w-2.5 h-2.5 text-white" />
                                    </motion.div>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>

                        {/* Custom Type Input */}
                        {conversationType === 'custom' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium text-foreground">
                              Custom Type Name *
                            </label>
                            <input
                              type="text"
                              value={customType}
                              onChange={(e) => setCustomType(e.target.value)}
                              placeholder="e.g. Discovery Call, Demo, Check-in, Training..."
                              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                              maxLength={30}
                            />
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-muted-foreground">
                                Choose a name that describes the purpose of your conversation
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {customType.length}/30
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      {completedSessions.length > 0 ? (
                        <>
                          <div className="space-y-2">
                            <h3 className="text-lg font-medium text-foreground">
                              Add Previous Conversations
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Select previous conversations to provide context. Their summaries will help AI understand the broader picture.
                            </p>
                          </div>

                          {/* Search */}
                          <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search conversations..."
                              value={search}
                              onChange={e => setSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                          </div>

                          {/* Selection Counter */}
                          {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                              <CheckIcon className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-primary">
                                {selectedIds.length} conversation{selectedIds.length === 1 ? '' : 's'} selected
                              </span>
                            </div>
                          )}

                          {/* Conversations List */}
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {filteredSessions.length > 0 ? (
                              filteredSessions.map(session => {
                                const isSelected = selectedIds.includes(session.id);
                                const sessionType = conversationTypes.find(t => t.id === session.conversation_type);
                                
                                return (
                                  <motion.label
                                    key={session.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-border hover:border-border/80 hover:bg-muted/30'
                                    }`}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelect(session.id)}
                                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium text-foreground truncate">
                                          {session.title || 'Untitled Conversation'}
                                        </h4>
                                        {sessionType && (
                                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sessionType.bgColor} ${sessionType.textColor}`}>
                                            <sessionType.icon className="w-3 h-3" />
                                            {sessionType.title}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <CalendarDaysIcon className="w-3 h-3" />
                                          {new Date(session.created_at).toLocaleDateString()}
                                        </span>
                                        {session.recording_ended_at && session.recording_started_at && (
                                          <span className="flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" />
                                            {Math.round((new Date(session.recording_ended_at).getTime() - new Date(session.recording_started_at).getTime()) / 60000)}m
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.label>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No conversations found</p>
                                <p className="text-xs mt-1">Try adjusting your search terms</p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <PhoneIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            No Previous Conversations
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            You don't have any completed conversations yet. Start your first conversation to build context for future sessions.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-muted/20 border-t border-border/50">
                <div className="flex justify-between items-center">
                  {step > 0 ? (
                    <button
                      onClick={() => setStep(0)}
                      disabled={isStarting}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      Back
                    </button>
                  ) : (
                    <button
                      onClick={handleClose}
                      disabled={isStarting}
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}

                  <div className="flex gap-3">
                    {step === 0 && (
                      <button
                        onClick={() => setStep(1)}
                        disabled={!title.trim() || (conversationType === 'custom' && !customType.trim()) || isStarting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    )}

                    {step === 1 && (
                      <button
                        onClick={handleStart}
                        disabled={!title.trim() || (conversationType === 'custom' && !customType.trim()) || isStarting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-medium hover:from-primary/90 hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                      >
                        {isStarting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <PlusIcon className="w-4 h-4" />
                            Start Conversation
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default NewConversationModal; 