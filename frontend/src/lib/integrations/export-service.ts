import { 
  IntegrationConfig, 
  ReportExportData, 
  ExportResult, 
  ExportOptions,
  IntegrationProvider 
} from './types';
import { SlackIntegration, SLACK_PROVIDER } from './slack';
import { HubSpotIntegration, HUBSPOT_PROVIDER } from './hubspot';
import { SalesforceIntegration, SALESFORCE_PROVIDER } from './salesforce';
import { MeetingReport } from '@/app/report/[id]/page';
import { EnhancedSummary } from '@/types/api';

export const AVAILABLE_PROVIDERS: IntegrationProvider[] = [
  SLACK_PROVIDER,
  HUBSPOT_PROVIDER,
  SALESFORCE_PROVIDER
];

export class ExportService {
  private integrations: Map<string, any> = new Map();

  constructor() {
    this.setupIntegrations();
  }

  private setupIntegrations() {
    // These would be loaded from the database in a real implementation
    // For now, we'll initialize empty
  }

  async loadUserIntegrations(userId: string, organizationId?: string): Promise<IntegrationConfig[]> {
    try {
      const response = await fetch('/api/integrations/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load integration settings');
      }

      const configs: IntegrationConfig[] = await response.json();
      
      // Initialize integration instances
      configs.forEach(config => {
        if (config.isActive) {
          this.addIntegration(config);
        }
      });

      return configs;
    } catch (error) {
      console.error('Failed to load integrations:', error);
      return [];
    }
  }

  addIntegration(config: IntegrationConfig) {
    let integration;
    
    switch (config.provider) {
      case 'slack':
        integration = new SlackIntegration(config);
        break;
      case 'hubspot':
        integration = new HubSpotIntegration(config);
        break;
      case 'salesforce':
        integration = new SalesforceIntegration(config);
        break;
      default:
        console.warn(`Unknown integration provider: ${config.provider}`);
        return;
    }

    this.integrations.set(config.id, integration);
  }

  removeIntegration(configId: string) {
    this.integrations.delete(configId);
  }

  async exportReport(
    report: MeetingReport,
    summary: EnhancedSummary | undefined,
    sessionId: string,
    provider: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const integration = this.getIntegrationByProvider(provider);
    
    if (!integration) {
      return {
        success: false,
        provider,
        error: 'Integration not configured',
        timestamp: new Date()
      };
    }

    const exportData: ReportExportData = {
      report,
      summary,
      exportOptions: options,
      sessionId
    };

    try {
      // Validate configuration
      if (!integration.validateConfig()) {
        throw new Error('Invalid integration configuration');
      }

      // Authenticate if needed
      const isAuthenticated = await integration.authenticate();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }

      // Export the report
      const result = await integration.exportReport(exportData);

      // Log the export
      await this.logExport(result, sessionId, provider);

      return result;
    } catch (error: any) {
      const errorResult: ExportResult = {
        success: false,
        provider,
        error: error.message || 'Export failed',
        timestamp: new Date()
      };

      await this.logExport(errorResult, sessionId, provider);
      return errorResult;
    }
  }

  async exportToMultiple(
    report: MeetingReport,
    summary: EnhancedSummary | undefined,
    sessionId: string,
    providers: string[],
    options: ExportOptions
  ): Promise<ExportResult[]> {
    const exportPromises = providers.map(provider => 
      this.exportReport(report, summary, sessionId, provider, options)
    );

    return await Promise.all(exportPromises);
  }

  private getIntegrationByProvider(provider: string): any | null {
    for (const [_, integration] of this.integrations) {
      if (integration.getProvider().id === provider) {
        return integration;
      }
    }
    return null;
  }

  getActiveIntegrations(): Array<{ id: string; provider: IntegrationProvider }> {
    const active: Array<{ id: string; provider: IntegrationProvider }> = [];
    
    for (const [id, integration] of this.integrations) {
      active.push({
        id,
        provider: integration.getProvider()
      });
    }

    return active;
  }

  async saveIntegrationConfig(config: Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationConfig> {
    const response = await fetch('/api/integrations/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new Error('Failed to save integration configuration');
    }

    const savedConfig: IntegrationConfig = await response.json();
    
    if (savedConfig.isActive) {
      this.addIntegration(savedConfig);
    }

    return savedConfig;
  }

  async updateIntegrationConfig(id: string, updates: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
    const response = await fetch(`/api/integrations/settings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update integration configuration');
    }

    const updatedConfig: IntegrationConfig = await response.json();
    
    // Remove old integration
    this.removeIntegration(id);
    
    // Add updated integration if active
    if (updatedConfig.isActive) {
      this.addIntegration(updatedConfig);
    }

    return updatedConfig;
  }

  async deleteIntegrationConfig(id: string): Promise<void> {
    const response = await fetch(`/api/integrations/settings/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete integration configuration');
    }

    this.removeIntegration(id);
  }

  private async logExport(result: ExportResult, sessionId: string, provider: string): Promise<void> {
    try {
      await fetch('/api/integrations/exports/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          provider,
          result
        })
      });
    } catch (error) {
      console.error('Failed to log export:', error);
    }
  }

  async getExportHistory(sessionId?: string): Promise<any[]> {
    const url = sessionId 
      ? `/api/integrations/exports/history?sessionId=${sessionId}`
      : '/api/integrations/exports/history';

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch export history');
    }

    return await response.json();
  }
}

// Singleton instance
let exportService: ExportService | null = null;

export function getExportService(): ExportService {
  if (!exportService) {
    exportService = new ExportService();
  }
  return exportService;
}