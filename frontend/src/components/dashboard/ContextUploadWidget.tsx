import React, { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface Props {
  onContextUpdate: (context: { text: string; files: File[] }) => void;
  initialText?: string;
  initialFiles?: File[];
  compact?: boolean;
}

const ContextUploadWidget: React.FC<Props> = ({
  onContextUpdate,
  initialText = '',
  initialFiles = [],
  compact = false,
}) => {
  const [textContext, setTextContext] = useState(initialText);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>(initialFiles);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles((prev) => {
        const merged = [...prev, ...newFiles];
        onContextUpdate({ text: textContext, files: merged });
        return merged;
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onContextUpdate({ text: textContext, files: updated });
      return updated;
    });
  };

  const handleTextChange = (text: string) => {
    setTextContext(text);
    onContextUpdate({ text, files: uploadedFiles });
  };

  return (
    <div className="space-y-4">
      {/* Text Context */}
      <textarea
        placeholder="Add any relevant text context..."
        value={textContext}
        onChange={(e) => handleTextChange(e.target.value)}
        rows={compact ? 3 : 6}
        className="w-full bg-muted text-foreground border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-app-primary"
      />

      {/* File Upload */}
      <div
        className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragOver ? 'border-primary bg-primary/10' : 'border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <p className="text-sm text-muted-foreground">Drag & drop files here or click to upload</p>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <li
              key={index}
              className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
            >
              <span className="truncate max-w-xs text-sm">{file.name}</span>
              <button onClick={() => removeFile(index)}>
                <TrashIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContextUploadWidget; 