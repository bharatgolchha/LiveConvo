import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {

    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching pricing plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pricing plans' },
        { status: 500 }
      );
    }

    // Transform the data to match frontend expectations
    const transformedPlans = plans?.map(plan => ({
      id: plan.id,
      name: plan.display_name,
      slug: plan.name,
      description: plan.description,
      type: plan.plan_type,
      pricing: {
        monthly: plan.price_monthly,
        yearly: plan.price_yearly,
        currency: 'USD'
      },
      stripe: {
        monthlyPriceId: plan.stripe_price_id_monthly,
        yearlyPriceId: plan.stripe_price_id_yearly
      },
      limits: {
        monthlyAudioHours: plan.monthly_audio_hours_limit,
        maxDocumentsPerSession: plan.max_documents_per_session,
        maxFileSizeMb: plan.max_file_size_mb,
        maxSessionsPerMonth: plan.max_sessions_per_month,
        maxOrganizationMembers: plan.max_organization_members
      },
      features: {
        hasRealTimeGuidance: plan.has_real_time_guidance,
        hasAdvancedSummaries: plan.has_advanced_summaries,
        hasExportOptions: plan.has_export_options,
        hasEmailSummaries: plan.has_email_summaries,
        hasApiAccess: plan.has_api_access,
        hasCustomTemplates: plan.has_custom_templates,
        hasPrioritySupport: plan.has_priority_support,
        hasAnalyticsDashboard: plan.has_analytics_dashboard,
        hasTeamCollaboration: plan.has_team_collaboration
      },
      ai: {
        modelAccess: plan.ai_model_access,
        maxGuidanceRequests: plan.max_guidance_requests_per_session,
        summaryPriority: plan.summary_generation_priority
      },
      display: {
        isFeatured: plan.is_featured,
        sortOrder: plan.sort_order
      }
    })) || [];

    return NextResponse.json({ plans: transformedPlans });
  } catch (error) {
    console.error('Unexpected error in pricing API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}