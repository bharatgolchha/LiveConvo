import React from 'react';
import { motion } from 'framer-motion';
import { LinkIcon } from '@heroicons/react/24/outline';

interface ThreadIndicatorProps {
  threadPosition: number;
  threadSize: number;
  isExpanded?: boolean;
  onClick?: () => void;
}

export const ThreadIndicator: React.FC<ThreadIndicatorProps> = ({
  threadPosition,
  threadSize,
  isExpanded = false,
  onClick
}) => {
  if (threadSize <= 1) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 text-primary dark:text-primary-light rounded-lg text-xs font-medium transition-all duration-200 hover:from-primary/20 hover:to-primary/10 dark:hover:from-primary/30 dark:hover:to-primary/20 border border-primary/20 dark:border-primary/30 shadow-sm"
    >
      <div className="w-3 h-3 rounded-full bg-primary/30 dark:bg-primary/40 flex items-center justify-center">
        <LinkIcon className="w-2 h-2" />
      </div>
      <span className="font-semibold">
        {threadPosition} of {threadSize}
      </span>
      {onClick && (
        <motion.svg
          className="w-3.5 h-3.5 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </motion.svg>
      )}
    </motion.button>
  );
};