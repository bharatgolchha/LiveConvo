import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SlackIntegration } from '@/lib/integrations/slack';
import { IntegrationConfig, ReportExportData } from '@/lib/integrations/types';

// POST /api/integrations/slack - Export to Slack
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportData, configId, exportOptions } = body;

    if (!reportData || !configId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the integration config
    const { data: config, error: configError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('id', configId)
      .eq('user_id', user.id)
      .eq('provider', 'slack')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Create Slack integration instance
    const integrationConfig: IntegrationConfig = {
      id: config.id,
      provider: config.provider,
      userId: config.user_id,
      organizationId: config.organization_id,
      config: config.config,
      isActive: config.is_active,
      createdAt: new Date(config.created_at),
      updatedAt: new Date(config.updated_at)
    };

    const slack = new SlackIntegration(integrationConfig);

    // Validate config
    if (!slack.validateConfig()) {
      return NextResponse.json({ error: 'Invalid Slack configuration' }, { status: 400 });
    }

    // Export the report
    const exportData: ReportExportData = {
      report: reportData.report,
      summary: reportData.summary,
      exportOptions: exportOptions || { format: 'full' },
      sessionId: reportData.sessionId
    };

    const result = await slack.exportReport(exportData);

    // Log the export
    if (result.success) {
      await supabase
        .from('integration_exports')
        .insert({
          user_id: user.id,
          session_id: reportData.sessionId,
          provider: 'slack',
          status: 'success',
          export_id: result.exportId,
          url: result.url
        });
    } else {
      await supabase
        .from('integration_exports')
        .insert({
          user_id: user.id,
          session_id: reportData.sessionId,
          provider: 'slack',
          status: 'failed',
          error: result.error
        });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Slack export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/integrations/slack/test - Test Slack connection
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');

    if (!configId) {
      return NextResponse.json({ error: 'Missing configId' }, { status: 400 });
    }

    // Fetch the integration config
    const { data: config, error: configError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('id', configId)
      .eq('user_id', user.id)
      .eq('provider', 'slack')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Create Slack integration instance
    const integrationConfig: IntegrationConfig = {
      id: config.id,
      provider: config.provider,
      userId: config.user_id,
      organizationId: config.organization_id,
      config: config.config,
      isActive: config.is_active,
      createdAt: new Date(config.created_at),
      updatedAt: new Date(config.updated_at)
    };

    const slack = new SlackIntegration(integrationConfig);

    // Test authentication
    const isAuthenticated = await slack.authenticate();

    return NextResponse.json({ 
      success: isAuthenticated,
      message: isAuthenticated ? 'Slack connection successful' : 'Slack connection failed'
    });
  } catch (error) {
    console.error('Slack test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}