import { createAuthenticatedSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's organization from their subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Subscription data query result:', { subscriptionData, subscriptionError, userId: user.id });

    if (subscriptionData?.organization_id) {
      console.log('✅ Found organization in subscription:', subscriptionData.organization_id);
      return NextResponse.json({
        organization_id: subscriptionData.organization_id
      });
    }

    // Fallback to user_organizations table
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (userOrg?.organization_id) {
      return NextResponse.json({
        organization_id: userOrg.organization_id
      });
    }

    // No organization found in either table
    console.log('No organization found for user:', user.id);
    return NextResponse.json({ error: 'No organization found' }, { status: 404 });

  } catch (error) {
    console.error('Error in organization endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 