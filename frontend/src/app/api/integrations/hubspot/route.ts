import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { HubSpotIntegration } from '@/lib/integrations/hubspot';
import { IntegrationConfig, ReportExportData } from '@/lib/integrations/types';

// POST /api/integrations/hubspot - Export to HubSpot
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
      .eq('provider', 'hubspot')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Create HubSpot integration instance
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

    const hubspot = new HubSpotIntegration(integrationConfig);

    // Validate config
    if (!hubspot.validateConfig()) {
      return NextResponse.json({ error: 'Invalid HubSpot configuration' }, { status: 400 });
    }

    // Export the report
    const exportData: ReportExportData = {
      report: reportData.report,
      summary: reportData.summary,
      exportOptions: exportOptions || { format: 'full' },
      sessionId: reportData.sessionId
    };

    const result = await hubspot.exportReport(exportData);

    // Log the export
    if (result.success) {
      await supabase
        .from('integration_exports')
        .insert({
          user_id: user.id,
          session_id: reportData.sessionId,
          provider: 'hubspot',
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
          provider: 'hubspot',
          status: 'failed',
          error: result.error
        });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('HubSpot export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/integrations/hubspot/test - Test HubSpot connection
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
      .eq('provider', 'hubspot')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Create HubSpot integration instance
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

    const hubspot = new HubSpotIntegration(integrationConfig);

    // Test authentication
    const isAuthenticated = await hubspot.authenticate();

    return NextResponse.json({ 
      success: isAuthenticated,
      message: isAuthenticated ? 'HubSpot connection successful' : 'HubSpot connection failed'
    });
  } catch (error) {
    console.error('HubSpot test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/integrations/hubspot/search - Search for HubSpot records to associate
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
    const objectType = searchParams.get('objectType') || 'contact';
    const query = searchParams.get('query');

    if (!configId) {
      return NextResponse.json({ error: 'Missing configId' }, { status: 400 });
    }

    // Fetch the integration config
    const { data: config, error: configError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('id', configId)
      .eq('user_id', user.id)
      .eq('provider', 'hubspot')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Search HubSpot
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/${objectType}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: query ? [{
          filters: [{
            propertyName: objectType === 'contact' ? 'email' : 'name',
            operator: 'CONTAINS_TOKEN',
            value: query
          }]
        }] : [],
        limit: 10,
        properties: objectType === 'contact' 
          ? ['email', 'firstname', 'lastname'] 
          : ['name', 'domain']
      })
    });

    if (!response.ok) {
      throw new Error('Failed to search HubSpot');
    }

    const data = await response.json();
    return NextResponse.json(data.results || []);
  } catch (error) {
    console.error('HubSpot search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}