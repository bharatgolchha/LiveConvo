import { BaseIntegration, IntegrationProvider, IntegrationConfig, ReportExportData, ExportResult } from './types';

export abstract class Integration extends BaseIntegration {
  protected apiBaseUrl?: string;
  protected headers: Record<string, string> = {};

  constructor(provider: IntegrationProvider, config: IntegrationConfig) {
    super(provider, config);
    this.setupHeaders();
  }

  protected setupHeaders(): void {
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  protected async makeRequest<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  }

  protected formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString();
  }

  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  protected formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  protected formatActionItems(items: any[]): string {
    return items.map((item, index) => {
      const priority = item.priority ? `[${item.priority.toUpperCase()}]` : '';
      const owner = item.owner ? `(${item.owner})` : '';
      const dueDate = item.dueDate ? ` - Due: ${new Date(item.dueDate).toLocaleDateString()}` : '';
      return `${index + 1}. ${priority} ${item.description || item.task || item} ${owner}${dueDate}`;
    }).join('\n');
  }

  protected formatDecisions(decisions: any[]): string {
    return decisions.map((decision, index) => {
      if (typeof decision === 'string') {
        return `${index + 1}. ${decision}`;
      }
      return `${index + 1}. ${decision.decision}\n   Rationale: ${decision.rationale}\n   Impact: ${decision.impact}`;
    }).join('\n\n');
  }

  protected formatParticipants(participants: any[]): string {
    return participants.map(p => {
      const role = p.role ? ` (${p.role})` : '';
      const percentage = p.speakingPercentage ? ` - ${p.speakingPercentage}% speaking time` : '';
      return `• ${p.name}${role}${percentage}`;
    }).join('\n');
  }

  validateConfig(): boolean {
    if (!this.config || !this.config.config) return false;
    
    for (const field of this.provider.configRequired) {
      if (field.required && !this.config.config[field.name]) {
        return false;
      }
    }
    
    return true;
  }
}