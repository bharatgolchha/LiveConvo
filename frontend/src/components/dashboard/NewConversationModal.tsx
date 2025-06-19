import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
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
  PencilSquareIcon,
  UserIcon,
  ArrowRightIcon
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
import { useAuth } from '@/contexts/AuthContext';

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
    emoji: '💰',
    description: 'Prospecting, demos, negotiations, and closing deals',
    icon: PhoneIcon,
    iconSolid: PhoneSolid,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    popular: true
  },
  {
    id: 'support' as const,
    title: 'Customer Support',
    emoji: '🤝',
    description: 'Troubleshooting, onboarding, and customer success',
    icon: UserGroupIcon,
    iconSolid: UserGroupSolid,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
    hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
  },
  {
    id: 'meeting' as const,
    title: 'Team Meeting',
    emoji: '📊',
    description: 'Stand-ups, planning, reviews, and team discussions',
    icon: PresentationChartBarIcon,
    iconSolid: PresentationSolid,
    color: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-300',
    hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30',
    popular: true
  },
  {
    id: 'interview' as const,
    title: 'Interview',
    emoji: '🎤',
    description: 'Candidate screening, technical interviews, and evaluations',
    icon: MicrophoneIcon,
    iconSolid: MicrophoneSolid,
    color: 'from-orange-500 to-amber-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-700 dark:text-orange-300',
    hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
  },
  {
    id: 'coaching' as const,
    title: 'Coaching Session',
    emoji: '✨',
    description: '1-on-1s, performance reviews, and mentoring calls',
    icon: SparklesIcon,
    iconSolid: SparklesSolid,
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
    textColor: 'text-pink-700 dark:text-pink-300',
    hoverBg: 'hover:bg-pink-50 dark:hover:bg-pink-950/30'
  },
  {
    id: 'custom' as const,
    title: 'Custom',
    emoji: '✏️',
    description: 'Define your own conversation type',
    icon: PencilSquareIcon,
    iconSolid: PencilSquareSolid,
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
    hoverBg: 'hover:bg-slate-50 dark:hover:bg-slate-950/30'
  }
];

const contextExamples = [
  "Quarterly review with focus on performance goals and career development",
  "Discovery call for enterprise SaaS solution - budget range $50-100k",
  "Technical interview for senior developer position - focus on React and Node.js",
  "Customer onboarding call - implementing new features",
  "Team retrospective - discussing Q4 achievements and Q1 planning"
];

// Step 1 Component
interface Step1Props {
  title: string;
  setTitle: (value: string) => void;
  conversationType: string;
  setConversationType: (value: any) => void;
  customType: string;
  setCustomType: (value: string) => void;
}

