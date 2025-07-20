'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Sparkles, Zap, Shield, Star, Mic, Search, Bell, User as UserIcon, Settings, LogOut, Crown, Rocket, Heart, Gift } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Footer } from '@/components/layout/Footer';

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  pricing: {
    monthly: number | null;
    yearly: number | null;
    currency: string;
  };
  limits: {
    monthlyAudioHours: number | null;
    maxDocumentsPerSession: number;
    maxFileSizeMb: number;
    maxSessionsPerMonth: number | null;
    maxOrganizationMembers: number | null;
  };
  features: {
    hasRealTimeGuidance: boolean;
    hasAdvancedSummaries: boolean;
    hasExportOptions: boolean;
    hasEmailSummaries: boolean;
    hasApiAccess: boolean;
    hasCustomTemplates: boolean;
    hasPrioritySupport: boolean;
    hasAnalyticsDashboard: boolean;
    hasTeamCollaboration: boolean;
  };
  stripe: {
    monthlyPriceId: string | null;
    yearlyPriceId: string | null;
  };
  display: {
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
  };
  aiModels: string[];
  maxGuidanceRequestsPerSession: number;
  summaryGenerationPriority: number;
  trial?: {
    enabled: boolean;
    days: number;
  };
}

interface TrialStatus {
  isEligible: boolean;
  hasUsedTrial: boolean;
  currentTrialDaysLeft?: number;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null);
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({ isEligible: false, hasUsedTrial: false });
  
  const { user, signOut } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: plansData, error } = await supabase
          .from('plans')
          .select(`
            id,
            name,
            display_name,
            description,
            plan_type,
            price_monthly,
            price_yearly,
            stripe_price_id_monthly,
            stripe_price_id_yearly,
            monthly_audio_hours_limit,
            max_documents_per_session,
            max_file_size_mb,
            max_sessions_per_month,
            max_organization_members,
            has_real_time_guidance,
            has_advanced_summaries,
            has_export_options,
            has_email_summaries,
            has_api_access,
            has_custom_templates,
            has_priority_support,
            has_analytics_dashboard,
            has_team_collaboration,
            ai_model_access,
            max_guidance_requests_per_session,
            summary_generation_priority,
            is_active,
            is_featured,
            sort_order,
            trial_enabled,
            trial_days
          `)
          .eq('is_active', true)
          .order('sort_order');

        if (error) {
          console.error('Error fetching plans:', error);
          return;
        }

        const formattedPlans: PricingPlan[] = plansData.map(plan => ({
          id: plan.id,
          name: plan.display_name,
          slug: plan.name,
          description: plan.description,
          type: plan.plan_type,
          pricing: {
            monthly: plan.price_monthly,
            yearly: plan.price_yearly,
            currency: 'USD'
          },
          limits: {
            monthlyAudioHours: plan.monthly_audio_hours_limit,
            maxDocumentsPerSession: plan.max_documents_per_session,
            maxFileSizeMb: plan.max_file_size_mb,
            maxSessionsPerMonth: plan.max_sessions_per_month,
            maxOrganizationMembers: plan.max_organization_members
          },
          features: {
            hasRealTimeGuidance: plan.has_real_time_guidance,
            hasAdvancedSummaries: plan.has_advanced_summaries,
            hasExportOptions: plan.has_export_options,
            hasEmailSummaries: plan.has_email_summaries,
            hasApiAccess: plan.has_api_access,
            hasCustomTemplates: plan.has_custom_templates,
            hasPrioritySupport: plan.has_priority_support,
            hasAnalyticsDashboard: plan.has_analytics_dashboard,
            hasTeamCollaboration: plan.has_team_collaboration
          },
          stripe: {
            monthlyPriceId: plan.stripe_price_id_monthly,
            yearlyPriceId: plan.stripe_price_id_yearly
          },
          display: {
            isActive: plan.is_active,
            isFeatured: plan.is_featured,
            sortOrder: plan.sort_order
          },
          aiModels: plan.ai_model_access || ['gpt-4o-mini'],
          maxGuidanceRequestsPerSession: plan.max_guidance_requests_per_session,
          summaryGenerationPriority: plan.summary_generation_priority,
          trial: {
            enabled: plan.trial_enabled || false,
            days: plan.trial_days || 0
          }
        }));

        setPlans(formattedPlans);

        // Fetch current user's plan
        if (user) {
          const { data: subscriptionData } = await supabase
            .from('active_user_subscriptions')
            .select('plan_name')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
          
          if (subscriptionData?.plan_name) {
            setCurrentUserPlan(subscriptionData.plan_name);
          }
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
    
    // Check trial eligibility if user is logged in
    if (user) {
      checkTrialEligibility();
    }
  }, [user]);

  const checkTrialEligibility = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch('/api/trials/check-eligibility', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Trial eligibility response:', data);
        setTrialStatus(data);
      }
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
    }
  };

  const formatPrice = (price: number | null): string => {
    if (price === null || price === 0) return 'Free';
    return `$${price.toFixed(0)}`;
  };

  const getYearlySavings = (monthly: number | null, yearly: number | null): number => {
    if (!monthly || !yearly) return 0;
    const monthlyTotal = monthly * 12;
    const savings = ((monthlyTotal - yearly) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      router.push(`/auth/signup?plan=${plan.slug}&billing=${billingPeriod}`);
      return;
    }

    if (currentUserPlan === plan.slug) {
      return;
    }

    // If user has an existing paid plan and wants to change/manage it, take them to billing portal
    if (currentUserPlan && currentUserPlan !== 'individual_free') {
      await handleManageSubscription();
      return;
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/auth/signin?plan=${plan.slug}&billing=${billingPeriod}`);
        return;
      }

      // Get the correct price ID based on billing period
      const priceId = billingPeriod === 'monthly' 
        ? plan.stripe.monthlyPriceId 
        : plan.stripe.yearlyPriceId;

      if (!priceId) {
        alert(`This plan is not yet available for ${billingPeriod} billing. Please contact support or try a different plan.`);
        return;
      }

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId: priceId,
          billingCycle: billingPeriod,
          planId: plan.id,
          planSlug: plan.slug,
          referralCode: undefined, // Add this if you have referral functionality
        }),
      });

      if (!response.ok) {
        let errorData: any = {};
        let responseText = '';
        
        try {
          responseText = await response.text();
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          console.error('Response text was:', responseText);
          
          if (responseText && (responseText.includes('<!DOCTYPE') || responseText.includes('<html'))) {
            errorData = { 
              error: `Server error (${response.status}): Edge function may not be deployed`,
              isHtml: true,
              status: response.status
            };
          } else {
            errorData = { 
              error: responseText || `HTTP ${response.status} error`,
              status: response.status
            };
          }
        }
        
        console.error('Checkout error:', errorData);
        console.error('Response status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (errorData.error && errorData.error.includes('STRIPE_SECRET_KEY')) {
          alert('Payment system is not configured on the server. Please contact support to complete the Stripe setup.');
          return;
        }
        
        if (response.status === 404) {
          alert('The payment service is not available. The edge function may not be deployed. Please contact support.');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
      
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      
      // Fallback to signup page
      router.push(`/auth/signup?plan=${plan.slug}&billing=${billingPeriod}`);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      // Call the billing portal API
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create portal session:', error);
        alert('Unable to open billing portal. Please try again or contact support.');
        return;
      }

      const { url } = await response.json();
      
      // Redirect to the Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      console.error('Error opening subscription portal:', error);
      alert('Unable to open billing portal. Please try again or contact support.');
    }
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'individual_free':
        return <Heart className="w-6 h-6 text-primary" />;
      case 'starter':
        return <Rocket className="w-6 h-6 text-primary" />;
      case 'pro':
        return <Zap className="w-6 h-6 text-primary" />;
      case 'max':
        return <Crown className="w-6 h-6 text-primary" />;
      default:
        return <Shield className="w-6 h-6 text-primary" />;
    }
  };

  const getFeaturesList = (plan: PricingPlan) => {
    const features = [];
    
    // Add usage limits with improved descriptions
    features.push({
      text: plan.limits.monthlyAudioHours
        ? plan.limits.monthlyAudioHours < 1 
          ? `${plan.limits.monthlyAudioHours * 60} minutes of AI transcription/month`
          : `${plan.limits.monthlyAudioHours} hours of AI transcription/month`
        : 'Unlimited AI transcription hours',
      included: true
    });
    
    features.push({
      text: plan.limits.maxSessionsPerMonth
        ? `${plan.limits.maxSessionsPerMonth} conversation sessions/month`
        : 'Unlimited conversation sessions',
      included: true
    });

    // Add key features with improved descriptions
    if (plan.features.hasRealTimeGuidance) {
      features.push({ text: 'Real-time AI coaching & suggestions', included: true });
    }
    
    // All plans have summaries, but only Pro and Max have advanced summaries
    if (plan.features.hasAdvancedSummaries) {
      features.push({ text: 'Advanced AI summaries with insights', included: true });
    } else {
      features.push({ text: 'Basic conversation summaries', included: true });
    }
    
    if (plan.features.hasExportOptions) {
      features.push({ text: 'Export transcripts & reports (PDF/CSV)', included: true });
    } else {
      features.push({ text: 'Export transcripts & reports (PDF/CSV)', included: false });
    }
    
    if (plan.features.hasEmailSummaries) {
      features.push({ text: 'Automated email summaries after calls', included: true });
    } else if (plan.slug !== 'individual_free') {
      features.push({ text: 'Automated email summaries after calls', included: false });
    }
    
    if (plan.features.hasApiAccess) {
      features.push({ text: 'Full API access for integrations', included: true });
    } else if (plan.slug === 'max') {
      features.push({ text: 'Full API access for integrations', included: false });
    }
    
    if (plan.features.hasCustomTemplates) {
      features.push({ text: 'Custom conversation templates & prompts', included: true });
    } else if (plan.slug === 'max') {
      features.push({ text: 'Custom conversation templates & prompts', included: false });
    }
    
    if (plan.features.hasPrioritySupport) {
      features.push({ text: 'Priority 24/7 customer support', included: true });
    } else if (plan.slug === 'max') {
      features.push({ text: 'Priority 24/7 customer support', included: false });
    }

    return features;
  };

  // Exclude free plans from display
  const displayedPlans = plans.filter(p => p.slug !== 'individual_free' && p.slug !== 'free');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-muted-foreground animate-pulse font-medium">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header for logged-in users */}
      {user && (
        <header className="sticky top-0 z-50 w-full bg-card/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo and Title */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <img 
                src={resolvedTheme === 'dark' 
                  ? "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//DarkMode2.png"
                  : "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//LightMode2.png"
                }
                alt="liveprompt.ai"
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            
            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                className="hidden sm:flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                Dashboard
              </Button>
              <ThemeToggle />
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-all duration-200 hover:shadow-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-md">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-foreground">
                    {user.email?.split('@')[0]}
                  </span>
                </button>
                
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl bg-card border shadow-xl overflow-hidden backdrop-blur-sm"
                    >
                      <div className="p-3 border-b bg-muted/30">
                        <p className="text-sm font-medium text-foreground">{user.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-foreground"
                        >
                          <UserIcon className="w-4 h-4" />
                          <span>Dashboard</span>
                        </Link>
                        <button
                          onClick={async () => {
                            await signOut();
                            router.push('/');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 border border-primary/20 mb-6 backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Transform Your Conversations</span>
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Start free and upgrade as you grow. No hidden fees, no surprises.
            </p>
            
            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="inline-flex items-center p-1.5 bg-muted/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg"
            >
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-8 py-4 rounded-xl font-medium transition-all duration-300 ${
                  billingPeriod === 'monthly'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-8 py-4 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingPeriod === 'yearly'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Yearly
                <Badge className="bg-green-500 text-white border-0 shadow-md px-2 py-0.5">Save 17%</Badge>
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Current Subscription Banner */}
      {user && currentUserPlan && currentUserPlan !== 'individual_free' && (
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-[1400px] mx-auto">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    You're currently on the {currentUserPlan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} plan
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your subscription, update payment methods, or cancel your plan
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleManageSubscription}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Manage Subscription
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-20 pt-8 flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 max-w-[1200px]">
          {displayedPlans.map((plan, index) => {
            const price = billingPeriod === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
            const monthlyPrice = plan.pricing.monthly;
            const yearlyPrice = plan.pricing.yearly;
            const savings = getYearlySavings(monthlyPrice, yearlyPrice);
            // Determine upgrade vs downgrade relative to current plan
            const currentPlanObj = plans.find(p => p.slug === currentUserPlan);
            const currentPrice = currentPlanObj ? (billingPeriod === 'monthly' ? currentPlanObj.pricing.monthly : currentPlanObj.pricing.yearly) : null;
            const isUpgradeOption = currentPrice !== null && price !== null && price > currentPrice;
            const features = getFeaturesList(plan);
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative ${plan.display.isFeatured ? 'xl:scale-105 z-10' : ''}`}
              >
                <Card
                  className={`relative p-6 lg:p-8 h-full transition-all duration-500 border-2 flex flex-col ${
                    plan.display.isFeatured 
                      ? 'border-primary shadow-2xl shadow-primary/20 bg-gradient-to-b from-card to-card/95 backdrop-blur-sm' 
                      : 'border-border/50 hover:border-primary/30 shadow-lg hover:shadow-xl'
                  } ${
                    currentUserPlan === plan.slug ? 'ring-2 ring-primary ring-offset-4 ring-offset-background' : ''
                  } overflow-visible group hover:-translate-y-1`}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Current Plan Badge */}
                  {currentUserPlan === plan.slug && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                    >
                      <Badge className="px-4 py-1.5 bg-green-500 text-white border-0 shadow-lg font-medium">
                        Current Plan
                      </Badge>
                    </motion.div>
                  )}
                  
                  {/* Featured Badge */}
                  {plan.display.isFeatured && currentUserPlan !== plan.slug && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                    >
                      <Badge className="px-4 py-1.5 bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground border-0 shadow-lg font-medium">
                        <Star className="w-3 h-3 mr-1.5" fill="currentColor" />
                        Most Popular
                      </Badge>
                    </motion.div>
                  )}
                
                  {/* Plan Header */}
                  <div className="text-center mb-6 relative z-10 mt-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                      {getPlanIcon(plan.slug)}
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold mb-2 text-foreground">{plan.name}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm px-2">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-6 py-4 border-y border-border/50 relative z-10">
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent">
                        {formatPrice(price)}
                      </span>
                      {price !== null && price > 0 && (
                        <span className="text-muted-foreground text-lg">
                          /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'yearly' && savings > 0 && (
                      <motion.p 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Save {savings}% with annual billing
                      </motion.p>
                    )}
                    {plan.trial?.enabled && trialStatus.isEligible && currentUserPlan !== plan.slug && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-full text-xs font-medium"
                      >
                        <Gift className="w-3 h-3" />
                        {plan.trial.days}-day free trial included
                      </motion.div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-6 relative z-10 flex-grow">
                    {features.map((feature, featureIndex) => (
                      <motion.div 
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * featureIndex }}
                        className="flex items-start gap-3 text-sm"
                      >
                        {feature.included ? (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center mt-0.5">
                            <X className="w-3 h-3 text-muted-foreground/50" />
                          </div>
                        )}
                        <span className={`leading-relaxed ${feature.included ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                          {feature.text}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <div className="relative z-10 mt-auto pt-2">
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-4 text-base font-semibold transition-all duration-300 rounded-lg hover:scale-[1.02] ${
                        plan.display.isFeatured ? 'shadow-lg hover:shadow-xl' : ''
                      } ${
                        currentUserPlan === plan.slug ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                      variant={plan.display.isFeatured ? 'primary' : 'outline'}
                      disabled={currentUserPlan === plan.slug}
                    >
                      {(() => {
                        if (currentUserPlan === plan.slug) {
                          return (
                            <>
                              <span>Current Plan</span>
                              <span className="text-xs ml-2">(Manage in Settings)</span>
                            </>
                          );
                        }

                        if (plan.slug === 'org_enterprise') return 'Contact Sales';

                        if (plan.trial?.enabled && trialStatus.isEligible && currentUserPlan === 'individual_free') {
                          return 'Start Free Trial';
                        }

                        if (currentUserPlan && currentUserPlan !== 'individual_free') {
                          return isUpgradeOption ? 'Upgrade Plan' : 'Downgrade Plan';
                        }

                        return 'Upgrade Now';
                      })()}
                      {!currentUserPlan || currentUserPlan !== plan.slug ? (
                        <Sparkles className="w-4 h-4 ml-2 inline-flex" />
                      ) : null}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground mb-8 font-medium"
          >
            Trusted by professionals worldwide
          </motion.p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Bank-level Security</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">99.9% Uptime</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Star className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">24/7 Support</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about our pricing and plans
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {[
            {
              question: "Can I change plans anytime?",
              answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits."
            },
            {
              question: "What payment methods do you accept?",
              answer: "We accept all major credit cards (Visa, Mastercard, American Express) and ACH transfers for enterprise customers."
            },
            {
              question: "Is there a free trial?",
              answer: "Yes! New users get a free trial for eligible paid plans. No credit card required to start. Our Individual Free plan is also free forever with 1 hour per month."
            },
            {
              question: "How do team plans work?",
              answer: "Team plans allow multiple users to share a subscription. Admins can invite team members, manage permissions, and view consolidated analytics."
            }
          ].map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
              className="bg-gradient-to-br from-card to-card/95 backdrop-blur-sm rounded-2xl p-6 lg:p-8 hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/20 group"
            >
              <h3 className="text-lg lg:text-xl font-semibold mb-4 flex items-start gap-3 group-hover:text-primary transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                  <span className="text-primary text-sm font-bold">?</span>
                </div>
                {faq.question}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                {faq.answer}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
        <div className="container mx-auto px-4 py-20 lg:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
              Ready to transform your conversations?
            </h2>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-10 leading-relaxed">
              Join thousands of professionals using liveprompt.ai to have better conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button
                onClick={() => router.push('/auth/signup')}
                size="lg"
                className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              >
                Start Your Free Trial
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Free trial available • No credit card required • Cancel anytime
            </p>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}