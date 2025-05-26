import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, AlertCircle, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

export type GuidanceType = 'ask' | 'clarify' | 'avoid' | 'suggest' | 'warn';

interface GuidanceChipProps {
  type: GuidanceType;
  message: string;
  confidence?: number;
  onFeedback?: (helpful: boolean) => void;
  onDismiss?: () => void;
  delay?: number;
}

export const GuidanceChip: React.FC<GuidanceChipProps> = ({
  type,
  message,
  confidence = 85,
  onFeedback,
  onDismiss,
  delay = 0
}) => {
  const typeConfig = {
    ask: {
      icon: MessageCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      label: 'Ask'
    },
    clarify: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
      label: 'Clarify'
    },
    avoid: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
      label: 'Avoid'
    },
    suggest: {
      icon: MessageCircle,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
      label: 'Suggest'
    },
    warn: {
      icon: AlertCircle,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600',
      label: 'Warning'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ duration: 0.3, delay }}
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border rounded-lg p-4 mb-3 shadow-sm
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
          <span className="font-medium text-sm">{config.label}</span>
          <span className="text-xs opacity-70">
            {confidence}% confidence
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message */}
      <p className="text-sm leading-relaxed mb-3">
        {message}
      </p>

      {/* Feedback */}
      {onFeedback && (
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-70">Helpful?</span>
          <button
            onClick={() => onFeedback(true)}
            className="p-1 rounded hover:bg-white/50 transition-colors"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => onFeedback(false)}
            className="p-1 rounded hover:bg-white/50 transition-colors"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}; 