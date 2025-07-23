import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { 
  Users, 
  Rocket, 
  CreditCard, 
  CheckCircle,
  TrendingUp,
  Clock,
  Shield,
  Zap
} from 'lucide-react';

interface TeamUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: {
    name: string;
    price: number;
  };
  teamPricing: {
    pricePerSeat: number;
    minimumSeats: number;
  };
}

export function TeamUpgradeModal({
  isOpen,
  onClose,
  currentPlan,
  teamPricing,
}: TeamUpgradeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgradeClick = () => {
    setIsLoading(true);
    router.push('/pricing');
  };

  const teamBenefits = [
    {
      icon: Users,
      title: 'Add Unlimited Team Members',
      description: 'Invite as many team members as you need',
    },
    {
      icon: CreditCard,
      title: 'Centralized Billing',
      description: 'One invoice for your entire team',
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Control permissions with admin and member roles',
    },
    {
      icon: Zap,
      title: 'Team Collaboration',
      description: 'Share conversations and insights across your team',
    },
    {
      icon: TrendingUp,
      title: 'Usage Analytics',
      description: 'Track team usage and productivity',
    },
    {
      icon: Clock,
      title: 'Priority Support',
      description: 'Get faster response times for your team',
    },
  ];

  const monthlyComparison = teamPricing.pricePerSeat * teamPricing.minimumSeats;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            <DialogTitle className="text-xl">Upgrade to Team Plan</DialogTitle>
          </div>
          <DialogDescription>
            Unlock collaboration features and manage your entire team from one account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pricing Comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Your Current Plan</p>
              <p className="text-2xl font-bold mt-1">${currentPlan.price}/month</p>
              <p className="text-sm text-muted-foreground mt-1">{currentPlan.name} (1 seat)</p>
            </div>
            
            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Team Plan</p>
                <Badge variant="default" className="text-xs">RECOMMENDED</Badge>
              </div>
              <p className="text-2xl font-bold mt-1">${teamPricing.pricePerSeat}/seat/month</p>
              <p className="text-sm text-muted-foreground mt-1">
                Starting at {teamPricing.minimumSeats} seats (${monthlyComparison}/month)
              </p>
            </div>
          </div>

          {/* Team Benefits */}
          <div>
            <h3 className="font-semibold mb-4">Team Plan Benefits</h3>
            <div className="grid gap-3">
              {teamBenefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{benefit.title}</p>
                      <p className="text-xs text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Offer */}
          <Alert className="border-primary/50 bg-primary/10">
            <CheckCircle className="h-4 w-4" />
            <div className="ml-2">
              <p className="text-sm font-medium">Volume Discounts Available</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contact us for custom pricing on 10+ seats
              </p>
            </div>
          </Alert>

          {/* Migration Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Seamless Migration</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Keep all your existing data and settings</li>
              <li>• Invite team members immediately after upgrade</li>
              <li>• Prorated billing for the current period</li>
              <li>• Cancel or adjust seats anytime</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleUpgradeClick}
            disabled={isLoading}
            className="gap-2"
          >
            <Rocket className="w-4 h-4" />
            View Team Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}