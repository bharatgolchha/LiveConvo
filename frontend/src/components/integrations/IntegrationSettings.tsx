'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getExportService, AVAILABLE_PROVIDERS } from '@/lib/integrations/export-service';
import { IntegrationConfig, IntegrationProvider } from '@/lib/integrations/types';
import { useAuth } from '@/contexts/AuthContext';

interface IntegrationSettingsProps {
  onClose: () => void;
  onBack?: () => void;
  onSave?: () => void;
}

export function IntegrationSettings({
  onClose,
  onBack,
  onSave
}: IntegrationSettingsProps) {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [testingConfig, setTestingConfig] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const exportService = getExportService();
      const configs = await exportService.loadUserIntegrations(user?.id || '', user?.current_organization_id);
      setIntegrations(configs);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
    setConfigValues({});
    setShowPassword({});
  };

  const handleConfigChange = (fieldName: string, value: any) => {
    setConfigValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedProvider || !user) return;

    // Validate required fields
    const missingFields = selectedProvider.configRequired
      .filter(field => field.required && !configValues[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setSaving(true);
      const exportService = getExportService();
      
      await exportService.saveIntegrationConfig({
        provider: selectedProvider.id,
        userId: user.id,
        organizationId: user.current_organization_id,
        config: configValues,
        isActive: true
      });

      await loadIntegrations();
      setSelectedProvider(null);
      setConfigValues({});
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
      alert('Failed to save integration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      const exportService = getExportService();
      await exportService.deleteIntegrationConfig(configId);
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to delete integration:', error);
      alert('Failed to delete integration. Please try again.');
    }
  };

  const handleTest = async (config: IntegrationConfig) => {
    setTestingConfig(config.id);
    try {
      const response = await fetch(`/api/integrations/${config.provider}/test?configId=${config.id}`);
      const result = await response.json();
      setTestResults(prev => ({
        ...prev,
        [config.id]: result.success
      }));
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults(prev => ({
        ...prev,
        [config.id]: false
      }));
    } finally {
      setTestingConfig(null);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold">
              {selectedProvider ? `Configure ${selectedProvider.name}` : 'Integration Settings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {!selectedProvider ? (
            <div className="space-y-6">
              {/* Current Integrations */}
              {integrations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Current Integrations
                  </h3>
                  <div className="space-y-2">
                    {integrations.map((config) => {
                      const provider = AVAILABLE_PROVIDERS.find(p => p.id === config.provider);
                      if (!provider) return null;

                      return (
                        <div
                          key={config.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">
                              {getProviderIcon(provider.id)}
                            </span>
                            <div>
                              <div className="font-medium">{provider.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {config.isActive ? 'Active' : 'Inactive'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {testingConfig === config.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : testResults[config.id] !== undefined ? (
                              testResults[config.id] ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTest(config)}
                              disabled={testingConfig === config.id}
                            >
                              Test
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Integration */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Add New Integration
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {AVAILABLE_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderSelect(provider)}
                      className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors"
                    >
                      <span className="text-2xl mr-3">
                        {getProviderIcon(provider.id)}
                      </span>
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {provider.description}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 ml-auto text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">{selectedProvider.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedProvider.description}
                </p>
              </div>

              {selectedProvider.configRequired.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={configValues[field.name] || ''}
                      onChange={(e) => handleConfigChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'password' ? (
                    <div className="relative">
                      <input
                        type={showPassword[field.name] ? 'text' : 'password'}
                        value={configValues[field.name] || ''}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => ({
                          ...prev,
                          [field.name]: !prev[field.name]
                        }))}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword[field.name] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      value={configValues[field.name] || ''}
                      onChange={(e) => handleConfigChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  )}
                  {field.helpText && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {field.helpText}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedProvider(null);
                    setConfigValues({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Integration'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}