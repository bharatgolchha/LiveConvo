import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to check usage' },
        { status: 401 }
      );
    }

    // Get user's current organization
    const { data: userData, error: userError } = await supabase
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

    // Call the check_usage_limit function
    const { data, error } = await supabase
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
    
    const response = {
      can_record: usageData.can_record !== null ? usageData.can_record : true,
      minutes_used: usageData.minutes_used || 0,
      minutes_limit: usageData.minutes_limit || 600, // Default 10 hours
      minutes_remaining: usageData.minutes_remaining || 600,
      percentage_used: usageData.percentage_used || 0
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