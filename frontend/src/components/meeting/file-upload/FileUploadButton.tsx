import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperClipIcon, 
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface FileUploadButtonProps {
  onFileSelect: (files: File[]) => void;
  isUploading?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

const FILE_SIZE_LIMITS = {
  'image': 20, // MB
  'application/pdf': 50 // MB
};

export function FileUploadButton({
  onFileSelect,
  isUploading = false,
  maxFiles = 5,
  maxSizeMB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className = ''
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: `File type not supported. Accepted types: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}` 
      };
    }

    // Check file size
    const fileCategory = file.type.split('/')[0];
    const maxSize = maxSizeMB || FILE_SIZE_LIMITS[fileCategory] || FILE_SIZE_LIMITS['application/pdf'];
    const maxSizeBytes = maxSize * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return { 
        valid: false, 
        error: `File too large. Maximum size: ${maxSize}MB` 
      };
    }

    return { valid: true };
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, maxFiles);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileSelection(files);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelection(e.target.files)}
        className="hidden"
      />

      <motion.button
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isUploading}
        className={`
          relative group flex items-center gap-2 px-3 py-2
          bg-muted/50 hover:bg-muted border border-border 
          rounded-lg transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isDragging ? 'ring-2 ring-primary bg-primary/10' : ''}
          ${className}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ 
                rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                opacity: { duration: 0.2 }
              }}
            >
              <ArrowUpTrayIcon className="w-4 h-4 text-primary" />
            </motion.div>
          ) : isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <ArrowUpTrayIcon className="w-4 h-4 text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PaperClipIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            </motion.div>
          )}
        </AnimatePresence>

        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
          {isUploading ? 'Uploading...' : isDragging ? 'Drop files here' : 'Attach files'}
        </span>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 border-2 border-dashed border-primary"
            >
              <div className="flex flex-col items-center gap-2">
                <ArrowUpTrayIcon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium text-primary">Drop files here</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}