import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, FileText, Image, X, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
}

interface FileUploadProps {
  onFileUpload?: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  maxFiles = 5,
  maxSizeMB = 25,
  acceptedTypes = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg']
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file type
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(extension)) {
        return false;
      }
      
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        return false;
      }
      
      return true;
    });

    // Check total file count
    if (uploadedFiles.length + validFiles.length > maxFiles) {
      validFiles.splice(maxFiles - uploadedFiles.length);
    }

    // Add files to upload queue
    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload process
    newFiles.forEach(file => {
      simulateUpload(file.id);
    });

    onFileUpload?.(validFiles);
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.id === fileId 
            ? { 
                ...file, 
                progress: Math.min(progress, 100),
                status: progress >= 100 ? 'processing' : 'uploading'
              }
            : file
        )
      );

      if (progress >= 100) {
        clearInterval(interval);
        
        // Simulate processing
        setTimeout(() => {
          setUploadedFiles(prev => 
            prev.map(file => 
              file.id === fileId 
                ? { ...file, status: 'complete', progress: 100 }
                : file
            )
          );
        }, 1500);
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
      return <Image className="w-5 h-5 text-blue-500" alt="Image file" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (['docx', 'doc'].includes(extension || '')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
        />
        
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Context Files
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500">
          Supports: {acceptedTypes.join(', ')} • Max {maxSizeMB}MB per file • Up to {maxFiles} files
        </p>
        
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          Choose Files
        </Button>
      </motion.div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h4 className="font-medium text-gray-900 text-sm">
              Uploaded Files ({uploadedFiles.length}/{maxFiles})
            </h4>
            
            {uploadedFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
              >
                {getFileIcon(file.name)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {/* Progress bar */}
                  {file.status !== 'complete' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <motion.div
                        className={`h-1.5 rounded-full ${
                          file.status === 'processing' 
                            ? 'bg-yellow-500' 
                            : 'bg-blue-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Status */}
                <div className="flex items-center gap-2">
                  {file.status === 'complete' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {file.status === 'processing' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500" />
                  )}
                  {file.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 