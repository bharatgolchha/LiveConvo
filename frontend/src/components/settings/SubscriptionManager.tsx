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
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface SubscriptionData {
  plan: {
    name: string;
    displayName: string;
    pricing: {
      monthly: number | null;
      yearly: number | null;
    };
  };
  subscription: {
    status: string;
    id: string | null;
    startDate: string | null;
    endDate: string | null;
    billingInterval: string | null;
  };
  usage: {
    currentAudioHours: number;
    limitAudioHours: number | null;
    currentSessions: number;
    limitSessions: number | null;
  };
}

interface PlanDetails {
  limits: {
    monthlyAudioHours: number | null;
    maxDocumentsPerSession: number;
    maxFileSizeMb: number;
    maxSessionsPerMonth: number | null;
  };
  features: {
    hasRealTimeGuidance: boolean;
    hasAdvancedSummaries: boolean;
    hasExportOptions: boolean;
    hasEmailSummaries: boolean;
    hasPrioritySupport: boolean;
    hasAnalyticsDashboard: boolean;
    hasTeamCollaboration: boolean;
  };
}

export const SubscriptionManager: React.FC = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [planDetails, setPlanDetails] = useState<{ [key: string]: PlanDetails }>({});
  const [loading, setLoading] = useState(true);
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
    fetchPlanDetails();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/users/subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Subscription API response:', data);
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanDetails = async () => {
    try {
      const response = await fetch('/api/pricing');
      if (response.ok) {
        const data = await response.json();
        const details: { [key: string]: PlanDetails } = {};
        data.plans?.forEach((plan: any) => {
          details[plan.slug] = {
            limits: plan.limits,
            features: plan.features
          };
        });
        setPlanDetails(details);
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setManagingSubscription(true);
      
      // Determine environment and use appropriate billing portal URL
      const isProduction = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('xkxjycccifwyxgtvflxz');
      
      const portalId = isProduction 
        ? process.env.NEXT_PUBLIC_STRIPE_PROD_PORTAL_ID 
        : process.env.NEXT_PUBLIC_STRIPE_TEST_PORTAL_ID;
      
      if (!portalId) {
        console.error('Stripe billing portal ID not configured');
        alert('Billing management is not available at the moment. Please contact support.');
        return;
      }
      
      // Redirect to Stripe Customer Portal
      window.location.href = `https://billing.stripe.com/p/login/${portalId}`;
    } catch (error) {
      console.error('Error opening subscription portal:', error);
      alert('Unable to open billing portal. Please try again or contact support.');
    } finally {
      setManagingSubscription(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'past_due':
      case 'unpaid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'canceled':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      past_due: 'bg-red-100 text-red-800 border-red-200',
      unpaid: 'bg-red-100 text-red-800 border-red-200',
      canceled: 'bg-gray-100 text-gray-800 border-gray-200',
      incomplete: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };

    const statusLabels = {
      active: 'Active',
      past_due: 'Past Due',
      unpaid: 'Unpaid',
      canceled: 'Canceled',
      incomplete: 'Incomplete',
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.incomplete}>
        {statusLabels[status as keyof typeof statusLabels] || 'Unknown'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading subscription...</p>
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
            Unable to load subscription data
          </h3>
          <p className="text-muted-foreground mb-4">
            Please try refreshing the page or contact support if the issue persists.
          </p>
          <Button onClick={fetchSubscriptionData} variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const { plan, subscription, usage } = subscriptionData;
  const isPro = plan.name === 'pro' || plan.name === 'individual_pro';
  const isFree = plan.name === 'individual_free' || plan.name === 'free';

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isPro && <Crown className="w-5 h-5 text-yellow-500" />}
              <h2 className="text-xl font-semibold text-foreground">
                {plan.displayName} Plan
              </h2>
              {getStatusBadge(subscription.status)}
            </div>
            <p className="text-muted-foreground">
              {isPro 
                ? 'Professional conversation coaching with unlimited features'
                : 'Basic conversation coaching features'
              }
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {getStatusIcon(subscription.status)}
          </div>
        </div>

        {/* Subscription Details */}
        {isPro && subscription.id && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Billing</p>
                <p className="text-sm text-muted-foreground">
                  ${subscription.billingInterval === 'month' ? plan.pricing.monthly : plan.pricing.yearly}
                  /{subscription.billingInterval === 'month' ? 'month' : 'year'}
                </p>
              </div>
            </div>
            
            {subscription.endDate && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Next billing</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(subscription.endDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CreditCard className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Status</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {subscription.status.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-foreground mb-3">Usage This Billing Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Audio Time</span>
                <span className="text-sm font-medium text-foreground">
                  {usage.currentAudioHours < 1 
                    ? `${Math.round(usage.currentAudioHours * 60)} min`
                    : `${usage.currentAudioHours} hr`}
                  {usage.limitAudioHours !== null 
                    ? usage.limitAudioHours < 1 
                      ? ` / ${usage.limitAudioHours * 60} min`
                      : ` / ${usage.limitAudioHours} hr`
                    : ' (Unlimited)'}
                </span>
              </div>
              {usage.limitAudioHours && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min((usage.currentAudioHours / usage.limitAudioHours) * 100, 100)}%` 
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
        <div className="flex flex-col sm:flex-row gap-3">
          {isPro && subscription.id && (
            <Button
              onClick={handleManageSubscription}
              disabled={managingSubscription}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {managingSubscription ? 'Loading...' : 'Manage Subscription'}
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          
          {isFree && (
            <Button
              onClick={() => window.location.href = '/pricing'}
              className="flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Pro
            </Button>
          )}
        </div>
      </Card>

      {/* Benefits Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">
          {isPro ? 'Your Plan Benefits' : 'Available with Pro Plan'}
        </h3>
        
        {/* Audio Hours Limit */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Monthly Audio Limit</span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">
            {(() => {
              const audioHours = planDetails[plan.name]?.limits?.monthlyAudioHours;
              if (audioHours !== undefined) {
                if (audioHours === null) return 'Unlimited';
                if (audioHours < 1) return `${Math.round(audioHours * 60)} minutes`;
                return `${audioHours} hours`;
              }
              // Fallback to usage data if planDetails not loaded
              if (usage.limitAudioHours !== null) {
                if (usage.limitAudioHours < 1) return `${Math.round(usage.limitAudioHours * 60)} minutes`;
                return `${usage.limitAudioHours} hours`;
              }
              return 'Loading...';
            })()}
          </p>
          <p className="text-sm text-muted-foreground">
            {isFree 
              ? 'Upgrade to Pro for more recording time' 
              : 'Resets on your billing date'}
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className={`w-5 h-5 ${
              planDetails[plan.name]?.features?.hasRealTimeGuidance || isPro 
                ? 'text-green-500' 
                : 'text-muted-foreground'
            }`} />
            <span className={
              planDetails[plan.name]?.features?.hasRealTimeGuidance || isPro 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }>
              Real-time AI guidance
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className={`w-5 h-5 ${
              (planDetails[plan.name]?.limits?.maxSessionsPerMonth === null) || isPro 
                ? 'text-green-500' 
                : 'text-muted-foreground'
            }`} />
            <span className={
              (planDetails[plan.name]?.limits?.maxSessionsPerMonth === null) || isPro 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }>
              {planDetails[plan.name]?.limits?.maxSessionsPerMonth === null 
                ? 'Unlimited sessions' 
                : `${planDetails[plan.name]?.limits?.maxSessionsPerMonth || 'Limited'} sessions/month`}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className={`w-5 h-5 ${
              planDetails[plan.name]?.features?.hasAdvancedSummaries 
                ? 'text-green-500' 
                : 'text-muted-foreground'
            }`} />
            <span className={
              planDetails[plan.name]?.features?.hasAdvancedSummaries 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }>
              Advanced summaries
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className={`w-5 h-5 ${
              planDetails[plan.name]?.features?.hasPrioritySupport 
                ? 'text-green-500' 
                : 'text-muted-foreground'
            }`} />
            <span className={
              planDetails[plan.name]?.features?.hasPrioritySupport 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }>
              Priority support
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className={`w-5 h-5 ${
              planDetails[plan.name]?.features?.hasExportOptions 
                ? 'text-green-500' 
                : 'text-muted-foreground'
            }`} />
            <span className={
              planDetails[plan.name]?.features?.hasExportOptions 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }>
              Export options (PDF, TXT)
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <CheckCircle className={`w-5 h-5 ${
              planDetails[plan.name]?.features?.hasEmailSummaries 
                ? 'text-green-500' 
                : 'text-muted-foreground'
            }`} />
            <span className={
              planDetails[plan.name]?.features?.hasEmailSummaries 
                ? 'text-foreground' 
                : 'text-muted-foreground'
            }>
              Email summaries
            </span>
          </div>
        </div>
        
        {/* Document Limits */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            • Max {planDetails[plan.name]?.limits?.maxDocumentsPerSession || 5} documents per session
            <br />
            • Max {planDetails[plan.name]?.limits?.maxFileSizeMb || 10}MB file size
          </p>
        </div>
      </Card>
    </div>
  );
}; 