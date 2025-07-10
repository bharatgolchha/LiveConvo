'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Share2, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ReferralStats {
  referral_code: string;
  referral_url: string;
  stats: {
    total_referrals: number;
    pending: number;
    completed: number;
    total_earned: number;
    credit_balance: number;
  };
  migration_needed?: boolean;
}

export function ReferralWidget() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      fetchReferralStats();
    } else {
      setLoading(false);
      setError('Not authenticated');
    }
  }, [session]);

  const fetchReferralStats = async () => {
    if (!session?.access_token) return;
    
    try {
      const response = await fetch('/api/referrals/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch referral stats');
      }
      
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching referral stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success message (could use a toast library here)
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!stats) return;

    const shareData = {
      title: 'Try LivePrompt.ai',
      text: `Get AI-powered real-time conversation coaching with LivePrompt.ai! Use my referral code ${stats.referral_code} for 10% off your subscription.`,
      url: stats.referral_url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying the URL
        await copyToClipboard(stats.referral_url, 'Referral link');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center text-destructive">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p className="text-sm">{error || 'Unable to load referral data'}</p>
        </div>
      </div>
    );
  }

  const hasExpiringCredits = stats.stats.credit_balance > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Gift className="w-5 h-5 text-primary mr-2" />
            <h3 className="font-semibold text-lg">Referral Rewards</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/dashboard/referrals'}
          >
            View All
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Migration Notice */}
        {stats.migration_needed && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-yellow-600 font-medium">Setup Required</p>
                <p className="text-muted-foreground mt-1">
                  Database migrations needed. See SETUP_REFERRAL_SYSTEM.md
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Referral Code Section */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-sm">
              {stats.referral_code}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(stats.referral_code, 'Referral code')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => copyToClipboard(stats.referral_url, 'Referral link')}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-xs">Total Referrals</span>
            </div>
            <p className="text-2xl font-bold">{stats.stats.total_referrals}</p>
            {stats.stats.pending > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats.stats.pending} pending
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4 mr-1" />
              <span className="text-xs">Credits Earned</span>
            </div>
            <p className="text-2xl font-bold">${stats.stats.total_earned}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Balance: ${stats.stats.credit_balance}
            </p>
          </div>
        </div>

        {/* Expiring Credits Warning */}
        {hasExpiringCredits && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-yellow-600 font-medium">Credits expiring soon</p>
                <p className="text-muted-foreground mt-1">
                  Use your credits before they expire!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">
            Earn <span className="font-semibold text-foreground">$5</span> for each friend who subscribes!
          </p>
        </div>
      </div>
    </motion.div>
  );
}