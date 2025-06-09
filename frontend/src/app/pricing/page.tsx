'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Sparkles, Zap, Shield, Star, Mic, Search, Bell, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
  display: {
    isFeatured: boolean;
    sortOrder: number;
  };
}

const featureLabels = {
  hasRealTimeGuidance: 'Real-time AI guidance',
  hasAdvancedSummaries: 'Advanced summaries',
  hasExportOptions: 'Export to multiple formats',
  hasEmailSummaries: 'Email summaries',
  hasApiAccess: 'API access',
  hasCustomTemplates: 'Custom templates',
  hasPrioritySupport: 'Priority support',
  hasAnalyticsDashboard: 'Analytics dashboard',
  hasTeamCollaboration: 'Team collaboration'
};

export default function PricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    fetchPricingPlans();
    if (user) {
      fetchUserPlan();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  const fetchPricingPlans = async () => {
    try {
      const response = await fetch('/api/pricing');
      if (!response.ok) throw new Error('Failed to fetch pricing');
      const data = await response.json();
      console.log('Fetched pricing plans:', data.plans);
      setPlans(data.plans);
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPlan = async () => {
    try {
      // Get the session to have the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('fetchUserPlan: No session found');
        return;
      }

      const response = await fetch('/api/users/subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('fetchUserPlan: API response:', data);
        console.log('fetchUserPlan: Setting currentUserPlan to:', data.plan.name);
        setCurrentUserPlan(data.plan.name);
      } else {
        console.log('fetchUserPlan: API response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free';
    return `$${price}`;
  };

  const getYearlySavings = (monthly: number | null, yearly: number | null) => {
    if (!monthly || !yearly) return 0;
    const monthlyTotal = monthly * 12;
    const savings = ((monthlyTotal - yearly) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  const handleSelectPlan = (plan: PricingPlan) => {
    if (plan.slug === 'individual_free') {
      router.push('/auth/signup');
    } else if (plan.slug === 'org_enterprise') {
      router.push('/contact');
    } else {
      router.push(`/auth/signup?plan=${plan.slug}&billing=${billingPeriod}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header for logged-in users */}
      {user && (
        <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo and Title */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <img 
                src={resolvedTheme === 'dark' 
                  ? "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/dark.png"
                  : "https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/light.png"
                }
                alt="liveprompt.ai"
                className="w-8 h-8 object-contain"
              />
            </Link>
            
            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-foreground">
                    {user.email?.split('@')[0]}
                  </span>
                </button>
                
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-56 rounded-lg bg-card border shadow-lg overflow-hidden"
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
      <div className="relative">
        <div className="container mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Limited Time Offer</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Start free and upgrade as you grow. No hidden fees, no surprises.
            </p>
            
            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="inline-flex items-center p-1.5 bg-muted/50 backdrop-blur-sm rounded-full border border-border/50"
            >
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-8 py-3 rounded-full font-medium transition-all duration-300 ${
                  billingPeriod === 'monthly'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-8 py-3 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingPeriod === 'yearly'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Save 17%</Badge>
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-24">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
            const monthlyPrice = plan.pricing.monthly;
            const yearlyPrice = plan.pricing.yearly;
            const savings = getYearlySavings(monthlyPrice, yearlyPrice);
            
            console.log(`Plan: ${plan.name}, Slug: ${plan.slug}, Current User Plan: ${currentUserPlan}, Comparison: ${currentUserPlan === plan.slug}`);
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: plan.display.sortOrder * 0.1 }}
                className="w-full max-w-sm"
              >
                <Card
                  className={`relative p-8 h-full hover:shadow-2xl transition-all duration-300 border-2 ${
                    plan.display.isFeatured 
                      ? 'border-primary shadow-xl shadow-primary/10 scale-105' 
                      : 'border-border hover:border-primary/50'
                  } ${
                    currentUserPlan === plan.slug ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  {currentUserPlan === plan.slug && (
                    <div className="absolute -top-4 right-4">
                      <Badge className="px-3 py-1 bg-green-500 text-white border-0 shadow-md">
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  {plan.display.isFeatured && currentUserPlan !== plan.slug && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="px-4 py-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg">
                        <Star className="w-3 h-3 mr-1" fill="currentColor" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      {plan.slug === 'individual_free' ? (
                        <Zap className="w-6 h-6 text-primary" />
                      ) : (
                        <Shield className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="text-center mb-8 py-6 border-y border-border">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold tracking-tight">{formatPrice(price)}</span>
                      {price !== null && price > 0 && (
                        <span className="text-muted-foreground text-lg">
                          /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'yearly' && savings > 0 && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium"
                      >
                        ✨ Save {savings}% with annual billing
                      </motion.p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="mb-6 p-4 rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">
                        {plan.limits.monthlyAudioHours
                          ? plan.limits.monthlyAudioHours < 1 
                            ? `${plan.limits.monthlyAudioHours * 60} minutes/month`
                            : `${plan.limits.monthlyAudioHours} ${plan.limits.monthlyAudioHours === 1 ? 'hour' : 'hours'}/month`
                          : 'Unlimited audio hours'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">
                        {plan.limits.maxSessionsPerMonth
                          ? `${plan.limits.maxSessionsPerMonth} sessions/month`
                          : 'Unlimited sessions'}
                      </span>
                    </div>
                    {plan.type === 'organization' && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          {plan.limits.maxOrganizationMembers
                            ? `Up to ${plan.limits.maxOrganizationMembers} team members`
                            : 'Unlimited team members'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {Object.entries(plan.features).map(([key, value]) => {
                      const label = featureLabels[key as keyof typeof featureLabels];
                      if (!label) return null;
                      
                      return (
                        <div key={key} className="flex items-center gap-3 text-sm group">
                          {value ? (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                          )}
                          <span className={`transition-colors ${value ? 'group-hover:text-primary' : 'text-muted-foreground/60'}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-6 text-base font-semibold transition-all duration-300 ${
                      plan.display.isFeatured 
                        ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:-translate-y-0.5' 
                        : 'hover:shadow-md hover:-translate-y-0.5'
                    }`}
                    variant={plan.display.isFeatured ? 'primary' : 'outline'}
                    disabled={currentUserPlan === plan.slug}
                  >
                    {currentUserPlan === plan.slug ? 'Current Plan' :
                     plan.slug === 'org_enterprise' ? 'Contact Sales' : 
                     plan.slug === 'individual_free' ? 'Get Started' : 'Upgrade Now'}
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-8">Trusted by professionals worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Bank-level Security</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Zap className="w-5 h-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Star className="w-5 h-5" />
              <span className="text-sm font-medium">24/7 Support</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Everything you need to know about our pricing and plans
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-muted/30 rounded-lg p-6 hover:bg-muted/50 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">?</span>
              </div>
              Can I change plans anytime?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we&apos;ll prorate any charges or credits.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-muted/30 rounded-lg p-6 hover:bg-muted/50 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">?</span>
              </div>
              What payment methods do you accept?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We accept all major credit cards (Visa, Mastercard, American Express) and ACH transfers for enterprise customers.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-muted/30 rounded-lg p-6 hover:bg-muted/50 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">?</span>
              </div>
              Is there a free trial?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Our Starter plan is free forever with 1 hour per month. For paid plans, we offer a 14-day money-back guarantee.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-muted/30 rounded-lg p-6 hover:bg-muted/50 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">?</span>
              </div>
              How do team plans work?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Team plans allow multiple users to share a subscription. Admins can invite team members, manage permissions, and view consolidated analytics.
            </p>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to transform your conversations?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of professionals using liveprompt.ai to have better conversations.
            </p>
            <Button
              onClick={() => router.push('/auth/signup')}
              size="lg"
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              Start Your Free Trial
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 14-day money-back guarantee
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}