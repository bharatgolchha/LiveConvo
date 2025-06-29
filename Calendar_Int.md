# Calendar Integration Plan for liveprompt.ai

## Overview
This document outlines the comprehensive plan for integrating Google Calendar (Phase 1) and Microsoft Outlook (Phase 2) into liveprompt.ai. The integration will enable users to connect their calendars, automatically join meetings, and enhance the real-time conversation coaching experience with meeting context.

## Goals & Objectives

### Primary Goals
1. **Seamless Calendar Connection**: Allow users to authenticate and connect their Google/Outlook calendars within the app
2. **Automatic Meeting Detection**: Identify upcoming meetings and enable one-click joining
3. **Enhanced Context**: Provide meeting details (participants, agenda, previous meetings) to AI coach
4. **Meeting Recording**: Automatically deploy Recall.ai bots to scheduled meetings
5. **Post-Meeting Insights**: Generate summaries and action items from calendar meetings

### Success Criteria
- Users can connect calendars without leaving the app
- Meeting list shows all upcoming meetings with join options
- AI coach has meeting context for better guidance
- Automatic bot deployment with user consent
- Usage tracking integrated with existing subscription limits

## Technical Architecture

### High-Level Flow
```
User Dashboard
    ↓
Calendar Settings Tab
    ↓
OAuth Authentication (Google/Outlook)
    ↓
Recall.ai Calendar Creation
    ↓
Webhook Registration
    ↓
Meeting Sync & Display
    ↓
Bot Deployment Options
```

### Database Schema Updates

#### New Tables

```sql
-- Calendar provider connections
CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'microsoft_outlook')),
    recall_calendar_id TEXT UNIQUE NOT NULL,
    oauth_refresh_token TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider, email)
);

-- Calendar events synchronized from providers
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    external_event_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_url TEXT,
    attendees JSONB DEFAULT '[]',
    location TEXT,
    organizer_email TEXT,
    is_organizer BOOLEAN DEFAULT false,
    bot_scheduled BOOLEAN DEFAULT false,
    bot_id TEXT,
    session_id UUID REFERENCES sessions(id),
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(calendar_connection_id, external_event_id)
);

-- Calendar webhook events for audit trail
CREATE TABLE calendar_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User calendar preferences
CREATE TABLE calendar_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    auto_join_enabled BOOLEAN DEFAULT false,
    join_buffer_minutes INTEGER DEFAULT 2,
    auto_record_enabled BOOLEAN DEFAULT false,
    notify_before_join BOOLEAN DEFAULT true,
    notification_minutes INTEGER DEFAULT 5,
    excluded_keywords TEXT[] DEFAULT '{}',
    included_domains TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### RLS Policies
- Calendar data scoped to organization members
- Users can only see their own calendar connections
- Shared visibility for team meetings within organization

### API Architecture

#### New API Routes

```
/api/calendar/
├── auth/
│   ├── google/        # Google OAuth flow
│   ├── outlook/       # Outlook OAuth flow
│   └── callback/      # OAuth callbacks
├── connections/
│   ├── GET           # List user's calendar connections
│   ├── POST          # Create new connection
│   ├── [id]/
│   │   ├── DELETE    # Remove connection
│   │   └── sync/     # Manual sync trigger
├── events/
│   ├── GET           # List upcoming events
│   ├── [id]/
│   │   ├── GET       # Event details
│   │   └── bot/      # Bot scheduling
├── preferences/
│   ├── GET           # Get user preferences
│   └── PUT           # Update preferences
└── webhooks/
    └── recall/       # Webhook endpoint for Recall.ai
```

### Frontend Components

#### New Components Structure
```
components/
├── calendar/
│   ├── CalendarSettings.tsx       # Main settings component
│   ├── CalendarConnectionCard.tsx # Individual connection UI
│   ├── CalendarEventList.tsx      # Upcoming meetings list
│   ├── CalendarEventCard.tsx      # Meeting card with actions
│   ├── CalendarPreferences.tsx    # Auto-join settings
│   └── CalendarSyncStatus.tsx     # Sync status indicator
├── meeting/
│   ├── MeetingJoinButton.tsx      # Join meeting action
│   ├── MeetingContext.tsx         # Meeting info display
│   └── MeetingBotControls.tsx     # Bot deployment controls
```

### Environment Variables

```bash
# Recall.ai Configuration
RECALL_API_KEY=
RECALL_WEBHOOK_SECRET=

