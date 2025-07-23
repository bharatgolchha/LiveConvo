'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { trackConversion } from '@/lib/analytics/tracking';
import { supabase } from '@/lib/supabase';

interface CheckoutSession {
  id: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  customer_email: string;
  subscription?: {
    id: string;
    items: {
      data: Array<{
        price: {
          id: string;
          recurring?: {
            interval: string;
          };
        };
      }>;
    };
  };
}

export function CheckoutSuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    const processCheckoutSuccess = async () => {
      if (!sessionId || hasProcessed) return;

      const processedKey = `checkout_processed_${sessionId}`;
      if (localStorage.getItem(processedKey)) {
        return;
      }

      setIsProcessing(true);

      try {
        // Get the current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No auth session found');
          return;
        }

        const response = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to retrieve checkout session');
        }

        const checkoutSession: CheckoutSession = await response.json();

        if (checkoutSession.payment_status === 'processing') {
          // Retry after 2 seconds
          setTimeout(() => {
            setHasProcessed(false);
          }, 2000);
          return;
        }

        if (checkoutSession.payment_status === 'paid') {
          const amountInDollars = checkoutSession.amount_total / 100;
          const subscriptionInterval = checkoutSession.subscription?.items.data[0]?.price.recurring?.interval;
          const planName = subscriptionInterval === 'year' 
            ? 'Annual Subscription' 
            : 'Monthly Subscription';

          // Track conversion with our utility
          trackConversion({
            value: amountInDollars,
            currency: checkoutSession.currency.toUpperCase(),
            transaction_id: checkoutSession.id,
            items: [
              {
                item_id: checkoutSession.subscription?.items.data[0]?.price.id || 'unknown',
                item_name: planName,
                price: amountInDollars,
                quantity: 1,
              },
            ],
          });

          localStorage.setItem(processedKey, 'true');

          toast.success(
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-semibold">Welcome to livePrompt Pro!</p>
                <p className="text-sm text-muted-foreground">Your subscription is now active.</p>
              </div>
            </div>,
            {
              duration: 5000,
            }
          );

          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          router.replace(url.pathname + url.search);
        }
      } catch (error) {
        console.error('Error processing checkout success:', error);
      } finally {
        setIsProcessing(false);
        setHasProcessed(true);
      }
    };

    processCheckoutSuccess();
  }, [sessionId, router, hasProcessed]);

  return null;
}