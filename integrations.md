# LivePrompt Native Integrations Guide

## Overview

LivePrompt's native integrations enable seamless data flow between your real-time conversation insights and your existing business tools. These integrations automatically sync conversation summaries, action items, insights, and key moments to your CRM, support desk, and recruiting platforms.

## Core Value Proposition

- **Eliminate Manual Data Entry**: Automatically sync conversation data to your systems of record
- **Maintain Context**: Keep all customer/candidate interactions in one place
- **Enable Team Collaboration**: Share insights across sales, support, and recruiting teams
- **Track Outcomes**: Monitor conversation effectiveness and follow-up actions

## Supported Integrations

### 1. Salesforce Integration

**Purpose**: Sync sales conversations and customer insights directly to Salesforce records.

#### What Gets Exported
- **Meeting Summaries**: Full conversation summaries attached to Contact/Lead/Opportunity records
- **Action Items**: Tasks created in Salesforce with due dates and assignments
- **Key Topics**: Custom fields updated with discussed products, pain points, and interests
- **Timeline Events**: Meeting activities logged with duration and participants
- **Sentiment Analysis**: Customer sentiment scores and engagement metrics
- **Next Steps**: Follow-up activities and scheduled meetings

#### Use Cases
- **Sales Calls**: Automatically update opportunity stages based on conversation outcomes
- **Discovery Meetings**: Capture customer requirements and pain points
- **Demo Sessions**: Track feature interests and objections
- **QBRs**: Document strategic discussions and renewal conversations

#### Data Mapping
```
LivePrompt Session → Salesforce Objects
├── Session Summary → Task/Event Description
├── Action Items → Tasks (with due dates)
├── Participants → Contact/Lead associations
├── Key Topics → Opportunity custom fields
├── Sentiment → Contact engagement score
└── Recording Link → Activity attachment
```

### 2. HubSpot Integration

**Purpose**: Enrich HubSpot CRM with conversation intelligence for better lead nurturing and customer success.

#### What Gets Exported
- **Contact Updates**: Enrich contact records with conversation insights
- **Company Intelligence**: Update company records with discussed initiatives
- **Deal Progress**: Move deals through pipeline based on conversation outcomes
- **Timeline Activities**: Create timeline events with conversation highlights
- **Custom Properties**: Update lead score, interests, and buying signals
- **Email Follow-ups**: Queue personalized follow-up sequences

#### Use Cases
- **Lead Qualification**: Auto-score leads based on conversation engagement
- **Product Demos**: Track feature interests and technical requirements
- **Customer Success**: Monitor account health through conversation sentiment
- **Partner Meetings**: Document partnership discussions and terms

#### Data Mapping
```
LivePrompt Session → HubSpot Objects
├── Participants → Contacts (create/update)
├── Organization → Company (create/update)
├── Summary → Timeline Event
├── Action Items → Tasks
├── Topics → Contact/Deal properties
└── Sentiment → Engagement score
```

### 3. Lever Integration

**Purpose**: Streamline recruiting workflows by syncing interview notes and feedback directly to your ATS.

#### What Gets Exported
- **Interview Notes**: Structured interview summaries with key highlights
- **Candidate Feedback**: Strengths, concerns, and overall impressions
- **Technical Assessments**: Skills demonstrated and areas evaluated
- **Culture Fit**: Team dynamics and cultural alignment observations
- **Next Steps**: Recommendations for next interview stages
- **Red Flags**: Any concerns or areas requiring follow-up

#### Use Cases
- **Phone Screens**: Quick candidate assessment and qualification notes
- **Technical Interviews**: Detailed technical competency evaluation
- **Behavioral Interviews**: Culture fit and soft skills assessment
- **Panel Interviews**: Consolidated feedback from multiple interviewers

#### Data Mapping
```
LivePrompt Session → Lever Objects
├── Session Summary → Interview Feedback
├── Evaluation Points → Feedback Forms
├── Skills Assessed → Candidate Tags
├── Next Steps → Stage Transitions
├── Action Items → Follow-up Tasks
└── Recording Link → Candidate Attachments
```

### 4. Zendesk Integration

**Purpose**: Convert support conversations into trackable tickets with full context and resolution paths.

#### What Gets Exported
- **Ticket Creation**: Auto-create tickets from support conversations
- **Customer Context**: Full conversation history and previous interactions
- **Issue Details**: Problem description, steps to reproduce, and impact
- **Resolution Steps**: Solutions discussed and actions taken
- **Follow-up Required**: Outstanding items and escalations
- **Customer Sentiment**: Satisfaction indicators and urgency levels

#### Use Cases
- **Support Calls**: Document customer issues and resolutions
- **Technical Troubleshooting**: Capture diagnostic steps and solutions
- **Product Feedback**: Log feature requests and bug reports
- **Escalations**: Create high-priority tickets with full context

#### Data Mapping
```
LivePrompt Session → Zendesk Objects
├── Session Summary → Ticket Description
├── Customer Info → Requester (User)
├── Organization → Organization
├── Issue Category → Ticket Tags/Type
├── Priority → Ticket Priority
├── Action Items → Ticket Tasks
└── Recording Link → Ticket Attachment
```

## Technical Architecture

### Authentication Flow

All integrations use OAuth 2.0 for secure authentication:

```
User → LivePrompt → OAuth Provider → Authorization → Access Token → API Access
```

1. **Initial Connection**: User clicks "Connect" in integration settings
2. **OAuth Redirect**: Redirected to provider's OAuth consent screen
3. **Authorization**: User grants permissions for specific scopes
4. **Token Storage**: Encrypted tokens stored in Supabase Vault
5. **Token Refresh**: Automatic refresh before expiration