# Google OAuth (Development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/auth/google/callback

# Microsoft OAuth (Development)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/auth/outlook/callback

# Calendar Feature Flags
NEXT_PUBLIC_CALENDAR_ENABLED=true
NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED=true
NEXT_PUBLIC_OUTLOOK_CALENDAR_ENABLED=false
```

## Implementation Phases

### Phase 1: Google Calendar Integration (Week 1-2)

#### Week 1: Backend Infrastructure
1. **Database Setup**
   - Create calendar tables with RLS policies
   - Add migration scripts
   - Test data integrity

2. **OAuth Implementation**
   - Google OAuth client setup in GCP
   - OAuth flow API routes
   - Secure token storage
   - Error handling and retry logic

3. **Recall.ai Integration**
   - Calendar creation endpoint
   - Webhook registration
   - Event synchronization service

#### Week 2: Frontend & Testing
1. **UI Components**
   - Calendar settings tab
   - Connection flow UI
   - Event list with filters
   - Preferences panel

2. **Meeting Features**
   - Join meeting button
   - Bot deployment controls
   - Meeting context in session

3. **Testing & Polish**
   - End-to-end testing
   - Error scenarios
   - UI/UX refinements

### Phase 2: Microsoft Outlook Integration (Week 3)
1. **OAuth Setup**
   - Azure AD app registration
   - Outlook-specific OAuth flow
   - Token management

2. **API Adaptation**
   - Outlook-specific endpoints
   - Data normalization
   - Provider abstraction

3. **UI Updates**
   - Provider selection
   - Outlook-specific features
   - Unified experience

### Phase 3: Advanced Features (Week 4+)
1. **Smart Scheduling**
   - Meeting preparation reminders
   - Suggested talking points
   - Previous meeting context

2. **Team Features**
   - Shared meeting visibility
   - Team calendar view
   - Collaborative notes

3. **Analytics**
   - Meeting participation stats
   - Talk time analysis
   - Meeting effectiveness scores

## Key Features to Implement

### 1. Calendar Connection Flow
```
User Flow:
1. Navigate to Settings > Calendar
2. Click "Connect Google Calendar"
3. OAuth redirect to Google
4. Grant permissions (calendar.events.readonly)
5. Return to app with success message
6. View connected calendars list
7. Configure auto-join preferences
```

### 2. Meeting List Dashboard
- Upcoming meetings (next 7 days)
- Filter by: Today, This Week, All
- Search by title, attendees
- Quick actions: Join, Schedule Bot, Add Context
- Meeting conflict detection

### 3. Automatic Bot Deployment
- User preferences for auto-record
- Domain whitelist/blacklist
- Keyword filtering (skip "1:1", "personal")
- Manual override per meeting
- Bot status indicators

### 4. Meeting Context Integration
- Pull meeting details into session
- Show attendee list in AI coach
- Previous meeting history
- Shared documents/agenda
- Post-meeting action items

### 5. Usage & Billing Integration
- Track bot minutes per calendar meeting
- Show usage in billing dashboard
- Enforce subscription limits
- Usage alerts and notifications

## Security Considerations

### OAuth Security
- State parameter validation
- PKCE flow for enhanced security
- Secure token storage (encrypted)
- Token refresh handling
- Revocation support

### Data Privacy
- Calendar data encryption at rest
- Minimal data storage (only necessary fields)
- User consent for each feature
- GDPR compliance for data deletion
- Audit trail for access

### API Security
- Rate limiting per user
- Webhook signature validation
- Input sanitization
- CORS configuration
- Error message sanitization

## User Experience Flows

### First-Time Setup
1. Onboarding prompt for calendar connection
2. Clear permission explanations
3. Provider selection (Google/Outlook)
4. Success confirmation with next steps
5. Quick tour of calendar features

### Daily Usage
1. Dashboard shows today's meetings
2. Notification 5 minutes before meeting
3. One-click join from notification
4. Automatic context loading
5. Post-meeting summary generation

### Settings Management
1. View all connected calendars
2. Toggle auto-join per calendar
3. Set notification preferences
4. Manage bot deployment rules
5. Disconnect calendars easily

## Performance Considerations

### Caching Strategy
- Cache upcoming events (5-minute TTL)
- Webhook-triggered cache invalidation
- Background sync every 30 minutes
- Optimistic UI updates

### Database Optimization
- Indexes on frequently queried fields
- Partitioning for calendar_events by date
- Efficient webhook processing queue
- Batch operations for sync

### API Rate Limits
- Recall.ai API limits consideration
- Implement exponential backoff
- Queue system for webhooks
- User-level rate limiting

## Monitoring & Analytics

### Key Metrics
- Calendar connection success rate
- Average meetings per user
- Bot deployment rate
- Meeting join latency
- Feature adoption rates

### Error Tracking
- OAuth failure reasons
- Sync failures
- Bot deployment errors
- Webhook processing issues

### User Analytics
- Most used calendar providers
- Peak meeting times
- Average meeting duration
- Feature usage patterns

## Testing Strategy

### Unit Tests
- OAuth flow components
- Calendar data parsing
- Webhook payload processing
- Permission checks

### Integration Tests
- End-to-end OAuth flow
- Calendar sync process
- Bot deployment flow
- Webhook handling

### E2E Tests
- Complete user journey
- Multiple calendar scenarios
- Error recovery flows
- Performance benchmarks

## Rollout Strategy

### Beta Testing
1. Internal team testing (Week 1)
2. Select beta users (Week 2)
3. Gradual rollout (Week 3-4)
4. Full launch (Week 5)

### Feature Flags
```typescript
const CALENDAR_FEATURES = {
  GOOGLE_CALENDAR: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED === 'true',
  OUTLOOK_CALENDAR: process.env.NEXT_PUBLIC_OUTLOOK_CALENDAR_ENABLED === 'true',
  AUTO_BOT_DEPLOY: process.env.NEXT_PUBLIC_AUTO_BOT_ENABLED === 'true',
  TEAM_CALENDARS: process.env.NEXT_PUBLIC_TEAM_CALENDARS_ENABLED === 'true'
};
```

### Communication
- In-app announcement
- Email to existing users
- Documentation updates
- Video tutorials

## Success Metrics

### Week 1 Post-Launch
- 20% of active users connect calendar
- <2% OAuth failure rate
- <5s calendar sync time
- 90% uptime for calendar features

### Month 1 Post-Launch
- 50% calendar adoption
- 30% use auto-join feature
- 15% increase in meeting sessions
- 4.5+ star feature rating

### Quarter 1 Post-Launch
- 70% calendar adoption
- 25% increase in user retention
- 40% of meetings use bot
- Positive ROI on development

## Risk Mitigation

### Technical Risks
- **OAuth Token Expiry**: Implement robust refresh mechanism
- **API Downtime**: Graceful degradation, queue retry
- **Data Sync Issues**: Manual sync option, clear error states
- **Performance Impact**: Pagination, caching, lazy loading

### Business Risks
- **Low Adoption**: Progressive disclosure, clear value prop
- **Privacy Concerns**: Transparent data usage, easy disconnect
- **Support Burden**: Self-service troubleshooting, clear docs
- **Compliance**: GDPR/CCPA compliance from day one

## Future Enhancements

### Phase 4: Advanced Intelligence
- Meeting preparation AI assistant
- Automatic agenda generation
- Smart scheduling suggestions
- Meeting effectiveness scoring

### Phase 5: Integrations
- Slack/Teams notifications
- CRM integration (Salesforce, HubSpot)
- Note-taking apps (Notion, Obsidian)
- Project management tools

### Phase 6: Enterprise Features
- Admin calendar management
- Compliance recording policies
- Advanced analytics dashboard
- SSO calendar authentication

## Conclusion

This calendar integration will transform liveprompt.ai from a standalone conversation tool to an integrated meeting intelligence platform. By starting with Google Calendar and following a phased approach, we can deliver value quickly while building a robust foundation for future enhancements.

The key to success will be maintaining a seamless user experience while handling the complexity of calendar providers, ensuring reliable bot deployment, and providing clear value through meeting context and automation.