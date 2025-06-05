import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, Zap, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
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

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [currentUserPlan, setCurrentUserPlan] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchPricingPlans();
      fetchUserPlan();
    }
  }, [isOpen]);

  const fetchPricingPlans = async () => {
    try {
      const response = await fetch('/api/pricing');
      if (!response.ok) throw new Error('Failed to fetch pricing');
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPlan = async () => {
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
        setCurrentUserPlan(data.plan.name);
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
    onClose(); // Close modal first
    
    if (plan.slug === 'individual_free') {
      router.push('/auth/signup');
    } else if (plan.slug === 'org_enterprise') {
      router.push('/contact');
    } else {
      router.push(`/auth/signup?plan=${plan.slug}&billing=${billingPeriod}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card rounded-2xl border border-border shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="bg-card border-b border-border p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Upgrade Your Plan
                </h2>
                <p className="text-muted-foreground text-sm">
                  Choose the perfect plan for your needs. No hidden fees, cancel anytime.
                </p>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Billing Toggle */}
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center p-1 bg-muted/50 rounded-full border border-border/50">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-1.5 rounded-full font-medium transition-all duration-300 text-xs ${
                    billingPeriod === 'monthly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-4 py-1.5 rounded-full font-medium transition-all duration-300 flex items-center gap-1 text-xs ${
                    billingPeriod === 'yearly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Yearly
                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">17%</Badge>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading pricing...</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-4 max-w-3xl mx-auto">
                {plans.filter(plan => plan.slug !== 'individual_free').map((plan) => {
                  const price = billingPeriod === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
                  const monthlyPrice = plan.pricing.monthly;
                  const yearlyPrice = plan.pricing.yearly;
                  const savings = getYearlySavings(monthlyPrice, yearlyPrice);
                  
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: plan.display.sortOrder * 0.1 }}
                    >
                      <Card
                        className={`relative p-4 hover:shadow-xl transition-all duration-300 border-2 w-full max-w-xs ${
                          plan.display.isFeatured 
                            ? 'border-primary shadow-xl shadow-primary/20 scale-105 bg-gradient-to-b from-card to-card/80' 
                            : 'border-border hover:border-primary/50 hover:shadow-lg'
                        } ${
                          currentUserPlan === plan.slug ? 'ring-2 ring-green-500 ring-offset-2 border-green-500' : ''
                        }`}
                      >
                        {currentUserPlan === plan.slug && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <Badge className="px-3 py-1.5 bg-green-500 text-white border-0 shadow-lg text-sm font-semibold">
                              ✓ Current Plan
                            </Badge>
                          </div>
                        )}
                        {plan.display.isFeatured && currentUserPlan !== plan.slug && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                            <Badge className="px-4 py-1.5 bg-primary text-primary-foreground border-0 shadow-lg text-sm font-semibold">
                              <Star className="w-4 h-4 mr-1" fill="currentColor" />
                              Recommended
                            </Badge>
                          </div>
                        )}
                      
                        <div className="text-center mb-4">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mb-2">
                            {plan.slug === 'individual_free' ? (
                              <Zap className="w-4 h-4 text-primary" />
                            ) : (
                              <Shield className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <h3 className="text-lg font-bold mb-1 text-foreground">{plan.name}</h3>
                          <p className="text-muted-foreground text-xs">{plan.description}</p>
                        </div>

                        <div className="text-center mb-4 py-3 border-y border-border bg-muted/20 -mx-4 px-4">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-2xl font-bold tracking-tight text-foreground">{formatPrice(price)}</span>
                            {price !== null && price > 0 && (
                              <span className="text-muted-foreground text-sm">
                                /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                              </span>
                            )}
                          </div>
                          {billingPeriod === 'yearly' && savings > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✨ Save {savings}%
                            </p>
                          )}
                        </div>

                        {/* Key Features - Show only top 3 to save space */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs text-foreground">
                            <Check className="w-3 h-3 text-primary flex-shrink-0" />
                            <span>
                              {plan.limits.monthlyAudioHours
                                ? `${plan.limits.monthlyAudioHours} hours/month`
                                : 'Unlimited hours'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-foreground">
                            <Check className="w-3 h-3 text-primary flex-shrink-0" />
                            <span>
                              {plan.limits.maxSessionsPerMonth
                                ? `${plan.limits.maxSessionsPerMonth} sessions/month`
                                : 'Unlimited sessions'}
                            </span>
                          </div>
                          {Object.entries(plan.features).slice(0, 2).map(([key, value]) => {
                            const label = featureLabels[key as keyof typeof featureLabels];
                            if (!label || !value) return null;
                            
                            return (
                              <div key={key} className="flex items-center gap-2 text-xs text-foreground">
                                <Check className="w-3 h-3 text-primary flex-shrink-0" />
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>

                        <Button
                          onClick={() => handleSelectPlan(plan)}
                          className="w-full py-2 text-xs font-semibold"
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
            )}

            {/* Trust Section */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span className="text-xs">Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span className="text-xs">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 