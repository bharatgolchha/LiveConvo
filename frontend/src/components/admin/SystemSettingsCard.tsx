import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import useSystemSettings from '@/lib/hooks/useSystemSettings';
import { adminFetch } from '@/lib/adminApi';

const AVAILABLE_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-1.5-flash',
  'google/gemini-pro',
  'gpt-4o-mini-transcribe',
  'openai/gpt-4o-mini',
];

export default function SystemSettingsCard() {
  const { settings, loading, error, refresh } = useSystemSettings();
  const [selectedModel, setSelectedModel] = useState(settings?.default_ai_model || AVAILABLE_MODELS[0]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Update local state when remote setting changes
  React.useEffect(() => {
    if (settings?.default_ai_model) {
      setSelectedModel(settings.default_ai_model);
    }
  }, [settings?.default_ai_model]);

  if (loading) return null;
  if (error) {
    return <Card className="p-6 text-red-600">Failed to load system settings</Card>;
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMsg(null);
      await adminFetch(`/api/admin/system-settings/default_ai_model`, {
        method: 'PATCH',
        body: JSON.stringify({ value: JSON.stringify(selectedModel) }),
      });
      await refresh();
      setSaveMsg('Saved!');
    } catch (e) {
      setSaveMsg('Error saving');
      console.error(e);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Default AI Model</h3>
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="w-full border border-border rounded-md p-2 bg-muted text-foreground"
      >
        {AVAILABLE_MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-app-primary text-white rounded-md disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saveMsg && <p className="text-sm text-gray-600 dark:text-gray-400">{saveMsg}</p>}
    </Card>
  );
} 