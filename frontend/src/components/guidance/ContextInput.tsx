import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, FileText, Type } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ContextItem {
  id: string;
  text: string;
  timestamp: Date;
}

interface ContextInputProps {
  onAddContext: (text: string) => void;
  onRemoveContext?: (id: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export const ContextInput: React.FC<ContextInputProps> = ({
  onAddContext,
  onRemoveContext,
  placeholder = "Add context about the conversation, participants, or objectives...",
  maxLength = 500
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextText, setContextText] = useState('');
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);

  const handleAddContext = () => {
    if (contextText.trim().length === 0) return;

    const newItem: ContextItem = {
      id: Math.random().toString(36).substring(7),
      text: contextText.trim(),
      timestamp: new Date()
    };

    setContextItems(prev => [...prev, newItem]);
    onAddContext(contextText.trim());
    setContextText('');
    setIsExpanded(false);
  };

  const handleRemoveContext = (id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id));
    onRemoveContext?.(id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddContext();
    }
  };

  return (
    <div className="space-y-3">
      {/* Add Context Button/Input */}
      {!isExpanded ? (
        <Button
          variant="outline"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsExpanded(true)}
          className="w-full justify-start text-gray-600"
        >
          Add Text Context
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          <div className="relative">
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              autoFocus
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {contextText.length}/{maxLength}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddContext}
              disabled={contextText.trim().length === 0}
            >
              Add Context
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsExpanded(false);
                setContextText('');
              }}
            >
              Cancel
            </Button>
            <span className="text-xs text-gray-500 ml-auto">
              Cmd/Ctrl + Enter to add
            </span>
          </div>
        </motion.div>
      )}

      {/* Context Items List */}
      {contextItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Type className="w-4 h-4" />
            <span>Added Context ({contextItems.length})</span>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {contextItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="group"
              >
                <Card className="bg-blue-50 border-blue-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {item.text}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Added {item.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveContext(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 