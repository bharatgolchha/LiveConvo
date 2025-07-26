import React, { useRef } from 'react';
import { PaperClipIcon } from '@heroicons/react/24/outline';
import { FileAttachment } from './FilePreview';

interface MinimalFileInputProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

export function MinimalFileInput({ 
  onFileSelect, 
  disabled = false,
  maxFiles = 3,
  className = '' 
}: MinimalFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Validate files
      const validFiles = files.filter(file => {
        // Check file type
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        
        if (!isImage && !isPDF) {
          console.warn(`File ${file.name} is not a supported type`);
          return false;
        }
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          console.warn(`File ${file.name} is too large (max 5MB)`);
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length > 0) {
        onFileSelect(validFiles.slice(0, maxFiles));
      }
      
      // Reset input to allow selecting the same file again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
        title="Attach files (PDF or images)"
      >
        <PaperClipIcon className="w-4 h-4" />
      </button>
    </>
  );
}