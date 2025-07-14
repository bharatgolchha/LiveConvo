import { Integration } from './base';
import { 
  IntegrationProvider, 
  IntegrationConfig, 
  ReportExportData, 
  ExportResult,
  SlackMessage 
} from './types';

export const SLACK_PROVIDER: IntegrationProvider = {
  id: 'slack',
  name: 'Slack',
  icon: 'slack',
  description: 'Export meeting reports to Slack channels or direct messages',
  configRequired: [
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      type: 'url',
      required: false,
      placeholder: 'https://hooks.slack.com/services/...',
      helpText: 'For simple notifications. Get this from your Slack app settings.'
    },
    {
      name: 'accessToken',
      label: 'Bot User OAuth Token',
      type: 'password',
      required: false,
      placeholder: 'xoxb-...',
      helpText: 'For advanced features. Starts with xoxb-'
    },
    {
      name: 'defaultChannel',
      label: 'Default Channel',
      type: 'text',
      required: false,
      placeholder: '#general or @username',
      helpText: 'Where to send reports by default'
    }
  ]
};

export class SlackIntegration extends Integration {
  constructor(config: IntegrationConfig) {
    super(SLACK_PROVIDER, config);
    this.apiBaseUrl = 'https://slack.com/api';
  }

  async authenticate(): Promise<boolean> {
    if (this.config.config.accessToken) {
      try {
        const response = await this.makeRequest(`${this.apiBaseUrl}/auth.test`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        return response.ok === true;
      } catch (error) {
        console.error('Slack auth error:', error);
        return false;
      }
    }
    
    // Webhook URL doesn't need authentication test
    return !!this.config.config.webhookUrl;
  }

  async exportReport(data: ReportExportData): Promise<ExportResult> {
    try {
      const message = this.formatReport(data);
      
      if (this.config.config.webhookUrl) {
        // Use webhook for simple posting
        return await this.sendViaWebhook(message);
      } else if (this.config.config.accessToken) {
        // Use Web API for advanced features
        return await this.sendViaWebAPI(message, data);
      } else {
        throw new Error('No Slack credentials configured');
      }
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private async sendViaWebhook(message: SlackMessage): Promise<ExportResult> {
    const response = await fetch(this.config.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    return {
      success: true,
      provider: this.provider.id,
      timestamp: new Date()
    };
  }

  private async sendViaWebAPI(message: SlackMessage, data: ReportExportData): Promise<ExportResult> {
    const channel = data.exportOptions.metadata?.channel || this.config.config.defaultChannel;
    
    if (!channel) {
      throw new Error('No channel specified for Slack export');
    }

    const response = await this.makeRequest(`${this.apiBaseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel,
        ...message
      })
    });

    if (!response.ok) {
      throw new Error(response.error || 'Failed to post message');
    }

    return {
      success: true,
      provider: this.provider.id,
      exportId: response.ts,
      url: response.permalink,
      timestamp: new Date()
    };
  }

  formatReport(data: ReportExportData): SlackMessage {
    const { report, exportOptions } = data;
    const summary = report.summary;

    // Create blocks for rich formatting
    const blocks: any[] = [];

    // Header block
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: report.title || 'Meeting Report',
        emoji: true
      }
    });

    // Meeting info
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Type:*\n${report.type}`
        },
        {
          type: 'mrkdwn',
          text: `*Duration:*\n${this.formatDuration(report.duration)}`
        },
        {
          type: 'mrkdwn',
          text: `*Date:*\n${new Date(report.startedAt).toLocaleDateString()}`
        },
        {
          type: 'mrkdwn',
          text: `*Participants:*\n${report.participants.me} & ${report.participants.them}`
        }
      ]
    });

    blocks.push({ type: 'divider' });

    // TL;DR
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📋 Summary*\n${summary.tldr}`
      }
    });

    // Key Decisions
    if (summary.keyDecisions && summary.keyDecisions.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎯 Key Decisions*\n${this.formatDecisions(summary.keyDecisions)}`
        }
      });
    }

    // Action Items
    if (exportOptions.includeActionItems && summary.actionItems && summary.actionItems.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✅ Action Items*\n${this.formatActionItems(summary.actionItems)}`
        }
      });
    }

    // Key Insights
    if (summary.insights && summary.insights.length > 0) {
      const insightsText = summary.insights.map((insight, i) => 
        `${i + 1}. ${insight.observation}${insight.recommendation ? `\n   💡 ${insight.recommendation}` : ''}`
      ).join('\n\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💡 Key Insights*\n${insightsText}`
        }
      });
    }

    // Effectiveness Score
    if (summary.effectiveness) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 Effectiveness*\nOverall: ${summary.effectiveness.overall}/10 | Communication: ${summary.effectiveness.communication}/10 | Goals: ${summary.effectiveness.goalAchievement}/10`
        }
      });
    }

    // Add report link if available
    if (data.exportOptions.metadata?.reportUrl) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${data.exportOptions.metadata.reportUrl}|View Full Report>`
        }
      });
    }

    // Footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Generated by LivePrompt.ai • ${new Date().toLocaleString()}`
        }
      ]
    });

    return {
      text: `Meeting Report: ${report.title || 'Untitled'}`,
      blocks
    };
  }
}