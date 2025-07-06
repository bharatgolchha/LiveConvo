import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  ChevronDown,
  FileText,
  File,
  CheckCircle
} from 'lucide-react';
import { exportReportToPDF, exportReportToDocx } from '@/lib/services/export';

interface ReportExportMenuProps {
  report: any; // Full report object from report page
  className?: string;
  disabled?: boolean;
}

export function ReportExportMenu({ report, className = '', disabled = false }: ReportExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const exportOptions = [
    {
      format: 'pdf',
      label: 'PDF Document',
      description: 'Comprehensive report with full formatting',
      icon: FileText,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      action: () => exportReportToPDF({ report })
    },
    {
      format: 'docx',
      label: 'Word Document',
      description: 'Editable report in .docx format',
      icon: File,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      action: () => exportReportToDocx({ report })
    }
  ];

  const handleExport = async (option: typeof exportOptions[0]) => {
    setIsOpen(false);
    setIsExporting(true);
    setExportProgress(`Generating ${option.label}...`);
    
    try {
      await option.action();
      setExportProgress(`${option.label} downloaded successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setExportProgress(null);
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('Export failed. Please try again.');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setExportProgress(null);
      }, 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = disabled || !report || isExporting;

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
        className="inline-flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/50 text-foreground border border-border rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        title={isDisabled ? 'No report available to export' : 'Export report'}
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
            <span className="hidden sm:inline">Exporting...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

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
            className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-[9999] overflow-hidden"
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground mb-1">Export Report</h3>
              <p className="text-sm text-muted-foreground">
                Download the complete meeting report
              </p>
            </div>
            
            <div className="p-2">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option)}
                    disabled={isExporting}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                      {isExporting && <div className="w-3 h-3 border border-muted-foreground/20 border-t-primary rounded-full animate-spin" />}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Includes all sections, insights, and analytics</span>
              </div>
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