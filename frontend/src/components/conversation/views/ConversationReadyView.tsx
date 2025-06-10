import React from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Play,
  Settings,
  AlertCircle,
  Headphones,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ConversationReadyViewProps {
  conversationTitle: string;
  conversationType: string;
  hasContext: boolean;
  canRecord: boolean;
  minutesRemaining: number;
  onStartRecording: () => void;
  onOpenSettings: () => void;
}

export const ConversationReadyView: React.FC<ConversationReadyViewProps> = ({
  conversationTitle,
  conversationType,
  hasContext,
  canRecord,
  minutesRemaining,
  onStartRecording,
  onOpenSettings
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Ready Icon */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
          <Play className="w-16 h-16 text-blue-600" />
        </div>
      </motion.div>

      {/* Title */}
      <h2 className="text-3xl font-bold mb-2">Ready to Record</h2>
      <p className="text-xl text-muted-foreground mb-8">{conversationTitle}</p>

      {/* Configuration Summary */}
      <Card className="p-6 mb-8 w-full max-w-md">
        <h3 className="font-semibold mb-4">Configuration</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium capitalize">{conversationType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Context:</span>
            <span className="font-medium">{hasContext ? 'Added' : 'None'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Minutes Available:</span>
            <span className={`font-medium ${minutesRemaining <= 10 ? 'text-warning' : ''}`}>
              {minutesRemaining}
            </span>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-md">
        <Card className="p-4 text-center">
          <Headphones className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm">Use headphones for best audio quality</p>
        </Card>
        <Card className="p-4 text-center">
          <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm">Allow screen recording for system audio</p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={onStartRecording}
          size="lg"
          disabled={!canRecord}
          className="min-w-[200px]"
        >
          <Mic className="w-5 h-5 mr-2" />
          Start Recording
        </Button>
        
        <Button
          onClick={onOpenSettings}
          size="lg"
          variant="outline"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Warnings */}
      {!canRecord && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-destructive/10 rounded-lg flex items-start gap-2 max-w-md"
        >
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Recording Disabled</p>
            <p className="text-sm text-destructive/80">
              You've reached your monthly limit. Please upgrade to continue.
            </p>
          </div>
        </motion.div>
      )}
      
      {canRecord && minutesRemaining <= 10 && minutesRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-warning/10 rounded-lg flex items-start gap-2 max-w-md"
        >
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Low Minutes Warning</p>
            <p className="text-sm text-warning/80">
              You have {minutesRemaining} minutes remaining. Consider upgrading soon.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};