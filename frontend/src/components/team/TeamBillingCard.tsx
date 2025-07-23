import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Users, 
  Plus, 
  Minus, 
  Calendar,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ManageSeatsModal } from './ManageSeatsModal';

interface TeamBillingCardProps {
  subscription: {
    plan_name: string;
    billing_type: string;
    supports_team_billing: boolean;
    price_per_seat: number | null;
    team_discount: number | null;
    next_billing_date: string;
    minimum_seats: number;
    maximum_seats: number | null;
  } | null;
  seatUsage: {
    total_seats: number;
    used_seats: number;
    available_seats: number;
    pending_invitations: number;
  };
  permissions: {
    can_change_billing: boolean;
  };
  onRefresh: () => void;
}

export function TeamBillingCard({ 
  subscription, 
  seatUsage, 
  permissions,
  onRefresh 
}: TeamBillingCardProps) {
  const [isManageSeatsOpen, setIsManageSeatsOpen] = useState(false);
  
  const isTeamBilling = subscription?.billing_type === 'team_seats';
  const seatUtilization = (seatUsage.used_seats / seatUsage.total_seats) * 100;
  
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-warning';
    return 'text-primary';
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Billing & Seats</h2>
            </div>
            
            {subscription && (
              <Badge variant="secondary" className="font-medium">
                {subscription.plan_name}
              </Badge>
            )}
          </div>

          {isTeamBilling ? (
            <>
              {/* Seat Usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Seat Usage</span>
                  <span className={`font-medium ${getUtilizationColor(seatUtilization)}`}>
                    {seatUsage.used_seats} / {seatUsage.total_seats} seats
                  </span>
                </div>
                
                <Progress value={seatUtilization} className="h-2" />
                
                {seatUsage.pending_invitations > 0 && (
                  <p className="text-xs text-muted-foreground">
                    + {seatUsage.pending_invitations} pending {seatUsage.pending_invitations === 1 ? 'invitation' : 'invitations'}
                  </p>
                )}
              </div>

              {/* Pricing Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price per seat</span>
                  <span className="font-medium">
                    ${subscription.price_per_seat?.toFixed(2) || '0'}/month
                  </span>
                </div>
                
                {subscription.team_discount && subscription.team_discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Team discount</span>
                    <Badge variant="secondary" className="text-green-600">
                      {subscription.team_discount}% off
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Monthly total</span>
                  <span className="font-semibold text-lg">
                    ${((subscription.price_per_seat || 0) * seatUsage.total_seats).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Seat Management */}
              {permissions.can_change_billing && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsManageSeatsOpen(true)}
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Manage Seats
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Individual Billing */}
              <div className="space-y-3">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    This organization is on an individual plan. 
                    {subscription?.supports_team_billing && ' Upgrade to a team plan to add more members.'}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">
                      {seatUsage.used_seats} / {seatUsage.total_seats} member
                    </span>
                  </div>
                </div>

                {permissions.can_change_billing && subscription?.supports_team_billing && (
                  <Button
                    onClick={() => setIsManageSeatsOpen(true)}
                    size="sm"
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Upgrade to Team Plan
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Next Billing Date */}
          {subscription && (
            <div className="flex items-center justify-between pt-4 border-t text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Next billing</span>
              </div>
              <span className="font-medium">
                {format(new Date(subscription.next_billing_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
      </Card>

      <ManageSeatsModal
        isOpen={isManageSeatsOpen}
        onClose={() => setIsManageSeatsOpen(false)}
        onSuccess={onRefresh}
        currentSeats={seatUsage.total_seats}
        usedSeats={seatUsage.used_seats}
        subscription={subscription}
        isTeamBilling={isTeamBilling}
      />
    </>
  );
}