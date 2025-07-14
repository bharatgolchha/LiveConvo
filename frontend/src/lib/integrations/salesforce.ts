import { Integration } from './base';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  ReportExportData, 
  ExportResult,
  SalesforceTask
} from './types';

export const SALESFORCE_PROVIDER: IntegrationProvider = {
  id: 'salesforce',
  name: 'Salesforce',
  icon: 'salesforce',
  description: 'Export meeting reports to Salesforce as Tasks or Events',
  configRequired: [
    {
      name: 'instanceUrl',
      label: 'Instance URL',
      type: 'url',
      required: true,
      placeholder: 'https://yourcompany.my.salesforce.com',
      helpText: 'Your Salesforce instance URL'
    },
    {
      name: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      placeholder: 'Your access token',
      helpText: 'OAuth access token from your connected app'
    },
    {
      name: 'recordType',
      label: 'Record Type',
      type: 'select',
      required: false,
      options: [
        { value: 'Task', label: 'Task' },
        { value: 'Event', label: 'Event' }
      ],
      helpText: 'Type of record to create in Salesforce'
    }
  ]
};

export class SalesforceIntegration extends Integration {
  private apiVersion = 'v59.0';

  constructor(config: IntegrationConfig) {
    super(SALESFORCE_PROVIDER, config);
    this.apiBaseUrl = `${this.config.config.instanceUrl}/services/data/${this.apiVersion}`;
  }

