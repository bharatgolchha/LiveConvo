import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import useSystemSettings from '@/lib/hooks/useSystemSettings';
import { adminFetch } from '@/lib/adminApi';
import { AI_ACTIONS, AIAction } from '@/lib/aiModelConfig';

export default function SystemSettingsCard() {
  const { settings, loading, error, refresh } = useSystemSettings();
  const [modelConfigs, setModelConfigs] = useState<Record<string, string>>({});
  const [streamingProvider, setStreamingProvider] = useState<string>('assembly_ai');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Initialize model configs from settings
  useEffect(() => {
    if (settings) {
      const configs: Record<string, string> = {
        default_ai_model: settings.default_ai_model || 'google/gemini-2.5-flash'
      };
      
      // Load action-specific models
      AI_ACTIONS.forEach(action => {
        const key = `ai_model_${action.key}`;
        configs[key] = settings[key] || '';
      });
      
      setModelConfigs(configs);
      
      // Load streaming provider
      setStreamingProvider(settings.streaming_provider || 'assembly_ai');
    }
  }, [settings]);

  if (loading) return null;
  if (error) {
    return <Card className="p-6 text-red-600">Failed to load system settings</Card>;
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMsg(null);
      
      // Save all model configurations
      const promises = Object.entries(modelConfigs).map(([key, value]) =>
        adminFetch(`/api/admin/system-settings/${key}`, {
          method: 'PATCH',
          body: JSON.stringify({ value: value }),
        })
      );
      
      // Save streaming provider
      promises.push(
        adminFetch(`/api/admin/system-settings/streaming_provider`, {
          method: 'PATCH',
          body: JSON.stringify({ value: streamingProvider }),
        })
      );
      
      await Promise.all(promises);
      await refresh();
      setSaveMsg('All settings saved!');
    } catch (e) {
      setSaveMsg('Error saving settings');
      console.error(e);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const updateModelConfig = (key: string, value: string) => {
    setModelConfigs(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-4">
      {/* Default Model Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          AI Model Configuration
        </h3>
        
        <div className="space-y-6">
          {/* Default Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default AI Model
              <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                Used as fallback when action-specific models are not configured
              </span>
            </label>
            <input
              type="text"
              value={modelConfigs.default_ai_model || ''}
              onChange={(e) => updateModelConfig('default_ai_model', e.target.value)}
              placeholder="e.g., google/gemini-2.5-flash"
              className="w-full border border-border rounded-md p-2 bg-muted text-foreground"
            />
          </div>

          {/* Action-Specific Models */}
          <div>
            <div
              className="flex items-center justify-between cursor-pointer py-2"
              onClick={() => toggleSection('actions')}
            >
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Action-Specific Models
              </h4>
              <span className="text-gray-500">
                {expandedSection === 'actions' ? '▼' : '▶'}
              </span>
            </div>
            
            {expandedSection === 'actions' && (
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                {AI_ACTIONS.map((action) => {
                  const key = `ai_model_${action.key}`;
                  return (
                    <div key={action.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {action.displayName}
                        <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                          {action.description}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={modelConfigs[key] || ''}
                        onChange={(e) => updateModelConfig(key, e.target.value)}
                        placeholder="Leave empty to use default model"
                        className="w-full border border-border rounded-md p-2 bg-muted text-foreground text-sm"
                      />
                      {action.recommendedModels.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Recommended: {action.recommendedModels.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Help */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter any OpenRouter model ID. Visit{' '}
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                OpenRouter Models
              </a>
              {' '}for available options.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-app-primary text-white rounded-md disabled:opacity-50 hover:bg-app-primary/90 transition-colors"
          >
            {saving ? 'Saving…' : 'Save All Settings'}
          </button>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </Card>

      {/* Streaming Provider Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Real-time Transcription Provider
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Streaming Provider
              <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-1">
                Select the provider for real-time transcription via Recall.ai
              </span>
            </label>
            <select
              value={streamingProvider}
              onChange={(e) => setStreamingProvider(e.target.value)}
              className="w-full border border-border rounded-md p-2 bg-muted text-foreground"
            >
              <option value="deepgram">Deepgram</option>
              <option value="assembly_ai">AssemblyAI</option>
              <option value="speechmatics">Speechmatics</option>
              <option value="aws_transcribe">AWS Transcribe</option>
            </select>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Deepgram:</strong> Fast, accurate, and cost-effective. Nova-3 model with multilingual code-switching.<br/>
              <strong>AssemblyAI:</strong> High accuracy with advanced features like speaker labels (single language only).<br/>
              <strong>Speechmatics:</strong> Excellent multilingual support.<br/>
              <strong>AWS Transcribe:</strong> Advanced language detection (requires AWS credentials configuration).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
} 