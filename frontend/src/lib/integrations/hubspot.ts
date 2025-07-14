import { Integration } from './base';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  ReportExportData, 
  ExportResult,
  HubSpotNote
} from './types';

export const HUBSPOT_PROVIDER: IntegrationProvider = {
  id: 'hubspot',
  name: 'HubSpot',
  icon: 'hubspot',
  description: 'Export meeting reports to HubSpot CRM as notes or activities',
  configRequired: [
    {
      name: 'accessToken',
      label: 'Private App Access Token',
      type: 'password',
      required: true,
      placeholder: 'pat-na1-...',
      helpText: 'Get this from your HubSpot private app settings'
    },
    {
      name: 'defaultAssociationType',
      label: 'Default Association Type',
      type: 'select',
      required: false,
      options: [
        { value: 'contact', label: 'Contact' },
        { value: 'company', label: 'Company' },
        { value: 'deal', label: 'Deal' }
      ],
      helpText: 'What type of record to associate notes with by default'
    }
  ]
};

export class HubSpotIntegration extends Integration {
  constructor(config: IntegrationConfig) {
    super(HUBSPOT_PROVIDER, config);
    this.apiBaseUrl = 'https://api.hubapi.com';
  }

  protected setupHeaders(): void {
    super.setupHeaders();
    if (this.config.config.accessToken) {
      this.headers['Authorization'] = `Bearer ${this.config.config.accessToken}`;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.apiBaseUrl}/account-info/v3/details`);
      return !!response.portalId;
    } catch (error) {
      console.error('HubSpot auth error:', error);
      return false;
    }
  }

  async exportReport(data: ReportExportData): Promise<ExportResult> {
    try {
      const note = this.formatReport(data);
      
      // Create the note
      const response = await this.makeRequest(`${this.apiBaseUrl}/crm/v3/objects/notes`, {
        method: 'POST',
        body: JSON.stringify(note)
      });

      // If associations are provided, create them
      if (data.exportOptions.metadata?.associations) {
        await this.createAssociations(response.id, data.exportOptions.metadata.associations);
      }

      return {
        success: true,
        provider: this.provider.id,
        exportId: response.id,
        url: `https://app.hubspot.com/contacts/${this.config.config.portalId}/note/${response.id}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private async createAssociations(noteId: string, associations: any[]): Promise<void> {
    for (const association of associations) {
      try {
        await this.makeRequest(
          `${this.apiBaseUrl}/crm/v3/objects/notes/${noteId}/associations/${association.type}/${association.id}/note_to_${association.type}`,
          { method: 'PUT' }
        );
      } catch (error) {
        console.error(`Failed to create association with ${association.type} ${association.id}:`, error);
      }
    }
  }

  formatReport(data: ReportExportData): HubSpotNote {
    const { report, exportOptions } = data;
    const summary = report.summary;

    // Build HTML content for the note
    let noteBody = `<h2>${report.title || 'Meeting Report'}</h2>`;
    
    // Meeting details
    noteBody += '<h3>Meeting Details</h3>';
    noteBody += '<ul>';
    noteBody += `<li><strong>Type:</strong> ${report.type}</li>`;
    noteBody += `<li><strong>Duration:</strong> ${this.formatDuration(report.duration)}</li>`;
    noteBody += `<li><strong>Date:</strong> ${new Date(report.startedAt).toLocaleString()}</li>`;
    noteBody += `<li><strong>Participants:</strong> ${report.participants.me}, ${report.participants.them}</li>`;
    noteBody += '</ul>';

    // Summary
    noteBody += '<h3>Summary</h3>';
    noteBody += `<p>${summary.tldr}</p>`;

    // Key Decisions
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
      noteBody += '<h3>Key Decisions</h3>';
      noteBody += '<ul>';
      summary.keyDecisions.forEach((decision: any) => {
        if (typeof decision === 'string') {
          noteBody += `<li>${decision}</li>`;
        } else {
          noteBody += `<li><strong>${decision.decision}</strong><br/>`;
          noteBody += `Rationale: ${decision.rationale}<br/>`;
          noteBody += `Impact: ${decision.impact}</li>`;
        }
      });
      noteBody += '</ul>';
    }

    // Action Items
    if (exportOptions.includeActionItems && summary.actionItems && summary.actionItems.length > 0) {
      noteBody += '<h3>Action Items</h3>';
      noteBody += '<ul>';
      summary.actionItems.forEach((item: any) => {
        const priority = item.priority ? `<span style="color: ${this.getPriorityColor(item.priority)}">[${item.priority.toUpperCase()}]</span>` : '';
        const owner = item.owner ? ` (Owner: ${item.owner})` : '';
        const dueDate = item.dueDate ? ` - Due: ${new Date(item.dueDate).toLocaleDateString()}` : '';
        noteBody += `<li>${priority} ${item.description || item}${owner}${dueDate}</li>`;
      });
      noteBody += '</ul>';
    }

    // Key Insights
    if (summary.insights && summary.insights.length > 0) {
      noteBody += '<h3>Key Insights</h3>';
      noteBody += '<ul>';
      summary.insights.forEach((insight: any) => {
        noteBody += `<li><strong>${insight.observation}</strong>`;
        if (insight.evidence) {
          noteBody += `<br/>Evidence: ${insight.evidence}`;
        }
        if (insight.recommendation) {
          noteBody += `<br/>💡 Recommendation: ${insight.recommendation}`;
        }
        noteBody += '</li>';
      });
      noteBody += '</ul>';
    }

    // Effectiveness Metrics
    if (summary.effectiveness) {
      noteBody += '<h3>Meeting Effectiveness</h3>';
      noteBody += '<ul>';
      noteBody += `<li>Overall Score: ${summary.effectiveness.overall}/10</li>`;
      noteBody += `<li>Communication: ${summary.effectiveness.communication}/10</li>`;
      noteBody += `<li>Goal Achievement: ${summary.effectiveness.goalAchievement}/10</li>`;
      noteBody += '</ul>';
    }

    // Follow-up Questions
    if (summary.followUpQuestions && summary.followUpQuestions.length > 0) {
      noteBody += '<h3>Follow-up Questions</h3>';
      noteBody += '<ul>';
      summary.followUpQuestions.forEach((question: string) => {
        noteBody += `<li>${question}</li>`;
      });
      noteBody += '</ul>';
    }

    // Add metadata
    noteBody += '<hr/>';
    noteBody += `<p style="font-size: 0.9em; color: #666;">`;
    noteBody += `Generated by LivePrompt.ai on ${new Date().toLocaleString()}`;
    if (data.exportOptions.metadata?.reportUrl) {
      noteBody += ` | <a href="${data.exportOptions.metadata.reportUrl}">View Full Report</a>`;
    }
    noteBody += '</p>';

    const note: HubSpotNote = {
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: new Date().toISOString()
      }
    };

    // Add custom properties if configured
    if (exportOptions.metadata?.customProperties) {
      Object.assign(note.properties, exportOptions.metadata.customProperties);
    }

    return note;
  }

  private getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  }
}