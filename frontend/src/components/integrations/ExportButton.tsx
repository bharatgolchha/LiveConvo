'use client';

import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExportModal } from './ExportModal';
import { getExportService } from '@/lib/integrations/export-service';
import { MeetingReport } from '@/app/report/[id]/page';
import { EnhancedSummary } from '@/types/api';

interface ExportButtonProps {
  report: MeetingReport;
  summary?: EnhancedSummary;
  sessionId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExportButton({
  report,
  summary,
  sessionId,
  variant = 'outline',
  size = 'sm',
  className = ''
}: ExportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const exportService = getExportService();
      await exportService.loadUserIntegrations(''); // Will get user ID from auth
      const active = exportService.getActiveIntegrations();
      setActiveIntegrations(active);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  const handleExport = () => {
    if (activeIntegrations.length === 0) {
      // If no integrations, open modal to set them up
      setShowModal(true);
    } else {
      // If integrations exist, open export modal
      setShowModal(true);
    }
  };

  const getButtonIcon = () => {
    switch (exportStatus) {
      case 'exporting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Share2 className="h-4 w-4" />;
    }
  };

  const getButtonText = () => {
    switch (exportStatus) {
      case 'exporting':
        return 'Exporting...';
      case 'success':
        return 'Exported!';
      case 'error':
        return 'Export Failed';
      default:
        return activeIntegrations.length > 0 ? 'Export' : 'Set up Export';
    }
  };

  // Reset status after showing success/error
  useEffect(() => {
    if (exportStatus === 'success' || exportStatus === 'error') {
      const timer = setTimeout(() => {
        setExportStatus('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportStatus]);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleExport}
        disabled={loading || exportStatus === 'exporting'}
        className={className}
      >
        {getButtonIcon()}
        <span className="ml-2">{getButtonText()}</span>
      </Button>

      {showModal && (
        <ExportModal
          report={report}
          summary={summary}
          sessionId={sessionId}
          onClose={() => setShowModal(false)}
          onExportStart={() => setExportStatus('exporting')}
          onExportComplete={(success) => {
            setExportStatus(success ? 'success' : 'error');
            setShowModal(false);
          }}
          activeIntegrations={activeIntegrations}
          onIntegrationsUpdate={loadIntegrations}
        />
      )}
    </>
  );
}