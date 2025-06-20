import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

export function ContextPanel() {
  const { meeting } = useMeetingContext();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!meeting?.context) return null;

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Meeting Context</span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {meeting.context}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}