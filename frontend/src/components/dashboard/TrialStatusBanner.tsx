import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { useAuth } from '@/contexts/AuthContext';

interface TrialStatus {
  hasSubscription: boolean;
  isOnTrial: boolean;
  status: string;
  planName?: string;
  trialStatus?: {
    trialStart: string;
    trialEnd: string;
    daysLeft: number;
    daysTotal: number;
    progress: number;
  };
}

export const TrialStatusBanner: React.FC = () => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      fetchTrialStatus();
    }
  }, [session]);

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch('/api/trials/status', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrialStatus(data);
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !trialStatus?.isOnTrial) {
    return null;
  }

  const { daysLeft = 0, progress = 0 } = trialStatus.trialStatus || {};
  const isLastDay = daysLeft <= 1;
  const isExpiringSoon = daysLeft <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 rounded-lg border ${
        isLastDay 
          ? 'border-red-500/50 bg-red-50 dark:bg-red-950/20' 
          : isExpiringSoon 
          ? 'border-orange-500/50 bg-orange-50 dark:bg-orange-950/20'
          : 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20'
      } p-4`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${
            isLastDay 
              ? 'bg-red-100 text-red-600 dark:bg-red-900/50' 
              : isExpiringSoon
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50'
          }`}>
            {isExpiringSoon ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              {isLastDay 
                ? 'Your trial ends today!' 
                : `${daysLeft} days left in your trial`}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {isLastDay
                ? 'Add a payment method now to continue using Pro features without interruption.'
                : isExpiringSoon
                ? 'Your trial is ending soon. Upgrade now to keep all your Pro features.'
                : `You're enjoying the Pro plan trial. Upgrade anytime to continue after your trial ends.`}
            </p>
            
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Trial progress</span>
                <span>{daysLeft} days remaining</span>
              </div>
              <Progress 
                value={progress} 
                className={`h-2 ${
                  isLastDay 
                    ? '[&>div]:bg-red-500' 
                    : isExpiringSoon
                    ? '[&>div]:bg-orange-500'
                    : '[&>div]:bg-blue-500'
                }`}
              />
            </div>
          </div>
        </div>
        
        <Button
          size="sm"
          variant={isExpiringSoon ? 'primary' : 'outline'}
          onClick={() => window.location.href = '/dashboard/billing'}
          className="ml-4 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade Now
        </Button>
      </div>
    </motion.div>
  );
};