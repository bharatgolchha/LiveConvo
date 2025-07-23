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
    const { organization_name, timezone = 'UTC', use_case, acquisition_source, referral_code, device_id, invitation_token } = body;

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
    console.log('🔧 Service client initialized');
    
    // Check if user exists in users table
    const { data: existingUserData } = await serviceClient
      .from('users')
      .select('has_completed_onboarding, current_organization_id, full_name, timezone, use_case, acquisition_source')
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

    // Handle invitation token if provided
    if (invitation_token) {
      console.log('🎫 Processing invitation token:', invitation_token);
      
      // Accept the invitation using the database function
      const { data: inviteResult, error: inviteError } = await serviceClient
        .rpc('process_team_invitation', {
          p_invitation_token: invitation_token,
          p_user_id: user.id
        });

      if (inviteError) {
        console.error('❌ Error processing invitation:', inviteError);
        return NextResponse.json(
          { error: 'Invalid invitation', message: inviteError.message },
          { status: 400 }
        );
      }

      if (inviteResult && inviteResult.length > 0 && inviteResult[0].success) {
        const result = inviteResult[0];
        
        // Update user to mark onboarding as complete
        const { data: updatedUser, error: userUpdateError } = await serviceClient
          .from('users')
          .update({
            has_completed_onboarding: true,
            has_completed_organization_setup: true,
            current_organization_id: result.organization_id,
            timezone: timezone,
            use_case: use_case || null,
            acquisition_source: acquisition_source || null,
            onboarding_completed_at: new Date().toISOString()
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

        // Get organization details
        const { data: organization } = await serviceClient
          .from('organizations')
          .select('*')
          .eq('id', result.organization_id)
          .single();

        // Get membership details
        const { data: membership } = await serviceClient
          .from('organization_members')
          .select('*')
          .eq('organization_id', result.organization_id)
          .eq('user_id', user.id)
          .single();

        return NextResponse.json({
          message: 'Successfully joined team via invitation',
          user: updatedUser,
          organization,
          membership,
          subscription: null, // Team member doesn't need individual subscription
          isInvited: true
        }, { status: 200 });
      }
    }

    // ALWAYS check if user already has an organization membership first
    // This prevents creating duplicate organizations
    const { data: existingMemberships } = await serviceClient
      .from('organization_members')
      .select('organization_id, role, status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (existingMemberships && existingMemberships.length > 0) {
      // User already has active organization memberships
      // Update user to mark onboarding as complete with their existing organization
      const primaryOrg = existingMemberships.find(m => m.role === 'owner') || existingMemberships[0];
      
      const { data: updatedUser, error: userUpdateError } = await serviceClient
        .from('users')
        .update({
          has_completed_onboarding: true,
          has_completed_organization_setup: true,
          current_organization_id: userProfile?.current_organization_id || primaryOrg.organization_id,
          timezone: timezone || userProfile?.timezone || 'UTC',
          use_case: use_case || userProfile?.use_case || null,
          acquisition_source: acquisition_source || userProfile?.acquisition_source || null,
          onboarding_completed_at: new Date().toISOString()
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

      // Get organization details
      const { data: organization } = await serviceClient
        .from('organizations')
        .select('*')
        .eq('id', primaryOrg.organization_id)
        .single();

      return NextResponse.json({
        message: 'Onboarding completed with existing organization',
        user: updatedUser,
        organization,
        membership: primaryOrg,
        subscription: null // Existing org should already have subscription
      }, { status: 200 });
    }

    // If user has already completed onboarding and has no active memberships,
    // just mark onboarding as complete and return success
    if (userProfile?.has_completed_onboarding) {
      return NextResponse.json({
        message: 'User already completed onboarding',
        user: userProfile,
        organization: null,
        membership: null,
        subscription: null
      }, { status: 200 });
    }
    
    // Check if user already owns an organization (even if not marked as onboarded)
    const { data: existingOwnedOrg } = await serviceClient
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      // No status filter to detect any ownership status
      .single();
    
    if (existingOwnedOrg) {
      // User already owns an organization, just complete onboarding
      const { data: updatedUser, error: userUpdateError } = await serviceClient
        .from('users')
        .update({
          has_completed_onboarding: true,
          has_completed_organization_setup: true,
          current_organization_id: existingOwnedOrg.organization_id,
          timezone: timezone || userProfile?.timezone || 'UTC',
          use_case: use_case || userProfile?.use_case || null,
          acquisition_source: acquisition_source || userProfile?.acquisition_source || null,
          onboarding_completed_at: new Date().toISOString()
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
        message: 'Onboarding completed with existing owned organization',
        user: updatedUser,
        organization: existingOwnedOrg.organizations,
        membership: existingOwnedOrg,
        subscription: null
      }, { status: 200 });
    }

    // Get the free plan (create if missing)
    let freePlan: Record<string, unknown> | null = null;
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

    // Check if user already owns an organization (to avoid duplicate ownership error)
    const { data: existingOwnedOrgs } = await serviceClient
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        organizations (
          id,
          name,
          slug,
          display_name,
          default_timezone,
          monthly_audio_hours_limit,
          max_members,
          max_sessions_per_month,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('role', 'owner')
      // Allow any status to detect ownership and avoid duplicate owner constraint
      .order('created_at', { ascending: false });

    let organization;
    let membership;
    
    if (existingOwnedOrgs && existingOwnedOrgs.length > 0) {
      // User already owns an organization, use the existing one
      console.log('🏢 User already owns an organization, using existing one');
      const existingOwnership = existingOwnedOrgs[0];
      // Cast to any due to type inference limitations of joined column
      organization = existingOwnership.organizations as unknown as Record<string, unknown>;
      
      // Get the actual membership record
      const { data: existingMembership } = await serviceClient
        .from('organization_members')
        .select('*')
        .eq('organization_id', existingOwnership.organization_id)
        .eq('user_id', user.id)
        .single();
        
      membership = existingMembership || {
        organization_id: existingOwnership.organization_id,
        user_id: user.id,
        role: existingOwnership.role,
        status: existingOwnership.status
      };
      
      // Update organization name if provided
      if (organization_name && organization_name !== organization.name) {
        const { data: updatedOrg, error: updateError } = await serviceClient
          .from('organizations')
          .update({
            name: organization_name,
            display_name: organization_name,
            default_timezone: timezone || organization.default_timezone
          })
          .eq('id', organization.id)
          .select()
          .single();
          
        if (!updateError && updatedOrg) {
          organization = updatedOrg;
          console.log('✅ Updated existing organization name to:', organization_name);
        }
      }
    } else {
      // No existing organization, create a new one
      // Generate organization name if not provided
      const userEmail = user.email || '';
      const defaultOrgName = organization_name || 
        (userProfile?.full_name ? `${userProfile.full_name}'s Organization` : 
         `${userEmail.split('@')[0]}'s Organization`);

      // Generate unique slug for organization
      const baseSlug = defaultOrgName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50); // Limit length
      
      let organizationSlug = baseSlug || 'org';
      let slugCounter = 1;
      
      // Ensure slug is unique
      while (true) {
        const { data: existingOrg } = await serviceClient
          .from('organizations')
          .select('id')
          .eq('slug', organizationSlug)
          .single();
        
        if (!existingOrg) break;
        
        // Use timestamp for better uniqueness
        organizationSlug = `${baseSlug}-${Date.now()}-${slugCounter}`;
        slugCounter++;
        
        // Safety check to prevent infinite loop
        if (slugCounter > 100) {
          organizationSlug = `org-${user.id.substring(0, 8)}-${Date.now()}`;
          break;
        }
      }

      // Create organization
      console.log('📦 Creating organization with data:', {
        name: defaultOrgName,
        display_name: defaultOrgName,
        slug: organizationSlug,
        default_timezone: timezone,
        monthly_audio_hours_limit: freePlan?.monthly_audio_hours_limit ?? null,
        max_members: freePlan?.max_organization_members || 1,
        max_sessions_per_month: freePlan?.max_sessions_per_month || null,
        is_active: true
      });
      
      let newOrganization;
      let orgInsertError;
      let insertAttempts = 0;
      let currentSlug = organizationSlug;

      // Retry up to 5 times in case of slug clashes
      while (insertAttempts < 5) {
        const { data: orgData, error: insertError } = await serviceClient
          .from('organizations')
          .insert({
            name: defaultOrgName,
            display_name: defaultOrgName,
            slug: currentSlug,
            default_timezone: timezone,
            monthly_audio_hours_limit: freePlan?.monthly_audio_hours_limit ?? null,
            max_members: freePlan?.max_organization_members || 1,
            max_sessions_per_month: freePlan?.max_sessions_per_month || null,
            is_active: true
          })
          .select()
          .single();

        if (!insertError) {
          newOrganization = orgData;
          break;
        }

        // If slug duplicate, regenerate and retry
        if (insertError.code === '23505') {
          insertAttempts++;
          currentSlug = `${baseSlug}-${Date.now()}-${insertAttempts}`;
          console.warn(`⚠️ Duplicate slug detected. Retrying with slug: ${currentSlug}`);
          continue;
        }

        // Any other error – abort
        orgInsertError = insertError;
        break;
      }

      if (!newOrganization) {
        console.error('❌ Organization creation error:', {
          error: orgInsertError,
          organizationData: {
            name: defaultOrgName,
            slug: currentSlug,
            timezone: timezone
          }
        });
        return NextResponse.json(
          { 
            error: 'Database error', 
            message: `Failed to create organization: ${orgInsertError?.message || 'Unknown error'}`,
            details: orgInsertError?.details || orgInsertError?.hint || null,
            code: orgInsertError?.code
          },
          { status: 500 }
        );
      }

      organization = newOrganization;

      // Create organization membership with owner role
      const { data: newMembership, error: membershipError } = await serviceClient
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          monthly_audio_hours_limit: freePlan?.monthly_audio_hours_limit ?? null,
          max_sessions_per_month: freePlan?.max_sessions_per_month || null
        })
        .select()
        .single();

      if (membershipError) {
        console.error('Membership creation error:', membershipError);

        // Handle specific case where user already owns an organization (constraint violation)
        if (membershipError.code === 'P0001') {
          // Clean up the newly created organization since it won't be used
          await serviceClient.from('organizations').delete().eq('id', organization.id);

          // Fetch the existing owner membership and organization
          const { data: existingOwnerMembership } = await serviceClient
            .from('organization_members')
            .select('*, organizations(*)')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .order('created_at', { ascending: false })
            .single();

          if (existingOwnerMembership) {
            membership = existingOwnerMembership;
            organization = existingOwnerMembership.organizations as Record<string, unknown>;
            console.log('ℹ️ Fallback to existing organization after ownership constraint violation');
          } else {
            return NextResponse.json(
              { error: 'Database error', message: 'Failed to create organization membership' },
              { status: 500 }
            );
          }
        } else {
          // Clean up organization if membership fails for other reasons
          await serviceClient.from('organizations').delete().eq('id', organization.id);
          return NextResponse.json(
            { error: 'Database error', message: 'Failed to create organization membership' },
            { status: 500 }
          );
        }
      }
      
      membership = newMembership;
    }

    // Check if user already has a subscription (e.g., from Stripe webhook)
    // Include incomplete status as this happens when checkout completes but before webhook confirms
    const { data: existingSubscription } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'incomplete'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    let subscription = existingSubscription;
    
    // Only create a Free subscription if user doesn't already have one
    if (!existingSubscription) {
      const { data: newSubscription, error: subscriptionError } = await serviceClient
        .from('subscriptions')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          plan_id: freePlan?.id || null,
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
      
      subscription = newSubscription;
    } else {
      console.log('User already has an active subscription, skipping Free plan creation');
      console.log('Existing subscription details:', {
        id: existingSubscription.id,
        status: existingSubscription.status,
        plan_id: existingSubscription.plan_id,
        organization_id: existingSubscription.organization_id
      });
      
      // Always update the existing subscription with the new organization_id
      // This is crucial for users who complete checkout before onboarding
      const { error: updateSubError } = await serviceClient
        .from('subscriptions')
        .update({ 
          organization_id: organization.id,
          // Also update status to active if it was incomplete and payment went through
          status: existingSubscription.status === 'incomplete' ? 'active' : existingSubscription.status
        })
        .eq('id', existingSubscription.id);
        
      if (updateSubError) {
        console.error('Failed to update subscription with organization_id:', updateSubError);
      } else {
        console.log('Successfully linked subscription to organization:', organization.id);
      }
      
      // Update the subscription object for the response
      existingSubscription.organization_id = organization.id;
      if (existingSubscription.status === 'incomplete') {
        existingSubscription.status = 'active';
      }
    }

    // Process referral code if provided
    if (referral_code) {
      try {
        // Get IP address from request headers
        const forwarded = request.headers.get('x-forwarded-for');
        const ip_address = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || null;
        
        const { data: referralProcessed } = await serviceClient
          .rpc('process_referral_code', {
            p_user_id: user.id,
            p_referral_code: referral_code,
            p_device_id: device_id || null,
            p_ip_address: ip_address
          });
        
        console.log('Referral processing result:', referralProcessed);
      } catch (referralError) {
        console.error('Error processing referral during onboarding:', referralError);
        // Don't fail onboarding if referral processing fails
      }
    }

    // Update user to mark onboarding as complete and set current organization
    const { data: updatedUser, error: userUpdateError } = await serviceClient
      .from('users')
      .update({
        has_completed_onboarding: true,
        has_completed_organization_setup: true,
        current_organization_id: organization.id,
        timezone: timezone,
        use_case: use_case || null,
        acquisition_source: acquisition_source || null,
        onboarding_completed_at: new Date().toISOString()
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