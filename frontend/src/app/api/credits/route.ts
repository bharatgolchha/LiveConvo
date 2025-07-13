import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();
    
    // Get authenticated user using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get credit transactions
    let transactions = [];
    let balance = 0;
    let expiringAmount = 0;
    
    try {
      const { data, error: transactionsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!transactionsError && data) {
        transactions = data;
        
        // Calculate balance manually - exclude expired and future credits
        const now = new Date();
        balance = data.reduce((acc, credit) => {
          // Skip expired credits
          if (credit.expires_at && new Date(credit.expires_at) < now) {
            return acc;
          }
          
          // Skip future credits (scheduled but not yet available)
          if (credit.created_at && new Date(credit.created_at) > now) {
            return acc;
          }
          
          if (credit.type === 'redemption') {
            return acc - credit.amount;
          }
          return acc + credit.amount;
        }, 0);
        
        // Calculate expiring credits
        const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        expiringAmount = data
          .filter(c => 
            c.type === 'referral_reward' && 
            c.expires_at && 
            new Date(c.expires_at) > now &&
            new Date(c.expires_at) <= fourteenDaysFromNow
          )
          .reduce((sum, credit) => sum + credit.amount, 0);
      }
    } catch (err) {
      console.log('Error fetching credits:', err);
    }

    return NextResponse.json({
      balance,
      expiring_soon: expiringAmount,
      transactions: transactions || []
    });

  } catch (error) {
    console.error('Error in credits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}