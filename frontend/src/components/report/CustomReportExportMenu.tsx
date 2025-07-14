import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  File,
  FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { 
  exportCustomReportToPDF, 
  exportCustomReportToDocx, 
  exportCustomReportToMarkdown 
} from '@/lib/services/export';

interface CustomReport {
  id: string;
  prompt: string;
  template_id?: string;
  generated_content?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface CustomReportExportMenuProps {
  report: CustomReport;
  sessionTitle?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomReportExportMenu({ 
  report, 
  sessionTitle,
  className = '', 
  disabled = false 
}: CustomReportExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const exportOptions = [
    {
      format: 'pdf',
      label: 'PDF Document',
      description: 'Formatted report with styling',
      icon: FileText,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      action: () => exportCustomReportToPDF({ report, sessionTitle })
    },
    {
      format: 'docx',
      label: 'Word Document',
      description: 'Editable .docx format',
      icon: File,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      action: () => exportCustomReportToDocx({ report, sessionTitle })
    },
    {
      format: 'md',
      label: 'Markdown',
      description: 'Plain text with formatting',
      icon: FileCode,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      action: () => exportCustomReportToMarkdown({ report })
    }
  ];

  const handleExport = async (option: typeof exportOptions[0]) => {
    setIsOpen(false);
    setIsExporting(true);
    setExportProgress(`Generating ${option.label}...`);
    
    try {
      await option.action();
      setExportProgress(`${option.label} downloaded successfully!`);
      
      setTimeout(() => {
        setExportProgress(null);
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('Export failed. Please try again.');
      
      setTimeout(() => {
        setExportProgress(null);
      }, 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = disabled || !report || isExporting;

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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        title={isDisabled ? 'No report available to export' : 'Export report'}
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 mr-2 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export
          </>
        )}
      </Button>

      {/* Export Progress */}
      {exportProgress && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground whitespace-nowrap z-[9999] shadow-lg">
          {exportProgress}
        </div>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-[9999] overflow-hidden"
          >
            <div className="p-3 border-b border-border">
              <h3 className="font-medium text-sm text-foreground">Export Format</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose download format
              </p>
            </div>
            
            <div className="p-1.5">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option)}
                    disabled={isExporting}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isExporting ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${option.bgColor}`}>
                      <Icon className={`w-4 h-4 ${option.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm text-foreground">
                        {option.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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