import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { supabase } from '@/lib/supabase';
import { LoadingStates } from '../common/LoadingStates';
import { useSmartNotes } from '@/lib/meeting/hooks/useSmartNotes';
import { 
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { SmartNote } from '@/lib/meeting/types/transcript.types';

const categoryConfig = {
  key_point: {
    icon: LightBulbIcon,
    label: 'Key Point',
    color: 'text-app-info',
    bgColor: 'bg-app-info-light/10 dark:bg-app-info-light/5',
    borderColor: 'border-app-info/20'
  },
  action_item: {
    icon: ClipboardDocumentCheckIcon,
    label: 'Action Item',
    color: 'text-app-success',
    bgColor: 'bg-app-success-light/10 dark:bg-app-success-light/5',
    borderColor: 'border-app-success/20'
  },
  decision: {
    icon: ChatBubbleBottomCenterTextIcon,
    label: 'Decision',
    color: 'text-primary',
    bgColor: 'bg-primary/5 dark:bg-primary/10',
    borderColor: 'border-primary/20'
  },
  question: {
    icon: QuestionMarkCircleIcon,
    label: 'Question',
    color: 'text-app-warning',
    bgColor: 'bg-app-warning-light/10 dark:bg-app-warning-light/5',
    borderColor: 'border-app-warning/20'
  },
  insight: {
    icon: ExclamationTriangleIcon,
    label: 'Insight',
    color: 'text-accent',
    bgColor: 'bg-accent/10 dark:bg-accent/5',
    borderColor: 'border-accent/20'
  }
};

export function SmartNotesTab() {
  const { meeting, smartNotes, addSmartNote, updateSmartNote, deleteSmartNote } = useMeetingContext();
  const { loading, error, generateNotes } = useSmartNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [filter, setFilter] = useState<SmartNote['category'] | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ 
    category: 'key_point' as SmartNote['category'], 
    content: '' 
  });

  // Debug logging
  console.log('[SmartNotesTab] Render - smartNotes:', smartNotes);
  console.log('[SmartNotesTab] Render - loading:', loading);
  console.log('[SmartNotesTab] Render - error:', error);

  const filteredNotes = filter === 'all' 
    ? smartNotes 
    : smartNotes.filter(note => note.category === filter);

  console.log('[SmartNotesTab] Render - filteredNotes:', filteredNotes);

  const handleEdit = (note: SmartNote) => {
    setEditingId(note.id);
    setEditText(note.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      updateSmartNote(editingId, { content: editText.trim() });
      setEditingId(null);
      setEditText('');
    }
  };

  const handleAddNote = async () => {
    if (newNote.content.trim()) {
      const tempId = `manual-${Date.now()}`;
      const localNote: SmartNote = {
        id: tempId,
        category: newNote.category,
        content: newNote.content.trim(),
        importance: 'medium',
        timestamp: new Date().toISOString()
      };
      // Optimistic add
      addSmartNote(localNote);

      // Persist to DB
      try {
        if (!meeting?.id) throw new Error('Missing meeting id');

        const { data: meetingData, error: meetingErr } = await supabase
          .from('sessions')
          .select('organization_id, user_id')
          .eq('id', meeting.id)
          .single();

        if (meetingErr || !meetingData) throw meetingErr || new Error('Failed to load meeting');

        const { data: inserted, error: insertError } = await supabase
          .from('smart_notes')
          .insert({
            session_id: meeting.id,
            user_id: meetingData.user_id,
            organization_id: meetingData.organization_id,
            category: localNote.category,
            content: localNote.content,
            importance: localNote.importance,
            is_manual: true
          })
          .select('id')
          .single();

        if (!insertError && inserted?.id) {
          // replace temp id with persisted id
          updateSmartNote(tempId, { id: String(inserted.id) });
        }
      } catch (e) {
        console.error('[SmartNotesTab] Failed to persist smart note:', e);
      }

      setNewNote({ category: 'key_point', content: '' });
      setIsAdding(false);
    }
  };

  if (loading && smartNotes.length === 0) {
    return <LoadingStates type="notes" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Smart Notes</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={generateNotes}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Notes'}
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Add Note"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              filter === 'all' 
                ? 'bg-background text-foreground shadow-sm border border-border' 
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            All ({smartNotes.length})
          </button>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const count = smartNotes.filter(n => n.category === key).length;
            if (count === 0) return null;
            
            return (
              <button
                key={key}
                onClick={() => setFilter(key as SmartNote['category'])}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  filter === key 
                    ? 'bg-background text-foreground shadow-sm border border-border' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Add New Note */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex gap-2">
                <select
                  value={newNote.category}
                  onChange={(e) => setNewNote({ ...newNote, category: e.target.value as SmartNote['category'] })}
                  className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Enter your note..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewNote({ category: 'key_point', content: '' });
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.content.trim()}
                  className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'No notes yet. Notes will appear as the conversation progresses.'
                : `No ${categoryConfig[filter as keyof typeof categoryConfig].label.toLowerCase()}s yet.`}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotes.map((note, index) => {
              const config = categoryConfig[note.category] || categoryConfig.key_point;
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card rounded-xl p-4 ${config.bgColor} border ${config.borderColor} shadow-sm hover:shadow-md transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-muted/50 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {!editingId && (
                            <>
                              <button
                                onClick={() => handleEdit(note)}
                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                              >
                                <PencilIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteSmartNote(note.id)}
                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditText('');
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {note.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}