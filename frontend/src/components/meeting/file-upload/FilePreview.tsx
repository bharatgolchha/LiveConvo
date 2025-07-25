import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  DocumentIcon,
  PhotoIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
  progress?: number;
}

interface FilePreviewProps {
  files: FileAttachment[];
  onRemove: (id: string) => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) {
    return <PhotoIcon className="w-5 h-5" />;
  }
  return <DocumentIcon className="w-5 h-5" />;
}

function SingleFilePreview({ 
  file, 
  onRemove 
}: { 
  file: FileAttachment; 
  onRemove: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  
  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative group flex items-center gap-3 p-3
        bg-card border rounded-lg transition-all
        ${file.status === 'error' ? 'border-destructive/50 bg-destructive/5' : 'border-border hover:border-border/80'}
        ${file.status === 'uploading' ? 'animate-pulse' : ''}
      `}
    >
      {/* Preview/Icon */}
      <div className="flex-shrink-0">
        {isImage && file.preview && !imageError ? (
          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
            <img 
              src={file.preview} 
              alt={file.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className={`
            w-12 h-12 rounded-md flex items-center justify-center
            ${isPDF ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'}
          `}>
            <FileIcon type={file.type} />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {file.name}
          </p>
          {file.status === 'uploaded' && (
            <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
          )}
          {file.status === 'error' && (
            <ExclamationTriangleIcon className="w-4 h-4 text-destructive flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">
            {file.type.split('/')[1].toUpperCase()}
          </span>
          {file.status === 'uploading' && file.progress !== undefined && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-primary font-medium">
                {Math.round(file.progress)}%
              </span>
            </>
          )}
        </div>
        {file.error && (
          <p className="text-xs text-destructive mt-1">{file.error}</p>
        )}
      </div>

      {/* Progress Bar */}
      {file.status === 'uploading' && file.progress !== undefined && (
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden rounded-b-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${file.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        disabled={file.status === 'uploading'}
        className={`
          flex-shrink-0 p-1.5 rounded-md transition-all
          opacity-0 group-hover:opacity-100
          hover:bg-muted text-muted-foreground hover:text-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Remove file"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function FilePreview({ files, onRemove, className = '' }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {files.map(file => (
          <SingleFilePreview
            key={file.id}
            file={file}
            onRemove={() => onRemove(file.id)}
          />
        ))}
      </AnimatePresence>
      
      {files.length > 1 && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground text-center"
        >
          {files.length} files attached
        </motion.p>
      )}
    </div>
  );
}