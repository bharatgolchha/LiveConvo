# LivePrompt.ai Integration System

This document describes the integration system that allows exporting meeting reports to external platforms like Slack, HubSpot, and Salesforce.

## Overview

The integration system provides a flexible, extensible architecture for exporting meeting reports to various third-party platforms. It supports multiple authentication methods, customizable export formats, and comprehensive error handling.

## Supported Integrations

### 1. Slack
- **Export Types**: Messages to channels, DMs, and threads
- **Authentication**: 
  - Webhook URL (simple notifications)
  - Bot User OAuth Token (advanced features)
- **Features**:
  - Rich message formatting with Block Kit
  - Thread support
  - File attachments
  - Custom channel selection

### 2. HubSpot
- **Export Types**: Notes attached to Contacts, Companies, or Deals
- **Authentication**: Private App Access Token
- **Features**:
  - HTML-formatted notes
  - Automatic associations with CRM records
  - Custom properties support
  - Search integration for record selection

### 3. Salesforce
- **Export Types**: Tasks or Events
- **Authentication**: OAuth Access Token with Instance URL
- **Features**:
  - Task/Event creation
  - WhoId/WhatId associations
  - Custom field mapping
  - Priority determination based on content

## Architecture

### Core Components

1. **Base Integration Interface** (`/lib/integrations/base.ts`)
   - Abstract base class for all integrations
   - Common methods for authentication, export, and formatting
   - Error handling and retry logic

2. **Integration Implementations**
   - `/lib/integrations/slack.ts` - Slack-specific logic
   - `/lib/integrations/hubspot.ts` - HubSpot-specific logic
   - `/lib/integrations/salesforce.ts` - Salesforce-specific logic

3. **Export Service** (`/lib/integrations/export-service.ts`)
   - Singleton service for managing integrations
   - Handles configuration loading and storage
   - Orchestrates exports to multiple platforms

4. **API Routes**
   - `/api/integrations/settings/*` - Configuration management
   - `/api/integrations/slack/*` - Slack-specific endpoints
   - `/api/integrations/hubspot/*` - HubSpot-specific endpoints
   - `/api/integrations/salesforce/*` - Salesforce-specific endpoints
   - `/api/integrations/exports/*` - Export history and logging

5. **UI Components**
   - `ExportButton` - Main export trigger component
   - `ExportModal` - Export options and provider selection
   - `IntegrationSettings` - Configuration management UI

## Database Schema

### integration_settings
Stores user integration configurations:
- `id` - UUID primary key
- `user_id` - Reference to auth.users
- `organization_id` - Optional organization reference
- `provider` - Integration provider name
- `config` - JSONB encrypted configuration
- `is_active` - Whether integration is enabled
- `created_at`, `updated_at` - Timestamps

### integration_exports
Logs all export operations:
- `id` - UUID primary key
- `user_id` - Reference to auth.users
- `session_id` - Reference to sessions
- `provider` - Integration provider name
- `status` - Export status (success/failed/pending)
- `export_id` - External system ID
- `url` - External system URL
- `error` - Error message if failed
- `metadata` - Additional export metadata
- `created_at` - Timestamp

## Usage

### Setting Up an Integration

1. Navigate to a report page
2. Click the "Export" button
3. Select "Export to Integrations"
4. Click "Manage Integrations"
5. Choose a provider and enter credentials
6. Save the configuration

### Exporting a Report

1. Open a meeting report
2. Click "Export" → "Export to Integrations"
3. Select one or more configured integrations
4. Choose export options (what to include)
5. Click "Export"

### API Usage

```typescript
// Initialize the export service
const exportService = getExportService();

// Load user integrations
await exportService.loadUserIntegrations(userId);

// Export to a specific provider
const result = await exportService.exportReport(
  report,
  summary,
  sessionId,
  'slack',
  {
    format: 'full',
    includeActionItems: true,
    includeDecisions: true
  }
);

// Export to multiple providers
const results = await exportService.exportToMultiple(
  report,
  summary,
  sessionId,
  ['slack', 'hubspot'],
  exportOptions
);
```

## Security

### Authentication Storage
- All credentials are stored encrypted in the database
- API tokens are never exposed to the client
- OAuth flows use secure server-side handling

### Row Level Security
- Users can only access their own integration settings
- Export logs are user-scoped
- Organization-level settings respect org boundaries

### API Security
- All endpoints require authentication
- CORS policies prevent unauthorized access
- Rate limiting prevents abuse

## Extending the System

### Adding a New Integration

1. Create integration class extending `BaseIntegration`:
```typescript
export class NewIntegration extends Integration {
  async authenticate(): Promise<boolean> { /* ... */ }
  async exportReport(data: ReportExportData): Promise<ExportResult> { /* ... */ }
  formatReport(data: ReportExportData): any { /* ... */ }
}
```

2. Add provider configuration:
```typescript
export const NEW_PROVIDER: IntegrationProvider = {
  id: 'new-provider',
  name: 'New Provider',
  icon: '🆕',
  description: 'Export to New Provider',
  configRequired: [/* fields */]
};
```

3. Update export service to handle new provider
4. Create API routes for provider-specific operations
5. Update UI components to include new provider

### Customizing Export Formats

Override the `formatReport` method in your integration class to customize how reports are formatted for each platform.

## Error Handling

The system implements comprehensive error handling:
- Network errors with retry logic
- Authentication failures with clear messaging
- Validation errors before export
- Graceful degradation for missing features

## Best Practices

1. **Security**: Never store unencrypted credentials
2. **User Experience**: Provide clear feedback during exports
3. **Performance**: Use batch operations where possible
4. **Reliability**: Implement proper error handling and logging
5. **Flexibility**: Allow users to customize export content

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify credentials are correct
   - Check API token permissions
   - Ensure OAuth tokens haven't expired

2. **Export Failures**
   - Check network connectivity
   - Verify destination (channel/record) exists
   - Review API rate limits

3. **Missing Data**
   - Ensure report has required fields
   - Check export options configuration
   - Verify field mappings for CRM systems

### Debug Mode

Enable debug logging by setting:
```javascript
console.debug('Integration:', provider, 'Export:', data);
```

## Future Enhancements

- Scheduled exports
- Bulk export operations
- Template management
- Webhook notifications
- Additional platforms (Teams, Notion, etc.)
- Export analytics and insights