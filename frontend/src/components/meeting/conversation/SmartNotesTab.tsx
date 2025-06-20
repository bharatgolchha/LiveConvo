import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
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
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20'
  },
  action_item: {
    icon: ClipboardDocumentCheckIcon,
    label: 'Action Item',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20'
  },
  decision: {
    icon: ChatBubbleBottomCenterTextIcon,
    label: 'Decision',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20'
  },
  question: {
    icon: QuestionMarkCircleIcon,
    label: 'Question',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20'
  },
  insight: {
    icon: ExclamationTriangleIcon,
    label: 'Insight',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20'
  }
};

export function SmartNotesTab() {
  const { smartNotes, addSmartNote, updateSmartNote, deleteSmartNote } = useMeetingContext();
  const { loading, error, generateNotes } = useSmartNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [filter, setFilter] = useState<SmartNote['category'] | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({ 
    category: 'key_point' as SmartNote['category'], 
    content: '' 
  });

  const filteredNotes = filter === 'all' 
    ? smartNotes 
    : smartNotes.filter(note => note.category === filter);

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

  const handleAddNote = () => {
    if (newNote.content.trim()) {
      const note: SmartNote = {
        id: `manual-${Date.now()}`,
        category: newNote.category,
        content: newNote.content.trim(),
        importance: 'medium',
        timestamp: new Date().toISOString()
      };
      addSmartNote(note);
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
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Notes'}
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              title="Add Note"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              filter === 'all' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
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
              className="border border-primary rounded-xl p-4 space-y-3"
            >
              <div className="flex gap-2">
                <select
                  value={newNote.category}
                  onChange={(e) => setNewNote({ ...newNote, category: e.target.value as SmartNote['category'] })}
                  className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
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
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewNote({ category: 'key_point', content: '' });
                  }}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.content.trim()}
                  className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
              const config = categoryConfig[note.category];
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-xl p-4 ${config.bgColor} border border-current/10`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${config.color}`}>
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
                                className="p-1 hover:bg-white/20 dark:hover:bg-black/20 rounded transition-colors"
                              >
                                <PencilIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => deleteSmartNote(note.id)}
                                className="p-1 hover:bg-white/20 dark:hover:bg-black/20 rounded transition-colors"
                              >
                                <TrashIcon className="w-3.5 h-3.5 text-muted-foreground" />
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
                            className="w-full px-2 py-1 bg-white/50 dark:bg-black/20 border border-current/20 rounded text-sm resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditText('');
                              }}
                              className="p-1 hover:bg-white/20 dark:hover:bg-black/20 rounded transition-colors"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground/80">
                          {note.content}
                        </p>
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