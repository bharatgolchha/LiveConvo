import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink, Zap, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface RealtimeApiInfoProps {
  onUseDemoMode?: () => void;
}

export const RealtimeApiInfo: React.FC<RealtimeApiInfoProps> = ({
  onUseDemoMode
}) => {
  return (
    <Card
      header={
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <span className="font-semibold">OpenAI Realtime API Status</span>
        </div>
      }
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Status Info */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Limited Beta Access</h4>
              <p className="text-sm text-amber-700">
                The OpenAI Realtime API is currently in limited beta and requires special access. 
                Most users don&apos;t have access yet, which is why the connection gets stuck on &quot;Connecting...&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Alternatives */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Available Options:</h4>
          
          <div className="grid gap-4">
            {/* Demo Mode */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h5 className="font-medium text-blue-900 mb-1">Demo Mode (Recommended)</h5>
                  <p className="text-sm text-blue-700 mb-3">
                    Experience the full liveprompt.ai interface with simulated real-time transcription. 
                    Perfect for testing the UI and understanding the workflow.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onUseDemoMode}
                  >
                    Use Demo Mode
                  </Button>
                </div>
              </div>
            </div>

            {/* Request Access */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 mb-1">Request Realtime API Access</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    Apply for beta access to the OpenAI Realtime API through OpenAI&apos;s official channels.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ExternalLink className="w-4 h-4" />}
                    onClick={() => window.open('https://platform.openai.com/docs/guides/realtime', '_blank')}
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Future Plans */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Coming Soon:</strong></p>
          <p>• Standard Whisper API integration for real transcription</p>
          <p>• WebRTC-based local speech recognition</p>
          <p>• Integration with other speech-to-text providers</p>
        </div>
      </div>
    </Card>
  );
}; 