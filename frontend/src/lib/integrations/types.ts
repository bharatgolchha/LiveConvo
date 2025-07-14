import { MeetingReport } from '@/app/report/[id]/page';
import { EnhancedSummary } from '@/types/api';

export interface IntegrationProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  configRequired: IntegrationConfigField[];
}

export interface IntegrationConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'url';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface IntegrationConfig {
  id: string;
  provider: string;
  userId: string;
  organizationId?: string;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportOptions {
  format: 'full' | 'summary' | 'custom';
  includeTranscript?: boolean;
  includeAnalytics?: boolean;
  includeActionItems?: boolean;
  includeDecisions?: boolean;
  includeParticipants?: boolean;
  customTemplate?: string;
  metadata?: Record<string, any>;
}

export interface ExportResult {
  success: boolean;
  provider: string;
  exportId?: string;
  url?: string;
  error?: string;
  timestamp: Date;
}

export interface ReportExportData {
  report: MeetingReport;
  summary?: EnhancedSummary;
  exportOptions: ExportOptions;
  sessionId: string;
}

export abstract class BaseIntegration {
  protected provider: IntegrationProvider;
  protected config: IntegrationConfig;

  constructor(provider: IntegrationProvider, config: IntegrationConfig) {
    this.provider = provider;
    this.config = config;
  }

  abstract authenticate(): Promise<boolean>;
  abstract exportReport(data: ReportExportData): Promise<ExportResult>;
  abstract formatReport(data: ReportExportData): any;
  abstract validateConfig(): boolean;

  getProvider(): IntegrationProvider {
    return this.provider;
  }

  getConfig(): IntegrationConfig {
    return this.config;
  }

  protected handleError(error: any): ExportResult {
    console.error(`${this.provider.name} export error:`, error);
    return {
      success: false,
      provider: this.provider.id,
      error: error.message || 'An unexpected error occurred',
      timestamp: new Date()
    };
  }
}

export interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string;
  channel?: string;
}

export interface HubSpotNote {
  properties: {
    hs_note_body: string;
    hs_timestamp: string;
    [key: string]: any;
  };
  associations?: Array<{
    to: { id: string };
    types: Array<{
      associationCategory: string;
      associationTypeId: number;
    }>;
  }>;
}

export interface SalesforceTask {
  Subject: string;
  Description: string;
  ActivityDate: string;
  Status: string;
  Priority: string;
  WhoId?: string;
  WhatId?: string;
  [key: string]: any;
}