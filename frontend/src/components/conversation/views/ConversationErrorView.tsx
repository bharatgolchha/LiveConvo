import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface ConversationErrorViewProps {
  errorMessage: string;
  onRetry?: () => void;
  onReset?: () => void;
}

export const ConversationErrorView: React.FC<ConversationErrorViewProps> = ({
  errorMessage,
  onRetry,
  onReset
}) => {
  const router = useRouter();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="m-auto text-center max-w-lg p-8 bg-card rounded-xl shadow-2xl"
    >
      <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-destructive/20">
        <XCircle className="w-12 h-12 text-destructive" />
      </div>
      
      <h2 className="text-3xl font-bold text-foreground mb-3">
        Something Went Wrong
      </h2>
      
      <p className="text-muted-foreground mb-2 text-lg">
        We encountered an error while processing your request.
      </p>
      
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-8 text-sm">
        {errorMessage}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="lg"
            className="min-w-[160px]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {onReset && (
          <Button
            onClick={onReset}
            variant="default"
            size="lg"
            className="min-w-[160px]"
          >
            Start Over
          </Button>
        )}
        
        <Button
          onClick={() => router.push('/dashboard')}
          variant="ghost"
          size="lg"
          className="min-w-[160px]"
        >
          <Home className="w-4 h-4 mr-2" />
          Go to Dashboard
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-8">
        If this problem persists, please contact support.
      </p>
    </motion.div>
  );
};