import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploadButton } from './FileUploadButton';
import { FilePreview, FileAttachment } from './FilePreview';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface FileManagerProps {
  onFilesChange: (files: FileAttachment[]) => void;
  maxFiles?: number;
  className?: string;
}

export function FileManager({ 
  onFilesChange, 
  maxFiles = 5,
  className = '' 
}: FileManagerProps) {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File): Promise<FileAttachment> => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fileAttachment: FileAttachment = {
      id,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
      progress: 0
    };

    // Create preview for images
    if (file.type.startsWith('image/')) {
      try {
        const preview = await createImagePreview(file);
        fileAttachment.preview = preview;
      } catch (error) {
        console.error('Failed to create image preview:', error);
      }
    }

    // Convert to base64 data URL
    try {
      const dataUrl = await fileToDataUrl(file);
      fileAttachment.dataUrl = dataUrl;
      fileAttachment.status = 'uploaded';
      fileAttachment.progress = 100;
    } catch (error) {
      fileAttachment.status = 'error';
      fileAttachment.error = 'Failed to process file';
      console.error('Failed to process file:', error);
    }

    return fileAttachment;
  };

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate thumbnail size (max 100x100)
          const maxSize = 100;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL(file.type));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = useCallback(async (newFiles: File[]) => {
    if (files.length + newFiles.length > maxFiles) {
      const remaining = maxFiles - files.length;
      newFiles = newFiles.slice(0, Math.max(0, remaining));
    }

    if (newFiles.length === 0) return;

    setIsProcessing(true);
    
    try {
      // Process files with progress updates
      const processedFiles = await Promise.all(
        newFiles.map(async (file) => {
          const attachment = await processFile(file);
          
          // Update progress periodically during processing
          setFiles(prev => {
            const existing = prev.find(f => f.id === attachment.id);
            if (existing) {
              return prev.map(f => f.id === attachment.id ? attachment : f);
            }
            return [...prev, attachment];
          });
          
          return attachment;
        })
      );

      setFiles(prev => {
        const newFileList = [...prev];
        processedFiles.forEach(processed => {
          const index = newFileList.findIndex(f => f.id === processed.id);
          if (index >= 0) {
            newFileList[index] = processed;
          } else {
            newFileList.push(processed);
          }
        });
        return newFileList;
      });

      // Notify parent
      onFilesChange([...files, ...processedFiles]);
    } finally {
      setIsProcessing(false);
    }
  }, [files, maxFiles, onFilesChange]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      onFilesChange(updated);
      return updated;
    });
  }, [onFilesChange]);

  const hasFiles = files.length > 0;
  const canAddMore = files.length < maxFiles;

  return (
    <div className={`${className}`}>
      <AnimatePresence mode="wait">
        {!hasFiles ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <FileUploadButton
              onFileSelect={handleFileSelect}
              isUploading={isProcessing}
              maxFiles={maxFiles - files.length}
              className="w-full"
            />
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"
            >
              <SparklesIcon className="w-3 h-3" />
              <span>Nova can analyze images and PDFs to provide context-aware assistance</span>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="with-files"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <FilePreview 
              files={files} 
              onRemove={handleRemoveFile}
            />
            
            {canAddMore && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.1 }}
              >
                <FileUploadButton
                  onFileSelect={handleFileSelect}
                  isUploading={isProcessing}
                  maxFiles={maxFiles - files.length}
                  className="w-full opacity-70 hover:opacity-100"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}