import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';

interface ConversationProcessingViewProps {
  message?: string;
}

export const ConversationProcessingView: React.FC<ConversationProcessingViewProps> = ({
  message = 'Processing your request...'
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Processing Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mb-8"
      >
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-purple-200"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full" />
        </motion.div>
        
        {/* Inner pulsing brain */}
        <motion.div
          className="w-32 h-32 bg-purple-100 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain className="w-16 h-16 text-purple-600" />
        </motion.div>
      </motion.div>

      {/* Processing Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing
        </h2>
        <p className="text-muted-foreground">{message}</p>
      </motion.div>

      {/* Progress Dots */}
      <motion.div className="flex gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};