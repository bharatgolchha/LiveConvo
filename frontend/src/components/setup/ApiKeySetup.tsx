import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, ExternalLink, AlertCircle, Check, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardContent } from '../ui/Card';

interface ApiKeySetupProps {
  onApiKeySet?: (apiKey: string) => void;
  currentApiKey?: string;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({
  onApiKeySet,
  currentApiKey
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      // In a real app, this would be stored securely
      localStorage.setItem('openai_api_key', apiKey);
      onApiKeySet?.(apiKey);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for browsers without clipboard API
        console.warn('Clipboard API not supported');
      }
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
    }
  };

  const isValidKey = apiKey.startsWith('sk-') && apiKey.length > 20;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">OpenAI API Setup</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        {/* Introduction */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Live Transcription Setup</h4>
              <p className="text-sm text-blue-700">
                To enable real-time speech-to-text, you&apos;ll need an OpenAI API key. 
                Without it, we&apos;ll use a demo mode with simulated transcripts.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Get your OpenAI API key</h4>
              <p className="text-sm text-gray-600 mb-2">
                Visit the OpenAI platform to create an API key for your account.
              </p>
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink className="w-4 h-4" />}
                onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
              >
                Open OpenAI Platform
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center mt-0.5">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Enter your API key</h4>
              <p className="text-sm text-gray-600 mb-3">
                Paste your OpenAI API key below. It should start with &quot;sk-&quot;.
              </p>
              
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      👁️
                    </button>
                    {isValidKey && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSave}
                    variant="primary"
                    disabled={!isValidKey}
                  >
                    Save API Key
                  </Button>
                  
                  {currentApiKey && navigator.clipboard && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(currentApiKey)}
                      icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    >
                      {copied ? 'Copied!' : 'Copy Current'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Security Note</h4>
              <p className="text-sm text-amber-700">
                Your API key is stored locally in your browser and never sent to our servers. 
                For production use, we recommend using environment variables or a secure key management system.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Mode Info */}
        {!currentApiKey && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <h4 className="font-medium text-gray-900 mb-1">Demo Mode</h4>
            <p className="text-sm text-gray-600">
              Currently running in demo mode with simulated transcripts. 
              Add your API key above to enable real-time speech-to-text.
            </p>
          </motion.div>
        )}

        {/* Pricing Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>OpenAI Realtime API Pricing:</strong></p>
          <p>• Input: $0.06 per minute of audio</p>
          <p>• Output: $0.24 per minute of generated audio</p>
          <p>• For transcription only, output costs are minimal</p>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};
