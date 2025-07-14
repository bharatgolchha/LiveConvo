import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  ChevronDown,
  FileText,
  File,
  CheckCircle,
  Share2,
  ArrowRight
} from 'lucide-react';
import { exportReportToPDF, exportReportToDocx } from '@/lib/services/export';
import { ExportModal } from '@/components/integrations/ExportModal';
import { getExportService } from '@/lib/integrations/export-service';
import { useParams } from 'next/navigation';

interface ReportExportMenuProps {
  report: any; // Full report object from report page
  className?: string;
  disabled?: boolean;
}

export function ReportExportMenu({ report, className = '', disabled = false }: ReportExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const params = useParams();

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const exportService = getExportService();
      await exportService.loadUserIntegrations('');
      const active = exportService.getActiveIntegrations();
      setActiveIntegrations(active);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

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
        className="h-8 inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted/50 text-foreground border border-border rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={isDisabled ? 'No report available to export' : 'Export report'}
      >
        {isExporting ? (
          <>
            <div className="w-3 h-3 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download className="w-3 h-3 mr-1.5" />
            <span>Export</span>
            <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
              
              {/* Divider */}
              <div className="my-2 border-t border-border" />
              
              {/* Integration Export Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowIntegrations(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <Share2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-foreground">
                    Export to Integrations
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Slack, HubSpot, Salesforce & more
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
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
      
      {/* Integration Export Modal */}
      {showIntegrations && (
        <ExportModal
          report={report}
          summary={report.summary}
          sessionId={params.id as string}
          onClose={() => setShowIntegrations(false)}
          onExportStart={() => {
            setIsExporting(true);
            setExportProgress('Exporting to integrations...');
          }}
          onExportComplete={(success) => {
            setIsExporting(false);
            setExportProgress(success ? 'Export successful!' : 'Export failed');
            setTimeout(() => {
              setExportProgress(null);
              setShowIntegrations(false);
            }, 3000);
          }}
          activeIntegrations={activeIntegrations}
          onIntegrationsUpdate={loadIntegrations}
        />
      )}
    </div>
  );
}