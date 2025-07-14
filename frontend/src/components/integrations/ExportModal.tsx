'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Settings,
  Plus,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getExportService, AVAILABLE_PROVIDERS } from '@/lib/integrations/export-service';
import { MeetingReport } from '@/app/report/[id]/page';
import { EnhancedSummary } from '@/types/api';
import { ExportOptions } from '@/lib/integrations/types';
import { IntegrationSettings } from './IntegrationSettings';
import Image from 'next/image';

interface ExportModalProps {
  report: MeetingReport;
  summary?: EnhancedSummary;
  sessionId: string;
  onClose: () => void;
  onExportStart: () => void;
  onExportComplete: (success: boolean) => void;
  activeIntegrations: any[];
  onIntegrationsUpdate: () => void;
}

interface ExportState {
  provider: string;
  status: 'pending' | 'exporting' | 'success' | 'error';
  message?: string;
  url?: string;
}

export function ExportModal({
  report,
  summary,
  sessionId,
  onClose,
  onExportStart,
  onExportComplete,
  activeIntegrations,
  onIntegrationsUpdate
}: ExportModalProps) {
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [exportStates, setExportStates] = useState<ExportState[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'full',
    includeTranscript: false,
    includeAnalytics: true,
    includeActionItems: true,
    includeDecisions: true,
    includeParticipants: true
  });

  const handleProviderToggle = (providerId: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerId) 
        ? prev.filter(p => p !== providerId)
        : [...prev, providerId]
    );
  };

  const handleExport = async () => {
    if (selectedProviders.length === 0) return;

    onExportStart();
    
    // Initialize export states
    const initialStates = selectedProviders.map(provider => ({
      provider,
      status: 'exporting' as const,
      message: 'Exporting...'
    }));
    setExportStates(initialStates);

    const exportService = getExportService();
    
    // Add report URL to metadata
    const enhancedOptions: ExportOptions = {
      ...exportOptions,
      metadata: {
        ...exportOptions.metadata,
        reportUrl: `${window.location.origin}/report/${sessionId}`
      }
    };

    // Export to each selected provider
    for (let i = 0; i < selectedProviders.length; i++) {
      const provider = selectedProviders[i];
      
      try {
        const result = await exportService.exportReport(
          report,
          summary,
          sessionId,
          provider,
          enhancedOptions
        );

        setExportStates(prev => prev.map((state, index) => 
          index === i 
            ? {
                ...state,
                status: result.success ? 'success' : 'error',
                message: result.success 
                  ? 'Export successful!' 
                  : result.error || 'Export failed',
                url: result.url
              }
            : state
        ));
      } catch (error: any) {
        setExportStates(prev => prev.map((state, index) => 
          index === i 
            ? {
                ...state,
                status: 'error',
                message: error.message || 'Export failed'
              }
            : state
        ));
      }
    }

    // Check if all exports completed
    const allCompleted = exportStates.every(state => 
      state.status === 'success' || state.status === 'error'
    );
    
    if (allCompleted) {
      const hasSuccess = exportStates.some(state => state.status === 'success');
      onExportComplete(hasSuccess);
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'slack':
        return '💬';
      case 'hubspot':
        return '🔧';
      case 'salesforce':
        return '☁️';
      default:
        return '📤';
    }
  };

  const getExportStateIcon = (status: string) => {
    switch (status) {
      case 'exporting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (showSettings) {
    return (
      <IntegrationSettings
        onClose={() => setShowSettings(false)}
        onBack={() => setShowSettings(false)}
        onSave={() => {
          onIntegrationsUpdate();
          setShowSettings(false);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Export Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Integration Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Integrations
            </h3>
            <div className="space-y-2">
              {activeIntegrations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No integrations configured yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </div>
              ) : (
                <>
                  {activeIntegrations.map((integration) => (
                    <label
                      key={integration.id}
                      className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(integration.provider.id)}
                        onChange={() => handleProviderToggle(integration.provider.id)}
                        className="mr-3"
                      />
                      <span className="text-2xl mr-3">
                        {getProviderIcon(integration.provider.id)}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{integration.provider.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {integration.provider.description}
                        </div>
                      </div>
                    </label>
                  ))}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-full p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Manage Integrations
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Export Options */}
          {selectedProviders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Export Options
              </h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeActionItems}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeActionItems: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include Action Items</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDecisions}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeDecisions: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include Decisions</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAnalytics}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeAnalytics: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include Analytics</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeParticipants}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeParticipants: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include Participants</span>
                </label>
              </div>
            </div>
          )}

          {/* Export Status */}
          {exportStates.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Export Status
              </h3>
              <div className="space-y-2">
                {exportStates.map((state, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-3">
                        {getProviderIcon(state.provider)}
                      </span>
                      <div>
                        <div className="font-medium">
                          {AVAILABLE_PROVIDERS.find(p => p.id === state.provider)?.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {state.message}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {getExportStateIcon(state.status)}
                      {state.url && (
                        <a
                          href={state.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedProviders.length === 0 || exportStates.some(s => s.status === 'exporting')}
          >
            {exportStates.some(s => s.status === 'exporting') ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              'Export'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}