### Data Synchronization

#### Real-time Sync (Webhooks)
- Session end triggers immediate export
- Webhook queuing for reliability
- Retry logic with exponential backoff
- Dead letter queue for failed exports

#### Batch Sync (Scheduled)
- Hourly sync for updated transcripts
- Daily sync for analytics aggregation
- Weekly sync for reporting data

### Database Schema

```sql
-- Integration Settings (existing table)
integration_settings
├── id (UUID)
├── user_id (UUID)
├── organization_id (UUID)
├── provider (TEXT) -- 'salesforce', 'hubspot', 'lever', 'zendesk'
├── config (JSONB) -- OAuth tokens, instance URLs, field mappings
├── is_active (BOOLEAN)
└── timestamps

-- Integration Exports (existing table)
integration_exports
├── id (UUID)
├── user_id (UUID)
├── session_id (UUID)
├── provider (TEXT)
├── status (TEXT) -- 'pending', 'processing', 'completed', 'failed'
├── export_id (TEXT) -- External system record ID
├── url (TEXT) -- Link to exported record
├── error (TEXT)
├── metadata (JSONB) -- Export details, retry count
└── created_at

-- Webhook Management (to be added)
integration_webhooks
├── id (UUID)
├── integration_id (UUID)
├── event_type (TEXT)
├── payload (JSONB)
├── status (TEXT)
├── attempts (INTEGER)
└── timestamps
```

## Security & Compliance

### Data Security
- **Encryption**: All OAuth tokens encrypted at rest using Supabase Vault
- **Token Rotation**: Automatic token refresh before expiration
- **Least Privilege**: Request minimum required OAuth scopes
- **Audit Trail**: Log all integration activities

### Compliance Considerations
- **GDPR**: Allow users to delete integration data
- **Data Retention**: Follow each platform's retention policies
- **PII Handling**: Mask sensitive information in exports
- **Access Control**: Integration settings restricted by organization

## Configuration Options

### Global Settings
- **Auto-Export**: Enable/disable automatic export on session end
- **Export Delay**: Wait time before exporting (for final edits)
- **Retry Attempts**: Number of retries for failed exports
- **Field Mappings**: Custom field mapping configuration

### Per-Integration Settings

#### Salesforce
- Instance URL (production/sandbox)
- Default record types for creation
- Field mapping for custom objects
- Duplicate detection rules

#### HubSpot
- Portal ID selection
- Pipeline stage mapping
- Contact property mapping
- Company association rules

#### Lever
- Posting selection for candidates
- Feedback form template
- Tag automation rules
- Stage transition triggers

#### Zendesk
- Ticket form selection
- Priority mapping rules
- Tag automation
- Group assignment logic

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] OAuth framework implementation
- [ ] Token storage and encryption
- [ ] Webhook infrastructure
- [ ] Integration settings UI

### Phase 2: Salesforce Integration (Weeks 3-4)
- [ ] Salesforce OAuth flow
- [ ] Contact/Lead search and matching
- [ ] Summary and task creation
- [ ] Field mapping configuration

### Phase 3: HubSpot Integration (Weeks 5-6)
- [ ] HubSpot OAuth implementation
- [ ] Contact/Company management
- [ ] Timeline event creation
- [ ] Custom property updates

### Phase 4: Lever Integration (Week 7)
- [ ] Lever OAuth setup
- [ ] Candidate feedback posting
- [ ] Interview note formatting
- [ ] Attachment handling

### Phase 5: Zendesk Integration (Week 8)
- [ ] Zendesk OAuth flow
- [ ] Ticket creation logic
- [ ] User/Organization matching
- [ ] Priority and tag mapping

### Phase 6: Polish & Scale (Weeks 9-10)
- [ ] Error handling and retries
- [ ] Performance optimization
- [ ] Usage analytics
- [ ] Documentation and training

## Success Metrics

### Adoption Metrics
- Integration activation rate
- Sessions exported per user
- Export success rate
- Time saved per export

### Quality Metrics
- Export accuracy score
- User satisfaction rating
- Support ticket reduction
- Data completeness score

### Business Impact
- Revenue influenced by exported data
- Deal velocity improvement
- Support resolution time reduction
- Hiring process acceleration

## Troubleshooting Guide

### Common Issues

#### Authentication Failures
- Token expiration → Automatic refresh
- Permission changes → Re-authenticate
- API limits → Implement rate limiting

#### Data Sync Issues
- Field mapping errors → Validation rules
- Duplicate records → Matching logic
- Missing required fields → Default values

#### Performance Issues
- Large summaries → Pagination
- API rate limits → Queue management
- Timeout errors → Async processing

## Future Enhancements

### Additional Integrations
- Slack (conversation summaries in channels)
- Microsoft Dynamics
- Pipedrive
- Greenhouse
- ServiceNow

### Advanced Features
- Two-way sync (pull context before meetings)
- Custom workflow automation
- AI-powered field mapping
- Bulk historical export
- Integration marketplace

### Analytics & Insights
- Cross-platform conversation analytics
- ROI tracking for conversations
- Team performance metrics
- Integration usage dashboard

## Conclusion

LivePrompt's native integrations transform conversation intelligence into actionable business data. By automatically syncing insights to your existing tools, teams can focus on building relationships rather than administrative tasks. The integration framework is designed to be extensible, secure, and reliable, ensuring your conversation data flows seamlessly into your business workflows.