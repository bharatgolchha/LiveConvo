'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon,
  CheckIcon,
  PencilIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

// Types
interface ConversationSummary {
  id: string;
  title: string;
  conversationType: string;
  createdAt: string;
  duration: number;
  wordCount: number;
  status: 'active' | 'completed' | 'draft' | 'archived';
  participants: string[];
  summary: {
    overview: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: string[];
    tldr: string;
  };
  followUps: FollowUp[];
  transcript: TranscriptEntry[];
  metadata: {
    audioQuality: number;
    transcriptionAccuracy: number;
    language: string;
    tags: string[];
  };
}

interface FollowUp {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number;
}

// Mock data for the conversation summary
const mockSummary: ConversationSummary = {
  id: '1',
  title: 'Sales Discovery Call - TechCorp',
  conversationType: 'Sales Call',
  createdAt: '2025-01-27T10:30:00Z',
  duration: 1245,
  wordCount: 450,
  status: 'completed',
  participants: ['John Doe (Sales Rep)', 'Sarah Johnson (TechCorp)', 'Mike Smith (TechCorp CTO)'],
  summary: {
    overview: 'Initial discovery call with TechCorp to understand their current pain points and explore potential solutions. The conversation revealed significant challenges with their current workflow automation and a strong interest in our enterprise platform.',
    keyPoints: [
      'TechCorp currently uses multiple disconnected tools for project management',
      'Team of 50+ developers struggling with coordination',
      'Budget allocated for Q2 implementation ($150K-$200K range)',
      'Decision timeline: 4-6 weeks',
      'Key stakeholders: Sarah (Product), Mike (Technical), David (Finance)'
    ],
    decisions: [
      'Proceed with technical demo next week',
      'Provide detailed ROI analysis by Friday',
      'Schedule follow-up with David (Finance) for budget discussion'
    ],
    actionItems: [
      'Send technical requirements questionnaire',
      'Prepare custom demo environment',
      'Create ROI calculator with TechCorp-specific metrics'
    ],
    tldr: 'Promising discovery call with TechCorp. 50+ dev team, $150K-$200K budget, 4-6 week timeline. Next: technical demo + ROI analysis.'
  },
  followUps: [
    {
      id: 'f1',
      text: 'Send technical requirements questionnaire to Mike',
      priority: 'high',
      assignee: 'John Doe',
      dueDate: '2025-01-28',
      completed: false,
      createdAt: '2025-01-27T11:00:00Z'
    },
    {
      id: 'f2',
      text: 'Prepare custom demo environment for TechCorp',
      priority: 'high',
      assignee: 'Technical Team',
      dueDate: '2025-01-30',
      completed: false,
      createdAt: '2025-01-27T11:00:00Z'
    },
    {
      id: 'f3',
      text: 'Schedule follow-up with David (Finance)',
      priority: 'medium',
      assignee: 'John Doe',
      dueDate: '2025-01-29',
      completed: true,
      createdAt: '2025-01-27T11:00:00Z'
    }
  ],
  transcript: [
    {
      id: 't1',
      speaker: 'John Doe',
      text: 'Thanks for taking the time to meet with us today. I\'d love to learn more about your current challenges with project coordination.',
      timestamp: 0,
      confidence: 0.98
    },
    {
      id: 't2',
      speaker: 'Sarah Johnson',
      text: 'Absolutely. We\'ve been struggling with our current setup. We have about 50 developers across multiple teams, and coordination has become a real bottleneck.',
      timestamp: 8,
      confidence: 0.95
    },
    {
      id: 't3',
      speaker: 'Mike Smith',
      text: 'From a technical perspective, we\'re using disparate tools that don\'t integrate well. Our developers spend too much time switching between platforms.',
      timestamp: 22,
      confidence: 0.97
    },
    {
      id: 't4',
      speaker: 'John Doe',
      text: 'That\'s exactly the kind of challenge our platform addresses. Can you tell me more about your current toolchain?',
      timestamp: 35,
      confidence: 0.98
    },
    {
      id: 't5',
      speaker: 'Sarah Johnson',
      text: 'We\'re using Jira for project management, Slack for communication, GitHub for code, and several other tools. The context switching is killing our productivity.',
      timestamp: 48,
      confidence: 0.96
    }
  ],
  metadata: {
    audioQuality: 0.92,
    transcriptionAccuracy: 0.96,
    language: 'en-US',
    tags: ['sales', 'discovery', 'enterprise', 'techcorp']
  }
};

const SummaryPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // In a real app, this would fetch from an API
    setSummary(mockSummary);
    setEditedSummary(mockSummary.summary.overview);
  }, [conversationId]);

  const handleSave = () => {
    if (summary) {
      setSummary({
        ...summary,
        summary: {
          ...summary.summary,
          overview: editedSummary
        }
      });
    }
    setIsEditing(false);
  };

  const handleMarkDone = () => {
    setIsDone(true);
    // In a real app, this would update the conversation status
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Dashboard</span>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{summary.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{formatDuration(summary.duration)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>{summary.wordCount} words</span>
                </span>
                <span className="flex items-center space-x-1">
                  <UserIcon className="w-4 h-4" />
                  <span>{summary.participants.length} participants</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
                         <Button
               variant="outline"
               size="sm"
               onClick={() => setShowExportModal(true)}
               className="flex items-center space-x-2"
             >
               <ArrowDownTrayIcon className="w-4 h-4" />
               <span>Export</span>
             </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <ShareIcon className="w-4 h-4" />
              <span>Share</span>
            </Button>
            <Button
              variant={isDone ? "secondary" : "primary"}
              size="sm"
              onClick={handleMarkDone}
              disabled={isDone}
              className="flex items-center space-x-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{isDone ? 'Marked Done' : 'Mark Done'}</span>
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Quick Stats */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                  <p className="text-sm font-medium">{formatDate(summary.createdAt)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="text-sm font-medium">{formatDuration(summary.duration)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Word Count</p>
                  <p className="text-sm font-medium">{summary.wordCount.toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Audio Quality</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${summary.metadata.audioQuality * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{Math.round(summary.metadata.audioQuality * 100)}%</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Transcription Accuracy</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${summary.metadata.transcriptionAccuracy * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{Math.round(summary.metadata.transcriptionAccuracy * 100)}%</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Participants</p>
                  <div className="space-y-1">
                    {summary.participants.map((participant, index) => (
                      <p key={index} className="text-sm">{participant}</p>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {summary.metadata.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 space-y-8"
          >
            {/* TL;DR */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">TL;DR</h3>
              </div>
              <p className="text-gray-700 bg-amber-50 p-4 rounded-lg border border-amber-200">
                {summary.summary.tldr}
              </p>
            </Card>

            {/* Editable Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="flex items-center space-x-2"
                >
                  {isEditing ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <PencilIcon className="w-4 h-4" />
                      <span>Edit</span>
                    </>
                  )}
                </Button>
              </div>
              
              {isEditing ? (
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Edit the AI-generated summary..."
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">{summary.summary.overview}</p>
              )}
              
              {/* Key Points */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Key Points</h4>
                <ul className="space-y-2">
                  {summary.summary.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Decisions */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Decisions Made</h4>
                <ul className="space-y-2">
                  {summary.summary.decisions.map((decision, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Action Items */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Action Items</h4>
                <ul className="space-y-2">
                  {summary.summary.actionItems.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-4 h-4 border-2 border-amber-500 rounded mt-0.5 flex-shrink-0"></div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Follow-ups */}
            <FollowUpManager 
              followUps={summary.followUps}
              onUpdate={(updatedFollowUps) => {
                setSummary({
                  ...summary,
                  followUps: updatedFollowUps
                });
              }}
            />

            {/* Transcript */}
            <Card className="p-6">
              <button
                onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900">Full Transcript</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{summary.transcript.length} entries</span>
                  {transcriptExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              
              <AnimatePresence>
                {transcriptExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 overflow-hidden"
                  >
                                         <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                       {summary.transcript.map((entry) => (
                         <div key={entry.id} className="flex space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {entry.speaker.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-gray-900">{entry.speaker}</p>
                              <span className="text-xs text-gray-500">
                                {Math.floor(entry.timestamp / 60)}:{(entry.timestamp % 60).toString().padStart(2, '0')}
                              </span>
                              <span className="text-xs text-gray-400">
                                {Math.round(entry.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-gray-700">{entry.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        summary={summary}
      />
    </div>
  );
};

// Follow-up Manager Component
const FollowUpManager: React.FC<{
  followUps: FollowUp[];
  onUpdate: (followUps: FollowUp[]) => void;
}> = ({ followUps, onUpdate }) => {
  const [newFollowUp, setNewFollowUp] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const addFollowUp = () => {
    if (newFollowUp.trim()) {
      const newItem: FollowUp = {
        id: Date.now().toString(),
        text: newFollowUp,
        priority: 'medium',
        completed: false,
        createdAt: new Date().toISOString()
      };
      onUpdate([...followUps, newItem]);
      setNewFollowUp('');
      setShowAddForm(false);
    }
  };

  const toggleComplete = (id: string) => {
    onUpdate(followUps.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteFollowUp = (id: string) => {
    onUpdate(followUps.filter(item => item.id !== id));
  };

  const getPriorityColor = (priority: FollowUp['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Follow-ups</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Follow-up</span>
        </Button>
      </div>

      <div className="space-y-3">
        {followUps.map((item) => (
          <motion.div
            key={item.id}
            layout
            className={`p-4 rounded-lg border transition-all ${
              item.completed 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-white border-gray-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              <button
                onClick={() => toggleComplete(item.id)}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  item.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {item.completed && <CheckIcon className="w-3 h-3 text-white" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {item.text}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="outline" className={`text-xs ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </Badge>
                  {item.assignee && (
                    <span className="text-xs text-gray-500">Assigned to: {item.assignee}</span>
                  )}
                  {item.dueDate && (
                    <span className="text-xs text-gray-500">
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => deleteFollowUp(item.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg"
        >
          <textarea
            value={newFollowUp}
            onChange={(e) => setNewFollowUp(e.target.value)}
            placeholder="Enter follow-up task..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
          <div className="flex items-center space-x-2 mt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={addFollowUp}
              disabled={!newFollowUp.trim()}
            >
              Add Follow-up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewFollowUp('');
              }}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}
    </Card>
  );
};

// Export Modal Component
const ExportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  summary: ConversationSummary;
}> = ({ isOpen, onClose }) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'word' | 'text' | 'json'>('pdf');
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [includeFollowUps, setIncludeFollowUps] = useState(true);

  const handleExport = () => {
    // In a real app, this would trigger the actual export
    console.log('Exporting...', { format: exportFormat, includeTranscript, includeFollowUps });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Summary</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pdf', label: 'PDF' },
                { value: 'word', label: 'Word' },
                { value: 'text', label: 'Text' },
                { value: 'json', label: 'JSON' }
              ].map((format) => (
                <button
                  key={format.value}
                                     onClick={() => setExportFormat(format.value as 'pdf' | 'word' | 'text' | 'json')}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    exportFormat === format.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeTranscript}
                onChange={(e) => setIncludeTranscript(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include full transcript</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeFollowUps}
                onChange={(e) => setIncludeFollowUps(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include follow-ups</span>
            </label>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mt-6">
          <Button
            variant="primary"
            onClick={handleExport}
            className="flex-1"
          >
            Export
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SummaryPage; 