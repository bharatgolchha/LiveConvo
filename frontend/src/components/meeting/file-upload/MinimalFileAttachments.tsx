import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { FileAttachment } from './FilePreview';

interface MinimalFileAttachmentsProps {
  files: FileAttachment[];
  onRemove: (id: string) => void;
}

export function MinimalFileAttachments({ files, onRemove }: MinimalFileAttachmentsProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <AnimatePresence mode="popLayout">
        {files.map((file) => (
          <motion.div
            key={file.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative group"
          >
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs">
              {file.type.startsWith('image/') ? (
                <PhotoIcon className="w-3 h-3 text-muted-foreground" />
              ) : (
                <DocumentIcon className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="max-w-[80px] truncate text-muted-foreground">
                {file.name}
              </span>
              <button
                onClick={() => onRemove(file.id)}
                className="ml-1 p-0.5 rounded hover:bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
            {file.status === 'error' && (
              <div className="absolute -bottom-5 left-0 text-xs text-destructive whitespace-nowrap">
                {file.error}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <span className="text-xs text-muted-foreground ml-1">
        ({files.length}/3)
      </span>
    </div>
  );
}