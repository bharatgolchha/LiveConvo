import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle, AlertCircle, Clock, XCircle, Wifi } from 'lucide-react';
import { useWebhookEvents } from '@/lib/hooks/useWebhookEvents';
import { cn } from '@/lib/utils';

interface WebhookStatusIndicatorProps {
  sessionId: string;
  className?: string;
}

export function WebhookStatusIndicator({ sessionId, className }: WebhookStatusIndicatorProps) {
  const { lastEvent, isConnected } = useWebhookEvents(sessionId);
  
  // Extract bot status from last event
  const botStatus = lastEvent?.type === 'bot_status_update' ? lastEvent.data : null;
  
  const getStatusIcon = () => {
    if (!botStatus) return <Bot className="w-4 h-4" />;
    
    switch (botStatus.category) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };
  
  const getStatusColor = () => {
    if (!botStatus) return 'bg-gray-100 text-gray-700';
    
    switch (botStatus.category) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };
  
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <Wifi className={cn("w-3 h-3", isConnected ? "text-green-600" : "text-gray-400")} />
        <span className={cn("text-xs", isConnected ? "text-green-600" : "text-gray-400")}>
          {isConnected ? 'Live Updates Active' : 'Connecting...'}
        </span>
      </div>
      
      {/* Bot Status */}
      <AnimatePresence mode="wait">
        {botStatus && (
          <motion.div
            key={botStatus.status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              getStatusColor()
            )}
          >
            {getStatusIcon()}
            <div className="flex-1">
              <div className="font-medium text-sm">{botStatus.title}</div>
              <div className="text-xs opacity-80">{botStatus.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}