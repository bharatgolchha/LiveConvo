import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/usage/check-limit - Check if user can continue recording based on plan limits
 * 
 * Returns:
 * - can_record: boolean - Whether the user can continue recording
 * - minutes_used: number - Minutes used in current month
 * - minutes_limit: number - Monthly minute limit from plan
 * - minutes_remaining: number - Minutes remaining in current month
 * - percentage_used: number - Percentage of limit used
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to check usage' },
        { status: 401 }
      );
    }
    
    // Create authenticated client for user validation
    const authSupabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to check usage' },
        { status: 401 }
      );
    }

    // Get user's current organization using service role client (bypasses RLS)
    const serviceClient = createServerSupabaseClient();
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Call the check_usage_limit function using service client
    const { data, error } = await serviceClient
      .rpc('check_usage_limit', {
        p_user_id: user.id,
        p_organization_id: userData.current_organization_id
      });

    if (error) {
      console.error('Database error checking usage limit:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    // Log the raw data for debugging
    console.log('Raw usage limit data from DB:', data);

    // Return the usage data - handle NULL values properly
    const usageData = data?.[0] || {};
    
    // Handle unlimited plans (null limits)
    const isUnlimited = usageData.is_unlimited === true || usageData.minutes_limit === null;
    
    // Ensure we always return a boolean for can_record
    const response = {
      // Reason: usageData.can_record may be undefined when the RPC returns no rows.
      // In that case, default to true so users are not blocked unnecessarily.
      can_record: typeof usageData.can_record === 'boolean' ? usageData.can_record : true,
      minutes_used: usageData.minutes_used ?? 0,
      minutes_limit: isUnlimited ? null : (usageData.minutes_limit ?? 600), // Return null for unlimited plans
      minutes_remaining: isUnlimited ? null : (usageData.minutes_remaining ?? 600),
      percentage_used: usageData.percentage_used ?? 0,
      is_unlimited: isUnlimited
    };

    console.log('Processed usage data:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Usage check API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to check usage limit' },
      { status: 500 }
    );
  }
}