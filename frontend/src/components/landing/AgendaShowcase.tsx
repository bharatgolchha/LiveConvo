import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ChevronRight,
  RefreshCw,
  Plus,
  GripVertical,
  Edit2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type AgendaStatus = 'open' | 'in_progress' | 'done';

interface AgendaItem {
  id: string;
  title: string;
  status: AgendaStatus;
  timestamp?: string;
}

const initialAgendaItems: AgendaItem[] = [
  { id: '1', title: 'Introductions & Background', status: 'open' },
  { id: '2', title: 'Review Q3 Performance Metrics', status: 'open' },
  { id: '3', title: 'Discuss Budget Allocation', status: 'open' },
  { id: '4', title: 'Timeline & Milestones', status: 'open' },
  { id: '5', title: 'Technical Requirements', status: 'open' },
  { id: '6', title: 'Pricing & Contract Terms', status: 'open' },
  { id: '7', title: 'Next Steps & Action Items', status: 'open' }
];

const transcriptSnippets = [
  { speaker: 'You', text: "Let's start with quick introductions. I'm Sarah from the sales team..." },
  { speaker: 'Client', text: "Great to meet you. I'm John, head of procurement..." },
  { speaker: 'You', text: "Now, looking at Q3 performance, we saw a 23% increase..." },
  { speaker: 'Client', text: "Those metrics look impressive. How does that compare to..." },
  { speaker: 'You', text: "Regarding budget, we have several flexible options..." },
  { speaker: 'Client', text: "Our budget range is between 50-75k for this quarter..." },
];

