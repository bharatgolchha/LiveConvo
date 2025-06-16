import { useCallback } from 'react';
import type { SessionDocument } from '@/lib/hooks/useSessionData';

interface UseFileUploadsProps {
  conversationId: string | null;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
  uploadDocuments: (sessionId: string, files: File[]) => Promise<SessionDocument[]>;
  addContext: (data: { id: string; name: string; type: 'txt' | 'pdf' | 'docx'; content: string; uploadedAt: Date }) => void;
  addUserContext: (text: string) => void;
  textContext: string;
  generateUniqueId?: () => string;
}

/**
 * Encapsulates file-upload flow: local state update, optional backend upload, and
 * feeding extracted (or raw) text into AI context.
 */
export function useFileUploads({
  conversationId,
  uploadedFiles,
  setUploadedFiles,
  uploadDocuments,
  addContext,
  addUserContext,
  textContext,
  generateUniqueId: genId,
}: UseFileUploadsProps) {
  // Fallback ID generator if caller doesn't supply one
  const generateId = genId || (() => `${Date.now()}-${Math.random().toString(36).slice(2,9)}`);

  const handleFileUpload = useCallback(
    async (newFiles: File[]) => {
      // Immediate UI feedback
      setUploadedFiles([...uploadedFiles, ...newFiles]);

      const ingestFileText = async (file: File) => {
        try {
          const fileContent = await file.text();
          addContext({
            id: generateId(),
            name: file.name,
            type: file.type.startsWith('text') ? 'txt' : file.type.includes('pdf') ? 'pdf' : 'docx',
            content: fileContent,
            uploadedAt: new Date(),
          });
        } catch (err) {
          console.error('Error reading file for AI context:', err);
        }
      };

      if (conversationId) {
        try {
          const uploadedDocs = await uploadDocuments(conversationId, newFiles);
          if (uploadedDocs?.length) {
            uploadedDocs.forEach((doc) => {
              if (doc.extracted_text) {
                addContext({
                  id: doc.id,
                  name: doc.original_filename,
                  type: doc.file_type as 'txt' | 'pdf' | 'docx',
                  content: doc.extracted_text,
                  uploadedAt: new Date(doc.created_at || new Date()),
                });
              }
            });
          }
        } catch (err) {
          console.error('Failed to upload documents, falling back to local read:', err);
          newFiles.forEach(ingestFileText);
        }
      } else {
        // No session yet – just read locally
        newFiles.forEach(ingestFileText);
      }

      if (textContext) {
        addUserContext(textContext);
      }
    },
    [uploadedFiles, setUploadedFiles, conversationId, uploadDocuments, addContext, addUserContext, textContext, generateId]
  );

  const handleRemoveFile = useCallback(
    (fileName: string) => {
      setUploadedFiles(uploadedFiles.filter((f) => f.name !== fileName));
    },
    [uploadedFiles, setUploadedFiles]
  );

  return { handleFileUpload, handleRemoveFile } as const;
} 