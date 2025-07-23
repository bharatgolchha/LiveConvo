import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Minus, 
  CreditCard, 
  Loader2,
  Info,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ManageSeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentSeats: number;
  usedSeats: number;
  subscription: {
    minimum_seats: number;
    maximum_seats: number | null;
    price_per_seat: number | null;
  } | null;
  isTeamBilling: boolean;
}

interface BillingPreview {
  current: {
    quantity: number;
    monthlyTotal: number;
  };
  proposed: {
    quantity: number;
    monthlyTotal: number;
  };
  changes: {
    quantityDifference: number;
    priceDifference: number;
    immediateCharge: number;
  };
  billing: {
    prorationExplanation: string;
  };
}

export function ManageSeatsModal({
  isOpen,
  onClose,
  onSuccess,
  currentSeats,
  usedSeats,
  subscription,
  isTeamBilling,
}: ManageSeatsModalProps) {
  const { session } = useAuth();
  const [newSeatCount, setNewSeatCount] = useState(currentSeats);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [billingPreview, setBillingPreview] = useState<BillingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNewSeatCount(currentSeats);
  }, [currentSeats, isOpen]);

  useEffect(() => {
    if (isOpen && newSeatCount !== currentSeats && isTeamBilling) {
      fetchBillingPreview();
    } else {
      setBillingPreview(null);
    }
  }, [newSeatCount, currentSeats, isOpen, isTeamBilling]);

  const fetchBillingPreview = async () => {
    if (!session?.access_token) return;

    setIsPreviewLoading(true);
    try {
      const response = await fetch(`/api/teams/billing/preview?newQuantity=${newSeatCount}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBillingPreview(data);
      }
    } catch (error) {
      console.error('Error fetching billing preview:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSeatChange = async () => {
    if (!session?.access_token || newSeatCount === currentSeats) return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = newSeatCount > currentSeats 
        ? '/api/teams/billing/add-seats'
        : '/api/teams/billing/remove-seats';

      const body = newSeatCount > currentSeats
        ? { additionalSeats: newSeatCount - currentSeats }
        : { seatsToRemove: currentSeats - newSeatCount };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update seats');
      }

      toast({
        title: 'Success',
        description: `Seats updated to ${newSeatCount}`,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error updating seats:', err);
      setError(err instanceof Error ? err.message : 'Failed to update seats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setNewSeatCount(currentSeats);
      setBillingPreview(null);
      setError(null);
      onClose();
    }
  };

  const canDecrease = newSeatCount > (subscription?.minimum_seats || 1) && newSeatCount > usedSeats;
  const canIncrease = !subscription?.maximum_seats || newSeatCount < subscription.maximum_seats;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isTeamBilling ? 'Manage Team Seats' : 'Upgrade to Team Plan'}
          </DialogTitle>
          <DialogDescription>
            {isTeamBilling 
              ? 'Adjust the number of seats for your team. Changes will be reflected in your next bill.'
              : 'Upgrade to a team plan to add more members and collaborate together.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm text-destructive ml-2">{error}</p>
            </Alert>
          )}

          {!isTeamBilling && (
            <Alert className="border-primary/50 bg-primary/10">
              <TrendingUp className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm font-medium">Team Plan Benefits</p>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                  <li>Add unlimited team members</li>
                  <li>Centralized billing</li>
                  <li>Team collaboration features</li>
                  <li>Volume discounts available</li>
                </ul>
              </div>
            </Alert>
          )}

          {/* Seat Selection */}
          <div className="space-y-3">
            <Label>Number of Seats</Label>
            
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setNewSeatCount(prev => prev - 1)}
                disabled={!canDecrease || isLoading}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                type="number"
                value={newSeatCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= (subscription?.minimum_seats || 1)) {
                    setNewSeatCount(value);
                  }
                }}
                className="w-24 text-center"
                min={subscription?.minimum_seats || 1}
                max={subscription?.maximum_seats || undefined}
                disabled={isLoading}
              />
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setNewSeatCount(prev => prev + 1)}
                disabled={!canIncrease || isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{usedSeats} seats in use</span>
              </div>
              {subscription?.minimum_seats && (
                <span>Min: {subscription.minimum_seats}</span>
              )}
              {subscription?.maximum_seats && (
                <span>Max: {subscription.maximum_seats}</span>
              )}
            </div>
          </div>

          {/* Billing Preview */}
          {billingPreview && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" />
                <span className="font-medium">Billing Preview</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current ({currentSeats} seats)</span>
                  <span>${billingPreview.current.monthlyTotal.toFixed(2)}/month</span>
                </div>
                
                <div className="flex justify-between font-medium">
                  <span>New ({newSeatCount} seats)</span>
                  <span>${billingPreview.proposed.monthlyTotal.toFixed(2)}/month</span>
                </div>
                
                {billingPreview.changes.immediateCharge > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Due today</span>
                    <span className="font-medium text-primary">
                      ${billingPreview.changes.immediateCharge.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                {billingPreview.billing.prorationExplanation}
              </p>
            </div>
          )}

          {isPreviewLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSeatChange}
            disabled={isLoading || newSeatCount === currentSeats}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                {isTeamBilling ? 'Update Seats' : 'Upgrade to Team'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}