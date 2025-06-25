import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  CodeBracketIcon,
  ShareIcon,
  CloudArrowUpIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useExportSummary, ExportFormat } from '@/lib/meeting/hooks/useExportSummary';
// import { NotionAuthModal } from './NotionAuthModal';

interface ExportMenuProps {
  className?: string;
  disabled?: boolean;
}

export function ExportMenu({ className = '', disabled = false }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotionModal, setShowNotionModal] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { exportSummary, isExporting, exportProgress, canExport } = useExportSummary();



  const exportOptions = [
    {
      format: 'pdf' as ExportFormat,
      label: 'PDF Document',
      description: 'Formatted PDF with branding',
      icon: DocumentIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20'
    },
    {
      format: 'docx' as ExportFormat,
      label: 'Word Document',
      description: 'Editable .docx file',
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      format: 'markdown' as ExportFormat,
      label: 'Markdown',
      description: 'Formatted .md file',
      icon: CodeBracketIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    {
      format: 'text' as ExportFormat,
      label: 'Plain Text',
      description: 'Simple .txt file',
      icon: DocumentTextIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20'
    },
    {
      format: 'json' as ExportFormat,
      label: 'JSON Data',
      description: 'Structured data format',
      icon: CodeBracketIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      format: 'notion' as ExportFormat,
      label: 'Send to Notion',
      description: 'Create Notion page',
      icon: CloudArrowUpIcon,
      color: 'text-gray-800',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20'
    },
    {
      format: 'email' as ExportFormat,
      label: 'Email Summary',
      description: 'Open in email client',
      icon: EnvelopeIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20'
    }
  ];

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    
    if (format === 'notion') {
      // TODO: Re-enable when NotionAuthModal import is fixed
      alert('Notion export coming soon! Please use other formats for now.');
      return;
    }
    
    await exportSummary({ format });
  };

  const handleNotionExport = async (notionToken: string, databaseId?: string) => {
    setShowNotionModal(false);
    await exportSummary({ 
      format: 'notion', 
      notionToken, 
      notionDatabaseId: databaseId 
    });
  };

  const isDisabled = disabled || !canExport || isExporting;



  // Close dropdown on escape key and window resize
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        title={isDisabled ? 'No summary available to export' : 'Export summary'}
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="hidden sm:inline">Exporting...</span>
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Export Progress */}
      {isExporting && exportProgress && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground whitespace-nowrap z-[9999]">
          {exportProgress}
        </div>
      )}

      {/* Dropdown Menu - Simple Test Version */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-[9999] overflow-hidden"
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground mb-1">Export Summary</h3>
              <p className="text-sm text-muted-foreground">
                Choose your preferred format for the meeting summary
              </p>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option.format)}
                    disabled={isExporting}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isExporting ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${option.bgColor}`}>
                      <Icon className={`w-5 h-5 ${option.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground">
                        {option.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                    <div className="w-5 h-5 flex items-center justify-center">
                      {isExporting && <div className="w-3 h-3 border border-primary/20 border-t-primary rounded-full animate-spin" />}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span>All exports include complete summary with timestamps</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notion Auth Modal */}
      {/* <NotionAuthModal
        isOpen={showNotionModal}
        onClose={() => setShowNotionModal(false)}
        onExport={handleNotionExport}
      /> */}
      
      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 