const Step1QuickStart: React.FC<Step1Props> = React.memo(({ 
  title, 
  setTitle, 
  conversationType, 
  setConversationType, 
  customType, 
  setCustomType 
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    {/* Title Input */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        What's this conversation about?
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Q4 Planning Meeting, Sales Demo with Acme Corp"
        className="w-full px-4 py-3 text-lg bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
        maxLength={100}
        autoFocus
      />
      <p className="text-xs text-muted-foreground">
        Give your conversation a memorable title
      </p>
    </div>

    {/* Conversation Type Selection */}
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Select conversation type
      </label>
      <div className="grid grid-cols-2 gap-4">
        {conversationTypes.map((type) => {
          const isSelected = conversationType === type.id;
          
          return (
            <motion.button
              key={type.id}
              onClick={() => setConversationType(type.id)}
              className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                isSelected 
                  ? `${type.borderColor} ${type.bgColor} shadow-lg` 
                  : `border-border hover:border-primary/20 hover:shadow-md bg-card/50`
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {type.popular && !isSelected && (
                <span className="absolute -top-2.5 -right-2.5 px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full shadow-sm">
                  Popular
                </span>
              )}
              
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-white/20 dark:bg-white/10' 
                        : 'bg-muted/50'
                    }`}>
                      {type.emoji}
                    </div>
                    <h3 className={`font-semibold text-base ${
                      isSelected ? type.textColor : 'text-foreground'
                    }`}>
                      {type.title}
                    </h3>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="p-1.5 bg-primary rounded-full flex-shrink-0"
                    >
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${
                  isSelected 
                    ? 'text-current opacity-80' 
                    : 'text-muted-foreground'
                }`}>
                  {type.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Custom Type Input */}
      <AnimatePresence>
        {conversationType === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Enter your custom conversation type..."
              className="w-full mt-2 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
              maxLength={30}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
));

Step1QuickStart.displayName = 'Step1QuickStart';

// Step 2 Component
interface Step2Props {
  participantMe: string;
  setParticipantMe: (value: string) => void;
  participantThem: string;
  setParticipantThem: (value: string) => void;
  relationshipTag: string;
  setRelationshipTag: (value: string) => void;
}

const Step2Participants: React.FC<Step2Props> = React.memo(({ 
  participantMe, 
  setParticipantMe, 
  participantThem, 
  setParticipantThem,
  relationshipTag,
  setRelationshipTag
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    {/* Participant Names */}
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <UserIcon className="w-4 h-4" />
          You
        </label>
        <input
          type="text"
          value={participantMe}
          onChange={(e) => setParticipantMe(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
          maxLength={50}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <UserGroupIcon className="w-4 h-4" />
          Them
        </label>
        <input
          type="text"
          value={participantThem}
          onChange={(e) => setParticipantThem(e.target.value)}
          placeholder="Their name"
          className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
          maxLength={50}
          autoFocus
        />
      </div>
    </div>

    {/* Visual Preview */}
    <div className="p-4 bg-muted/30 rounded-xl space-y-3">
      <p className="text-xs text-muted-foreground mb-2">Preview of how names will appear:</p>
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {participantMe ? participantMe[0].toUpperCase() : 'Y'}
          </div>
          <div className="flex-1">
            <div className="inline-block px-3 py-2 bg-blue-500 text-white rounded-lg rounded-tl-none">
              <span className="text-xs font-medium opacity-80">{participantMe || 'You'}</span>
              <p className="text-sm mt-0.5">This is how your messages will appear in the transcript...</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-medium">
            {participantThem ? participantThem[0].toUpperCase() : 'T'}
          </div>
          <div className="flex-1">
            <div className="inline-block px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg rounded-tl-none">
              <span className="text-xs font-medium opacity-80">{participantThem || 'Them'}</span>
              <p className="text-sm mt-0.5">And this is how their messages will appear...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Relationship Tags (Optional) */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Relationship <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {['Client', 'Colleague', 'Direct Report', 'Manager', 'Candidate', 'Partner'].map((tag) => (
          <button
            key={tag}
            onClick={() => setRelationshipTag(relationshipTag === tag ? '' : tag)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
              relationshipTag === tag
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:border-primary/50'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  </motion.div>
));

Step2Participants.displayName = 'Step2Participants';

// Step 3 Component
interface Step3Props {
  contextText: string;
  setContextText: (value: string) => void;
  sessions: Session[];
  participantThem: string;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  search: string;
  setSearch: (value: string) => void;
  filteredSessions: Session[];
}

const Step3Context: React.FC<Step3Props> = React.memo(({ 
  contextText, 
  setContextText,
  sessions,
  participantThem,
  selectedIds,
  toggleSelect,
  search,
  setSearch,
  filteredSessions
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    {/* Context Text */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        What's this conversation about? <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <textarea
        value={contextText}
        onChange={(e) => setContextText(e.target.value)}
        placeholder="Add any background information, goals, or specific topics you want to cover..."
        rows={4}
        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground resize-none"
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <button
          onClick={() => setContextText(contextExamples[Math.floor(Math.random() * contextExamples.length)])}
          className="text-xs text-primary hover:underline"
        >
          Try an example
        </button>
        <span className="text-xs text-muted-foreground">
          {contextText.length}/2000
        </span>
      </div>
    </div>

    {/* Previous Conversations */}
    {sessions.filter(s => s.status === 'completed').length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Link related conversations <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          {participantThem && filteredSessions.some(s => s.participant_them?.toLowerCase().includes(participantThem.toLowerCase())) && (
            <span className="text-xs text-primary">
              Filtered by {participantThem}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
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

        {/* Conversations Grid */}
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {filteredSessions.slice(0, 10).map(session => {
            const isSelected = selectedIds.includes(session.id);
            const sessionType = conversationTypes.find(t => t.id === session.conversation_type);
            
            return (
              <motion.label
                key={session.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
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
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {session.title || 'Untitled Conversation'}
                    </h4>
                    {sessionType && (
                      <span className={`text-xs ${sessionType.textColor}`}>
                        {sessionType.emoji}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {session.participant_them && (
                      <span>with {session.participant_them}</span>
                    )}
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.label>
            );
          })}
        </div>
      </div>
    )}
  </motion.div>
));

Step3Context.displayName = 'Step3Context';

const NewConversationModal: React.FC<Props> = ({ isOpen, onClose, onStart, sessions = [] }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [conversationType, setConversationType] = useState<'sales' | 'support' | 'meeting' | 'interview' | 'coaching' | 'custom'>('sales');
  const [customType, setCustomType] = useState('');
  const [participantMe, setParticipantMe] = useState('');
  const [participantThem, setParticipantThem] = useState('');
  const [relationshipTag, setRelationshipTag] = useState<string>('');
  const [contextText, setContextText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Set the user's name when component mounts or user changes
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setParticipantMe(user.user_metadata.full_name);
    }
  }, [user]);

  // Auto-filter sessions by participant name
  const filteredSessions = sessions
    .filter(s => s.status === 'completed')
    .filter(s => {
      const matchesSearch = s.title?.toLowerCase().includes(search.toLowerCase()) || 
                          s.conversation_type?.toLowerCase().includes(search.toLowerCase());
      const matchesParticipant = participantThem && s.participant_them?.toLowerCase().includes(participantThem.toLowerCase());
      
      return search ? matchesSearch : (matchesParticipant || true);
    })
    .slice(0, 20);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      await onStart({
        conversationType: conversationType === 'custom' ? customType.trim() : conversationType,
        context: { text: contextText, files: [] },
        title: title.trim(),
        selectedPreviousConversations: selectedIds,
        participantMe: participantMe.trim() || undefined,
        participantThem: participantThem.trim()
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
    setParticipantThem('');
    setRelationshipTag('');
  };

  const canProceedStep1 = title.trim() && (conversationType !== 'custom' || customType.trim());
  const canProceedStep2 = participantThem.trim();
  const canStartRecording = canProceedStep1 && canProceedStep2;

  const selectedType = conversationTypes.find(t => t.id === conversationType)!;

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
                  <h2 className="text-2xl font-semibold text-foreground mb-3">
                    Start New Conversation
                  </h2>
                  
                  {/* Progress Dots */}
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-2 transition-all ${
                          i <= step 
                            ? 'w-8 bg-primary rounded-full' 
                            : 'w-2 bg-muted rounded-full'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {step === 0 && 'Basics'}
                      {step === 1 && 'Participants'}
                      {step === 2 && 'Context (optional)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-6 min-h-[400px]">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <Step1QuickStart
                      key="step1"
                      title={title}
                      setTitle={setTitle}
                      conversationType={conversationType}
                      setConversationType={setConversationType}
                      customType={customType}
                      setCustomType={setCustomType}
                    />
                  )}
                  {step === 1 && (
                    <Step2Participants
                      key="step2"
                      participantMe={participantMe}
                      setParticipantMe={setParticipantMe}
                      participantThem={participantThem}
                      setParticipantThem={setParticipantThem}
                      relationshipTag={relationshipTag}
                      setRelationshipTag={setRelationshipTag}
                    />
                  )}
                  {step === 2 && (
                    <Step3Context
                      key="step3"
                      contextText={contextText}
                      setContextText={setContextText}
                      sessions={sessions}
                      participantThem={participantThem}
                      selectedIds={selectedIds}
                      toggleSelect={toggleSelect}
                      search={search}
                      setSearch={setSearch}
                      filteredSessions={filteredSessions}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-muted/20 border-t border-border/50">
                <div className="flex justify-between items-center">
                  {step > 0 ? (
                    <button
                      onClick={() => setStep(step - 1)}
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
                    {step === 2 && (
                      <button
                        onClick={handleStart}
                        disabled={!canStartRecording || isStarting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Skip & Start
                      </button>
                    )}

                    {step < 2 ? (
                      <button
                        onClick={() => setStep(step + 1)}
                        disabled={(step === 0 && !canProceedStep1) || (step === 1 && !canProceedStep2) || isStarting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleStart}
                        disabled={!canStartRecording || isStarting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl font-medium hover:from-primary/90 hover:to-primary/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                      >
                        {isStarting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            Start Recording
                            <span className="text-lg ml-1">🎙️</span>
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