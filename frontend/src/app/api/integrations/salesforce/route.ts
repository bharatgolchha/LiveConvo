import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SalesforceIntegration } from '@/lib/integrations/salesforce';
import { IntegrationConfig, ReportExportData } from '@/lib/integrations/types';

// POST /api/integrations/salesforce - Export to Salesforce
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
      .eq('provider', 'salesforce')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Create Salesforce integration instance
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

    const salesforce = new SalesforceIntegration(integrationConfig);

    // Validate config
    if (!salesforce.validateConfig()) {
      return NextResponse.json({ error: 'Invalid Salesforce configuration' }, { status: 400 });
    }

    // Export the report
    const exportData: ReportExportData = {
      report: reportData.report,
      summary: reportData.summary,
      exportOptions: exportOptions || { format: 'full' },
      sessionId: reportData.sessionId
    };

    const result = await salesforce.exportReport(exportData);

    // Log the export
    if (result.success) {
      await supabase
        .from('integration_exports')
        .insert({
          user_id: user.id,
          session_id: reportData.sessionId,
          provider: 'salesforce',
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
          provider: 'salesforce',
          status: 'failed',
          error: result.error
        });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Salesforce export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/integrations/salesforce/test - Test Salesforce connection
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
      .eq('provider', 'salesforce')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Create Salesforce integration instance
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

    const salesforce = new SalesforceIntegration(integrationConfig);

    // Test authentication
    const isAuthenticated = await salesforce.authenticate();

    return NextResponse.json({ 
      success: isAuthenticated,
      message: isAuthenticated ? 'Salesforce connection successful' : 'Salesforce connection failed'
    });
  } catch (error) {
    console.error('Salesforce test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/integrations/salesforce/search - Search for Salesforce records
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { configId, objectType = 'Contact', query } = body;

    if (!configId) {
      return NextResponse.json({ error: 'Missing configId' }, { status: 400 });
    }

    // Fetch the integration config
    const { data: config, error: configError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('id', configId)
      .eq('user_id', user.id)
      .eq('provider', 'salesforce')
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Build SOQL query
    let soql = `SELECT Id, Name`;
    if (objectType === 'Contact') {
      soql += ', Email, AccountId';
    } else if (objectType === 'Account') {
      soql += ', Website, Industry';
    } else if (objectType === 'Opportunity') {
      soql += ', StageName, CloseDate, Amount';
    }
    
    soql += ` FROM ${objectType}`;
    
    if (query) {
      soql += ` WHERE Name LIKE '%${query}%'`;
      if (objectType === 'Contact') {
        soql += ` OR Email LIKE '%${query}%'`;
      }
    }
    
    soql += ' LIMIT 10';

    // Search Salesforce
    const response = await fetch(
      `${config.config.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
      {
        headers: {
          'Authorization': `Bearer ${config.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search Salesforce');
    }

    const data = await response.json();
    return NextResponse.json(data.records || []);
  } catch (error) {
    console.error('Salesforce search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}