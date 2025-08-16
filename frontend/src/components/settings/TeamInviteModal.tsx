'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { AlertCircle } from 'lucide-react';

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken?: string;
  onInvited?: () => void;
}

export const TeamInviteModal: React.FC<TeamInviteModalProps> = ({ isOpen, onClose, accessToken, onInvited }) => {
  const { subscription, planType, loading: subscriptionLoading } = useSubscription();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get the actual per-seat cost from the subscription data
  const getSeatCost = () => {
    if (!subscription) {
      return { cost: null, period: 'month', loading: true };
    }

    const billingInterval = subscription.subscription?.billingInterval || 'month';
    const isYearly = billingInterval === 'year';
    
    // Get per-seat pricing from the subscription data
    const perSeatMonthly = subscription.plan?.pricing?.perSeatMonthly;
    const perSeatYearly = subscription.plan?.pricing?.perSeatYearly;
    
    // For free plan
    if (planType === 'free' || (!perSeatMonthly && !perSeatYearly)) {
      return { cost: 0, period: 'free', loading: false };
    }
    
    // Use the actual per-seat pricing based on billing interval
    const cost = isYearly ? (perSeatYearly || perSeatMonthly) : perSeatMonthly;
    const period = isYearly ? 'year' : 'month';
    
    return { cost, period, loading: false };
  };

  if (!isOpen) return null;

  const submit = async () => {
    if (!email) return;
    setSubmitting(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch('/api/team/invitations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, role, message })
      });
      if (!res.ok) throw new Error('Failed to create invitation');
      onInvited?.();
      onClose();
      setEmail('');
      setMessage('');
      setRole('member');
    } catch (e) {
      console.error(e);
      alert('Failed to send invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-background text-foreground shadow-xl border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Invite Team Member</h3>
          <p className="text-sm text-muted-foreground mt-1">Send an email invitation to join your organization.</p>
        </div>
        <div className="p-6 space-y-4">
          {/* Billing Reminder */}
          {(() => {
            const { cost, period, loading } = getSeatCost();
            
            // Show loading state
            if (loading || subscriptionLoading) {
              return (
                <div className="flex items-start gap-3 p-3 bg-muted/50 border border-border rounded-lg animate-pulse">
                  <div className="w-5 h-5 bg-muted rounded-full flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              );
            }
            
            // Free plan message
            if (planType === 'free' || cost === 0) {
              return (
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">Free Plan</p>
                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                      Your free plan includes up to 5 team members at no additional cost.
                    </p>
                  </div>
                </div>
              );
            }
            
            // Paid plan billing information
            return (
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">Billing Reminder</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Adding this team member will increase your {period === 'year' ? 'annual' : 'monthly'} bill by{' '}
                    <span className="font-semibold">
                      ${cost?.toFixed(2)}{period === 'year' ? '/year' : '/month'}
                    </span>
                    {' '}per seat. The charge will be prorated for the current billing period.
                  </p>
                  <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
                    You're on the <span className="font-medium">{subscription?.plan?.displayName}</span> plan.
                  </p>
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md bg-background text-foreground"
              placeholder="A short welcome note"
            />
          </div>
        </div>
        <div className="p-6 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting} disabled={!email}>
            Send Invite
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamInviteModal;


