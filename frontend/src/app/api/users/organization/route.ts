import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

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

    // First check the user's current_organization_id from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    console.log('🔍 User data query result:', { userData, userError, userId: user.id });

    if (userData?.current_organization_id) {
      console.log('✅ Found organization in user profile:', userData.current_organization_id);
      return NextResponse.json({
        organization_id: userData.current_organization_id
      });
    }

    // Fallback: Check organization_members for active memberships
    const { data: membershipData, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('role', { ascending: true }); // Owner role comes first

    console.log('🔍 Membership data query result:', { membershipData, membershipError });

    if (membershipData && membershipData.length > 0) {
      // Prefer owner role, otherwise take the first active membership
      const primaryOrg = membershipData.find(m => m.role === 'owner') || membershipData[0];
      console.log('✅ Found organization in memberships:', primaryOrg.organization_id);
      
      // Update the user's current_organization_id for future queries
      await supabase
        .from('users')
        .update({ current_organization_id: primaryOrg.organization_id })
        .eq('id', user.id);
      
      return NextResponse.json({
        organization_id: primaryOrg.organization_id
      });
    }

    // No organization found
    console.log('❌ No organization found for user:', user.id);
    return NextResponse.json({ error: 'No organization found' }, { status: 404 });

  } catch (error) {
    console.error('Error in organization endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 