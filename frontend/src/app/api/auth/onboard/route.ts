import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/auth/onboard - Handle user onboarding
 * 
 * Creates a default organization for the user and assigns them to the free plan
 * 
 * Request Body:
 * - organization_name?: string (optional, defaults to user's name + "'s Organization")
 * - timezone?: string (optional, defaults to UTC)
 * 
 * Returns:
 * - user: Updated user object
 * - organization: Created organization
 * - membership: Organization membership record
 * - subscription: Created subscription
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_name, timezone = 'UTC' } = body;

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Auth header:', authHeader);
    const token = authHeader?.split(' ')[1];
    console.log('🔑 Token (first 20 chars):', token?.substring(0, 20));
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('👤 User from token:', user?.id, user?.email);
    console.log('❌ Auth error:', authError);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to complete onboarding' },
        { status: 401 }
      );
    }

    // Use service role client for administrative operations
    const serviceClient = createServerSupabaseClient();
    
    // Check if user exists in users table
    const { data: existingUserData } = await serviceClient
      .from('users')
      .select('has_completed_onboarding, current_organization_id, full_name')
      .eq('id', user.id)
      .single();

    console.log('👤 Existing user query result:', { existingUserData });

    // If user record is missing (trigger might have failed), create a basic profile on the fly
    let userProfile = existingUserData;

    if (!userProfile) {
      console.warn('⚠️ User profile missing – attempting to create a new record for:', user.id);

      const { data: createdUser, error: createUserError } = await serviceClient
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
          has_completed_onboarding: false,
          has_completed_organization_setup: false
        })
        .select()
        .single();

      if (createUserError || !createdUser) {
        console.error('❌ Failed to auto-create user profile:', createUserError);
        return NextResponse.json(
          { error: 'Database error', message: 'Failed to create user profile. Please try again.' },
          { status: 500 }
        );
      }

      userProfile = createdUser;
    }

    // Use the userProfile object for the rest of the onboarding flow

    if (userProfile?.has_completed_onboarding) {
      return NextResponse.json(
        { error: 'Already onboarded', message: 'User has already completed onboarding' },
        { status: 400 }
      );
    }

    // Get the free plan (create if missing)
    let freePlan: any = null;
    const { data: fetchedPlan, error: planError } = await serviceClient
      .from('plans')
      .select('*')
      .eq('name', 'individual_free')
      .eq('is_active', true)
      .single();

    freePlan = fetchedPlan;

    if (planError || !freePlan) {
      console.warn('⚠️ Free plan not found – attempting to create default plan');

      const { data: createdPlan, error: createPlanError } = await serviceClient
        .from('plans')
        .insert({
          name: 'individual_free',
          display_name: 'Individual Free',
          description: 'Free plan with limited usage suitable for personal testing',
          plan_type: 'individual',
          price_monthly: null,
          price_yearly: null,
          monthly_audio_hours_limit: 3, // reasonable free limit
          max_documents_per_session: 10,
          max_file_size_mb: 25,
          max_sessions_per_month: 40,
          max_organization_members: 1,
          has_real_time_guidance: true,
          is_active: true,
          is_featured: false,
          sort_order: 0
        })
        .select()
        .single();

      if (createPlanError || !createdPlan) {
        console.error('❌ Failed to create default free plan:', createPlanError);
        return NextResponse.json(
          { error: 'Setup error', message: 'Free plan not available and failed to create default.' },
          { status: 500 }
        );
      }

      freePlan = createdPlan;
    }

    console.log('📋 Using free plan:', freePlan);

    // Generate organization name if not provided
    const userEmail = user.email || '';
    const defaultOrgName = organization_name || 
      (userProfile?.full_name ? `${userProfile.full_name}'s Organization` : 
       `${userEmail.split('@')[0]}'s Organization`);

    // Generate unique slug for organization
    const baseSlug = defaultOrgName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let organizationSlug = baseSlug;
    let slugCounter = 1;
    
    // Ensure slug is unique
    while (true) {
      const { data: existingOrg } = await serviceClient
        .from('organizations')
        .select('id')
        .eq('slug', organizationSlug)
        .single();
      
      if (!existingOrg) break;
      organizationSlug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Create organization
    const { data: organization, error: orgError } = await serviceClient
      .from('organizations')
      .insert({
        name: defaultOrgName,
        display_name: defaultOrgName,
        slug: organizationSlug,
        default_timezone: timezone,
        monthly_audio_hours_limit: freePlan?.monthly_audio_hours_limit ?? null,
        max_members: freePlan.max_organization_members || 1,
        max_sessions_per_month: freePlan.max_sessions_per_month,
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Create organization membership with owner role
    const { data: membership, error: membershipError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        monthly_audio_hours_limit: freePlan?.monthly_audio_hours_limit ?? null,
        max_sessions_per_month: freePlan.max_sessions_per_month
      })
      .select()
      .single();

    if (membershipError) {
      console.error('Membership creation error:', membershipError);
      // Clean up organization if membership fails
      await serviceClient.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create organization membership' },
        { status: 500 }
      );
    }

    // Create subscription for the organization
    const { data: subscription, error: subscriptionError } = await serviceClient
      .from('subscriptions')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        plan_id: freePlan.id,
        plan_type: 'monthly',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      // Clean up organization and membership if subscription fails
      await serviceClient.from('organization_members').delete().eq('id', membership.id);
      await serviceClient.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Update user to mark onboarding as complete and set current organization
    const { data: updatedUser, error: userUpdateError } = await serviceClient
      .from('users')
      .update({
        has_completed_onboarding: true,
        has_completed_organization_setup: true,
        current_organization_id: organization.id,
        timezone: timezone
      })
      .eq('id', user.id)
      .select()
      .single();

    if (userUpdateError) {
      console.error('User update error:', userUpdateError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Onboarding completed successfully',
      user: updatedUser,
      organization,
      membership,
      subscription
    }, { status: 200 });

  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
} 