  protected setupHeaders(): void {
    super.setupHeaders();
    if (this.config.config.accessToken) {
      this.headers['Authorization'] = `Bearer ${this.config.config.accessToken}`;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.apiBaseUrl}/sobjects`);
      return Array.isArray(response.sobjects);
    } catch (error) {
      console.error('Salesforce auth error:', error);
      return false;
    }
  }

  async exportReport(data: ReportExportData): Promise<ExportResult> {
    try {
      const recordType = data.exportOptions.metadata?.recordType || 
                        this.config.config.recordType || 
                        'Task';
      
      if (recordType === 'Event') {
        return await this.createEvent(data);
      } else {
        return await this.createTask(data);
      }
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private async createTask(data: ReportExportData): Promise<ExportResult> {
    const task = this.formatReport(data);
    
    const response = await this.makeRequest(`${this.apiBaseUrl}/sobjects/Task`, {
      method: 'POST',
      body: JSON.stringify(task)
    });

    if (!response.success) {
      throw new Error(response.errors?.join(', ') || 'Failed to create task');
    }

    return {
      success: true,
      provider: this.provider.id,
      exportId: response.id,
      url: `${this.config.config.instanceUrl}/${response.id}`,
      timestamp: new Date()
    };
  }

  private async createEvent(data: ReportExportData): Promise<ExportResult> {
    const event = this.formatAsEvent(data);
    
    const response = await this.makeRequest(`${this.apiBaseUrl}/sobjects/Event`, {
      method: 'POST',
      body: JSON.stringify(event)
    });

    if (!response.success) {
      throw new Error(response.errors?.join(', ') || 'Failed to create event');
    }

    return {
      success: true,
      provider: this.provider.id,
      exportId: response.id,
      url: `${this.config.config.instanceUrl}/${response.id}`,
      timestamp: new Date()
    };
  }

  formatReport(data: ReportExportData): SalesforceTask {
    const { report, exportOptions } = data;
    const summary = report.summary;

    let description = `Meeting Report: ${report.title || 'Untitled'}\n`;
    description += '='.repeat(50) + '\n\n';

    // Meeting Details
    description += 'MEETING DETAILS\n';
    description += '-'.repeat(20) + '\n';
    description += `Type: ${report.type}\n`;
    description += `Duration: ${this.formatDuration(report.duration)}\n`;
    description += `Date: ${new Date(report.startedAt).toLocaleString()}\n`;
    description += `Participants: ${report.participants.me}, ${report.participants.them}\n\n`;

    // Summary
    description += 'SUMMARY\n';
    description += '-'.repeat(20) + '\n';
    description += `${summary.tldr}\n\n`;

    // Key Decisions
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
      description += 'KEY DECISIONS\n';
      description += '-'.repeat(20) + '\n';
      description += this.formatDecisions(summary.keyDecisions) + '\n\n';
    }

    // Action Items
    if (exportOptions.includeActionItems && summary.actionItems && summary.actionItems.length > 0) {
      description += 'ACTION ITEMS\n';
      description += '-'.repeat(20) + '\n';
      description += this.formatActionItems(summary.actionItems) + '\n\n';
    }

    // Key Insights
    if (summary.insights && summary.insights.length > 0) {
      description += 'KEY INSIGHTS\n';
      description += '-'.repeat(20) + '\n';
      summary.insights.forEach((insight: any, index: number) => {
        description += `${index + 1}. ${insight.observation}\n`;
        if (insight.evidence) {
          description += `   Evidence: ${insight.evidence}\n`;
        }
        if (insight.recommendation) {
          description += `   Recommendation: ${insight.recommendation}\n`;
        }
        description += '\n';
      });
    }

    // Effectiveness Metrics
    if (summary.effectiveness) {
      description += 'EFFECTIVENESS METRICS\n';
      description += '-'.repeat(20) + '\n';
      description += `Overall Score: ${summary.effectiveness.overall}/10\n`;
      description += `Communication: ${summary.effectiveness.communication}/10\n`;
      description += `Goal Achievement: ${summary.effectiveness.goalAchievement}/10\n\n`;
    }

    // Follow-up Questions
    if (summary.followUpQuestions && summary.followUpQuestions.length > 0) {
      description += 'FOLLOW-UP QUESTIONS\n';
      description += '-'.repeat(20) + '\n';
      summary.followUpQuestions.forEach((question: string, index: number) => {
        description += `${index + 1}. ${question}\n`;
      });
      description += '\n';
    }

    // Add metadata
    description += '-'.repeat(50) + '\n';
    description += `Generated by LivePrompt.ai on ${new Date().toLocaleString()}\n`;
    if (data.exportOptions.metadata?.reportUrl) {
      description += `Full Report: ${data.exportOptions.metadata.reportUrl}\n`;
    }

    const task: SalesforceTask = {
      Subject: this.truncateText(`Meeting: ${report.title || 'Untitled'}`, 255),
      Description: description,
      ActivityDate: new Date(report.startedAt).toISOString().split('T')[0],
      Status: 'Completed',
      Priority: this.determinePriority(summary)
    };

    // Add WhoId (Contact/Lead) if provided
    if (data.exportOptions.metadata?.whoId) {
      task.WhoId = data.exportOptions.metadata.whoId;
    }

    // Add WhatId (Account/Opportunity) if provided
    if (data.exportOptions.metadata?.whatId) {
      task.WhatId = data.exportOptions.metadata.whatId;
    }

    // Add custom fields if provided
    if (data.exportOptions.metadata?.customFields) {
      Object.assign(task, data.exportOptions.metadata.customFields);
    }

    return task;
  }

  private formatAsEvent(data: ReportExportData): any {
    const task = this.formatReport(data);
    const { report } = data;
    
    // Convert Task to Event format
    return {
      Subject: task.Subject,
      Description: task.Description,
      StartDateTime: new Date(report.startedAt).toISOString(),
      EndDateTime: new Date(report.endedAt).toISOString(),
      IsAllDayEvent: false,
      Location: report.platform || 'Virtual Meeting',
      WhoId: task.WhoId,
      WhatId: task.WhatId,
      ...data.exportOptions.metadata?.customFields
    };
  }

  private determinePriority(summary: any): string {
    // Determine priority based on action items and decisions
    const hasHighPriorityItems = summary.actionItems?.some((item: any) => 
      item.priority === 'high'
    );
    
    const hasImportantDecisions = summary.keyDecisions && summary.keyDecisions.length > 0;
    
    if (hasHighPriorityItems || hasImportantDecisions) {
      return 'High';
    } else if (summary.actionItems && summary.actionItems.length > 0) {
      return 'Normal';
    } else {
      return 'Low';
    }
  }
}