export function AgendaShowcase() {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(initialAgendaItems);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTranscriptIndex, setCurrentTranscriptIndex] = useState(0);
  const [showGeneration, setShowGeneration] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const completedCount = agendaItems.filter(item => item.status === 'done').length;
  const inProgressCount = agendaItems.filter(item => item.status === 'in_progress').length;
  const completionPercentage = Math.round((completedCount / agendaItems.length) * 100);

  const startDemo = () => {
    setShowGeneration(true);
    setAgendaItems([]);
    setCurrentTranscriptIndex(0);
    
    // Show generation animation
    setTimeout(() => {
      setShowGeneration(false);
      setAgendaItems(initialAgendaItems);
      setIsAnimating(true);
      simulateProgress();
    }, 2000);
  };

  const simulateProgress = () => {
    const sequence = [
      { itemId: '1', status: 'in_progress' as AgendaStatus, delay: 500 },
      { itemId: '1', status: 'done' as AgendaStatus, delay: 2000 },
      { itemId: '2', status: 'in_progress' as AgendaStatus, delay: 2500 },
      { itemId: '2', status: 'done' as AgendaStatus, delay: 4000 },
      { itemId: '3', status: 'in_progress' as AgendaStatus, delay: 4500 },
    ];

    sequence.forEach(({ itemId, status, delay }) => {
      setTimeout(() => {
        setAgendaItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, status, timestamp: new Date().toLocaleTimeString() } : item
          )
        );
      }, delay);
    });

    // Update transcript
    const transcriptTimer = setInterval(() => {
      setCurrentTranscriptIndex(prev => {
        if (prev >= transcriptSnippets.length - 1) {
          clearInterval(transcriptTimer);
          setIsAnimating(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    setTimeout(() => {
      setIsAnimating(false);
    }, 6000);
  };

  const resetDemo = () => {
    setAgendaItems(initialAgendaItems);
    setCurrentTranscriptIndex(0);
    setIsAnimating(false);
    setShowGeneration(false);
  };

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-app-success/10 text-app-success text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Agenda Tracking
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-foreground">
            Stay on Track,{' '}
            <span className="bg-gradient-to-r from-app-success to-app-info bg-clip-text text-transparent">
              Every Time
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Nova tracks your agenda automatically, marking items complete as you discuss them—so you never miss a beat during important conversations.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              {/* Mock UI Header */}
              <div className="bg-muted/50 px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-app-success" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Agenda Progress</div>
                      <div className="text-xs text-foreground/60">
                        {completedCount}/{agendaItems.length} completed ({completionPercentage}%)
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={isAnimating ? resetDemo : startDemo}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  >
                    {isAnimating ? (
                      <>Reset <RefreshCw className="w-3 h-3" /></>
                    ) : (
                      <>Try It <ChevronRight className="w-3 h-3" /></>
                    )}
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-app-success to-app-info"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Agenda Items */}
              <div className="p-6 space-y-3 min-h-[400px]">
                <AnimatePresence mode="wait">
                  {showGeneration ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Generating agenda from context...</p>
                      <p className="text-xs text-muted-foreground mt-1">Analyzing meeting type and participants</p>
                    </motion.div>
                  ) : (
                    <motion.div className="space-y-2">
                      {agendaItems.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: showGeneration ? 0 : index * 0.1 }}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border transition-all
                            ${item.status === 'done' ? 'bg-app-success/5 border-app-success/30' : 
                              item.status === 'in_progress' ? 'bg-app-info/5 border-app-info/30 shadow-sm' : 
                              'bg-card border-border hover:border-border/80'}
                          `}
                        >
                          {/* Drag Handle */}
                          <div className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          {/* Status Icon */}
                          <button className="shrink-0">
                            {item.status === 'done' ? (
                              <CheckCircle2 className="w-5 h-5 text-app-success" />
                            ) : item.status === 'in_progress' ? (
                              <div className="w-5 h-5 rounded-full border-2 border-app-info animate-pulse" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </button>
                          
                          {/* Title */}
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              item.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}>
                              {item.title}
                            </p>
                            {item.timestamp && item.status === 'done' && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Completed at {item.timestamp}
                              </p>
                            )}
                          </div>
                          
                          {/* Status Badge */}
                          <div className={`
                            px-2 py-0.5 rounded text-xs font-medium
                            ${item.status === 'done' ? 'bg-app-success/10 text-app-success' :
                              item.status === 'in_progress' ? 'bg-app-info/10 text-app-info animate-pulse' :
                              'bg-muted text-muted-foreground'}
                          `}>
                            {item.status === 'in_progress' ? 'discussing' : item.status}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Add Item Bar */}
                {!showGeneration && agendaItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 pt-2"
                  >
                    <input
                      type="text"
                      placeholder="Add agenda item..."
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background/50 focus:outline-none focus:border-primary/50"
                    />
                    <button className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Live Transcript Simulation */}
            {isAnimating && currentTranscriptIndex > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-card/50 border border-border rounded-xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-xs font-medium text-muted-foreground">Live Transcript</p>
                </div>
                <div className="space-y-2">
                  {transcriptSnippets.slice(0, currentTranscriptIndex).map((snippet, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs"
                    >
                      <span className="font-semibold text-foreground">{snippet.speaker}:</span>{' '}
                      <span className="text-muted-foreground">{snippet.text}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right: Benefits & Features */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            {/* Key Benefits */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-foreground">
                Never lose track of important discussion points
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-app-success/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-app-success" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">AI-Generated Agendas</h4>
                    <p className="text-sm text-foreground/70">
                      Upload your meeting context, and Nova instantly creates a comprehensive agenda tailored to your conversation type.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-app-info/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-app-info" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Real-Time Progress Tracking</h4>
                    <p className="text-sm text-foreground/70">
                      Items automatically update to "in progress" or "done" as you discuss them—with less than 2-second detection time.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Edit2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Full Manual Control</h4>
                    <p className="text-sm text-foreground/70">
                      Add, edit, reorder, or delete items on the fly. Your agenda adapts to the natural flow of conversation.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-app-success-light/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-app-success-light" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Smart Context Analysis</h4>
                    <p className="text-sm text-foreground/70">
                      Nova analyzes your entire conversation to ensure accurate agenda tracking, even for complex discussion topics.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Use Cases */}
            <div className="p-6 bg-card/50 rounded-xl border border-border/50">
              <h4 className="font-semibold mb-4 text-foreground">Perfect for:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-app-success shrink-0" />
                  <span className="text-sm text-foreground">Sales Calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-app-success shrink-0" />
                  <span className="text-sm text-foreground">Job Interviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-app-success shrink-0" />
                  <span className="text-sm text-foreground">Team Meetings</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-app-success shrink-0" />
                  <span className="text-sm text-foreground">Client Reviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-app-success shrink-0" />
                  <span className="text-sm text-foreground">1-on-1s</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-app-success shrink-0" />
                  <span className="text-sm text-foreground">Consultations</span>
                </div>
              </div>
            </div>

          </motion.div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-app-success mb-1">95%</div>
            <p className="text-sm text-muted-foreground">Agenda completion accuracy</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-app-info mb-1">&lt;2s</div>
            <p className="text-sm text-muted-foreground">Real-time detection speed</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">10+</div>
            <p className="text-sm text-muted-foreground">Languages supported</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default AgendaShowcase;