import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Crown,
  Clock,
  Users,
  UserCheck,
  TrendingUp,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface TeamSubscriptionData {
  plan: {
    name: string;
    displayName: string;
    pricing: {
      monthly: number | null;
      yearly: number | null;
      perSeat?: {
        monthly: number | null;
        yearly: number | null;
      };
    };
    billingType: 'individual' | 'team_seats';
    pricingTiers?: Array<{
      upTo: number | null;
      perUnit: number;
    }>;
  };
  subscription: {
    status: string;
    id: string | null;
    quantity: number;
    billingInterval: 'month' | 'year' | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  };
  organization: {
    id: string;
    name: string;
    memberCount: number;
    ownerEmail?: string;
  };
  userRole: 'owner' | 'admin' | 'member';
  usage: {
    currentBotMinutes: number;
    limitBotMinutes: number | null;
    currentSessions: number;
    limitSessions: number | null;
  };
  members?: Array<{
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    joinedAt: string;
    currentMonthMinutes: number;
    monthlyLimit: number | null;
  }>;
}

export const TeamBillingManager: React.FC = () => {
  const [subscriptionData, setSubscriptionData] = useState<TeamSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    fetchTeamSubscriptionData();
  }, []);

  const fetchTeamSubscriptionData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get user's current organization and role
      const { data: userData } = await supabase
        .from('users')
        .select(`
          id,
          current_organization_id,
          organization_members!inner(
            role,
            organization_id,
            organizations!inner(
              id,
              name,
              display_name
            )
          )
        `)
        .eq('id', session.user.id)
        .single();

      if (!userData?.current_organization_id) {
        setLoading(false);
        return;
      }

      const userRole = userData.organization_members[0]?.role || 'member';
      const orgId = userData.current_organization_id;

      // Get subscription data
      const response = await fetch(`/api/team/billing?orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionData({
          ...data,
          userRole
        });
      }
    } catch (error) {
      console.error('Error fetching team subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setManagingSubscription(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to manage your subscription.');
        return;
      }

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        alert('Unable to open billing portal. Please try again or contact support.');
        return;
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening subscription portal:', error);
      alert('Unable to open billing portal. Please try again or contact support.');
    } finally {
      setManagingSubscription(false);
    }
  };

  const calculateTieredPrice = (quantity: number, tiers?: Array<{ upTo: number | null; perUnit: number }>) => {
    if (!tiers || tiers.length === 0) return 0;
    
    let total = 0;
    let remaining = quantity;
    let previousTierEnd = 0;

    for (const tier of tiers) {
      const tierSize = tier.upTo ? tier.upTo - previousTierEnd : remaining;
      const unitsInTier = Math.min(remaining, tierSize);
      
      total += unitsInTier * tier.perUnit;
      remaining -= unitsInTier;
      
      if (tier.upTo) previousTierEnd = tier.upTo;
      if (remaining <= 0) break;
    }

    return total;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading billing information...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!subscriptionData) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Unable to load billing data
          </h3>
          <p className="text-muted-foreground mb-4">
            Please try refreshing the page or contact support if the issue persists.
          </p>
          <Button onClick={fetchTeamSubscriptionData} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const { plan, subscription, organization, userRole, usage, members } = subscriptionData;
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const isTeamPlan = plan.billingType === 'team_seats';
  const currentSeats = subscription.quantity || organization.memberCount || 1;

  // Calculate pricing based on tiers if applicable
  const monthlyPrice = plan.pricingTiers 
    ? calculateTieredPrice(currentSeats, plan.pricingTiers)
    : (plan.pricing.perSeat?.monthly || plan.pricing.monthly || 0) * currentSeats;

  const yearlyPrice = plan.pricingTiers 
    ? calculateTieredPrice(currentSeats, plan.pricingTiers) * 12 * 0.833 // Annual discount
    : (plan.pricing.perSeat?.yearly || plan.pricing.yearly || 0) * currentSeats;

  const currentPrice = subscription.billingInterval === 'year' ? yearlyPrice : monthlyPrice;

  return (
    <div className="space-y-6">
      {/* Team Plan Overview */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isTeamPlan && <Users className="w-5 h-5 text-primary" />}
              <h2 className="text-xl font-semibold text-foreground">
                {plan.displayName}
              </h2>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {subscription.status || 'Active'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {isTeamPlan 
                ? `Team plan for ${organization.name}`
                : 'Individual plan'
              }
            </p>
          </div>
          {userRole === 'owner' && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Owner
            </Badge>
          )}
        </div>

        {/* Member View - Show who handles billing */}
        {!isOwnerOrAdmin && isTeamPlan && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Team Member Account
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your subscription is managed by your team administrator.
                  {organization.ownerEmail && (
                    <span className="block mt-1">
                      Contact <span className="font-medium">{organization.ownerEmail}</span> for billing questions.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Owner/Admin View - Show billing details */}
        {isOwnerOrAdmin && isTeamPlan && subscription.id && (
          <>
            {/* Team Size & Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Team Size</p>
                  <p className="text-lg font-bold text-foreground">
                    {currentSeats} {currentSeats === 1 ? 'seat' : 'seats'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CreditCard className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Total Cost</p>
                  <p className="text-lg font-bold text-foreground">
                    ${currentPrice.toFixed(2)}/{subscription.billingInterval || 'month'}
                  </p>
                </div>
              </div>
              
              {subscription.currentPeriodEnd && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Next Billing</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Tiers Display */}
            {plan.pricingTiers && plan.pricingTiers.length > 0 && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Volume Pricing Tiers
                </h4>
                <div className="space-y-2">
                  {plan.pricingTiers.map((tier, index) => {
                    const previousTier = index > 0 ? plan.pricingTiers![index - 1].upTo : 0;
                    const isCurrentTier = currentSeats > (previousTier || 0) && 
                                         (tier.upTo === null || currentSeats <= tier.upTo);
                    
                    return (
                      <div 
                        key={index}
                        className={`flex justify-between items-center text-sm p-2 rounded ${
                          isCurrentTier ? 'bg-primary/10 border border-primary/30' : ''
                        }`}
                      >
                        <span className={isCurrentTier ? 'font-medium' : 'text-muted-foreground'}>
                          {previousTier ? `${(previousTier || 0) + 1}` : '1'}
                          {tier.upTo ? ` - ${tier.upTo}` : '+'} seats
                        </span>
                        <span className={isCurrentTier ? 'font-bold text-primary' : 'text-muted-foreground'}>
                          ${tier.perUnit}/seat/month
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team Members Table */}
            {members && members.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-foreground mb-3">
                  Team Members ({members.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-foreground">Member</th>
                        <th className="text-left p-3 text-sm font-medium text-foreground">Role</th>
                        <th className="text-left p-3 text-sm font-medium text-foreground">Usage</th>
                        <th className="text-left p-3 text-sm font-medium text-foreground">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="p-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {member.fullName || member.email.split('@')[0]}
                              </p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              <span className="font-medium">{member.currentMonthMinutes}</span>
                              {member.monthlyLimit && (
                                <span className="text-muted-foreground"> / {member.monthlyLimit} min</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Usage Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-foreground mb-3">
            {isOwnerOrAdmin && isTeamPlan ? 'Team Usage' : 'Your Usage'} This Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">🤖 Bot Minutes</span>
                <span className="text-sm font-bold text-foreground">
                  {usage.currentBotMinutes || 0}
                  {usage.limitBotMinutes !== null 
                    ? ` / ${usage.limitBotMinutes}`
                    : ' (Unlimited)'}
                </span>
              </div>
              {usage.limitBotMinutes && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      ((usage.currentBotMinutes || 0) / usage.limitBotMinutes) > 0.9 
                        ? 'bg-red-500' 
                        : ((usage.currentBotMinutes || 0) / usage.limitBotMinutes) > 0.75 
                        ? 'bg-yellow-500'
                        : 'bg-primary'
                    }`}
                    style={{ 
                      width: `${Math.min(((usage.currentBotMinutes || 0) / usage.limitBotMinutes) * 100, 100)}%` 
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Sessions</span>
                <span className="text-sm font-medium text-foreground">
                  {usage.currentSessions}
                  {usage.limitSessions ? ` / ${usage.limitSessions}` : ' (Unlimited)'}
                </span>
              </div>
              {usage.limitSessions && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min((usage.currentSessions / usage.limitSessions) * 100, 100)}%` 
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Management Actions */}
        <div className="space-y-4">
          {isOwnerOrAdmin && subscription.id && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleManageSubscription}
                  disabled={managingSubscription}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <CreditCard className="w-4 h-4" />
                  {managingSubscription ? 'Opening Portal...' : 'Manage Billing'}
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage your team subscription, add or remove seats, update payment methods, or download invoices.
              </p>
            </>
          )}
          
          {!isOwnerOrAdmin && isTeamPlan && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="w-4 h-4" />
              <span>You're part of the {organization.name} team</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};