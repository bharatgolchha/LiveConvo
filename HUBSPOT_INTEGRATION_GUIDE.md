# HubSpot Integration Guide for liveprompt.ai

## How It Works: Complete Integration Flow

### Overview
The HubSpot integration automatically syncs your liveprompt.ai conversation data with HubSpot CRM, creating activities, tasks, and updating contact records with valuable conversation insights.

## Customer Setup Process (Step-by-Step)

### Step 1: Access Integration Settings

**From liveprompt.ai Dashboard:**
```
1. Click "Settings" in the navigation
2. Select "Integrations" tab
3. Find HubSpot in the CRM section
4. Click "Connect HubSpot"
```

![Integration Page Mock]
```
┌─────────────────────────────────────────────┐
│  Integrations > CRM                         │
│                                             │
│  ┌─────────────┐  ┌─────────────┐         │
│  │  Salesforce │  │   HubSpot   │         │
│  │     🔗      │  │     🔗      │         │
│  │  [Connect]  │  │  [Connect]  │         │
│  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────┘
```

### Step 2: HubSpot OAuth Authorization

**User Flow:**
```
1. Click "Connect HubSpot"
2. Redirected to HubSpot login
3. Enter HubSpot credentials
4. Review permissions requested:
   - CRM Objects (Contacts, Companies, Deals)
   - Engagements (Meetings, Calls, Tasks)
   - Timeline Events
5. Click "Grant Access"
6. Redirected back to liveprompt.ai
```

**What Happens Behind the Scenes:**
```typescript
// 1. Initiate OAuth flow
const initiateHubSpotAuth = async () => {
  const authUrl = `https://app.hubspot.com/oauth/authorize?` +
    `client_id=${HUBSPOT_CLIENT_ID}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `scope=crm.objects.contacts.read%20crm.objects.contacts.write%20` +
    `crm.objects.companies.read%20crm.objects.deals.read%20` +
    `crm.schemas.contacts.read%20crm.objects.owners.read`;
  
  window.location.href = authUrl;
};

// 2. Handle OAuth callback
app.get('/api/integrations/hubspot/callback', async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code
    })
  });
  
  const { access_token, refresh_token } = await tokenResponse.json();
  
  // Store encrypted tokens
  await saveIntegration({
    organization_id: user.organization_id,
    crm_type: 'hubspot',
    access_token: encrypt(access_token),
    refresh_token: encrypt(refresh_token),
    portal_id: portalId
  });
  
  res.redirect('/settings/integrations?success=true');
});
```

### Step 3: Configure Integration Settings

**Configuration Interface:**
```
┌─────────────────────────────────────────────────┐
│  HubSpot Integration Settings                   │
│                                                 │
│  ✅ Connected to: Acme Corp (Portal: 12345)    │
│                                                 │
│  Sync Options:                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ ☑️ Auto-sync completed sessions          │   │
│  │ ☑️ Create tasks from action items        │   │
│  │ ☑️ Update contact engagement score       │   │
│  │ ☐ Sync session recordings (Premium)     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Sync Frequency:                                │
│  ○ Real-time (recommended)                      │
│  ○ Every hour                                   │
│  ○ Daily                                        │
│                                                 │
│  [Save Settings]  [Test Connection]             │
└─────────────────────────────────────────────────┘
```

### Step 4: Field Mapping Configuration

**Default Mappings:**
```
┌─────────────────────────────────────────────────┐
│  Field Mapping                                  │
│                                                 │
│  liveprompt.ai → HubSpot                        │
│  ┌─────────────────────────────────────────┐   │
│  │ Session Title    → Engagement Title      │   │
│  │ Summary          → Engagement Body       │   │
│  │ Duration         → Duration (minutes)    │   │
│  │ Key Insights     → Notes                 │   │
│  │ Action Items     → Tasks                 │   │
│  │ Participants     → Associated Contacts   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Custom Properties:                             │
│  [+ Add Custom Mapping]                         │
│                                                 │
│  Advanced Options:                              │
│  ☑️ Create contacts if not found               │
│  ☑️ Link to deals by email domain              │
│  ☐ Update deal stage based on keywords        │
└─────────────────────────────────────────────────┘
```

### Step 5: Contact Association Rules

**Smart Matching Interface:**
```
┌─────────────────────────────────────────────────┐
│  Contact Matching Rules                         │
│                                                 │
│  How should we match participants to HubSpot?  │
│                                                 │
│  Primary Match:                                 │
│  ● Email address                                │
│  ○ Full name                                    │
│  ○ Company domain                               │
│                                                 │
│  If no match found:                             │
│  ● Create new contact                           │
│  ○ Skip this participant                        │
│  ○ Assign to default contact                    │
│                                                 │
│  Company Association:                           │
│  ☑️ Auto-link to company by email domain       │
│  ☑️ Create company if not exists               │
└─────────────────────────────────────────────────┘
```

## Real-World Integration Flow

### Scenario: Sales Call with a Prospect

**1. Before the Call**
```typescript
// When session starts, fetch HubSpot context
const enrichSessionContext = async (session) => {
  const integration = await getHubSpotIntegration(session.organization_id);
  
  // Search for participant in HubSpot
  const participant = session.participants[0];
  const contact = await hubspotClient.searchContacts({
    filterGroups: [{
      filters: [{
        propertyName: 'email',
        operator: 'EQ',
        value: participant.email
      }]
    }]
  });
  
  if (contact) {
    // Fetch associated company and deals
    const company = await hubspotClient.getAssociatedCompany(contact.id);
    const deals = await hubspotClient.getAssociatedDeals(contact.id);
    
    // Add context to session
    return {
      contact: {
        name: contact.properties.firstname + ' ' + contact.properties.lastname,
        title: contact.properties.jobtitle,
        company: company.properties.name,
        lastActivity: contact.properties.lastmodifieddate
      },
      deals: deals.map(d => ({
        name: d.properties.dealname,
        stage: d.properties.dealstage,
        amount: d.properties.amount
      })),
      talkingPoints: [
        `Last interaction: ${formatDate(contact.properties.lastmodifieddate)}`,
        `Open deals: ${deals.length}`,
        `Company size: ${company.properties.numberofemployees} employees`
      ]
    };
  }
};
```

**In liveprompt.ai UI:**
```
┌─────────────────────────────────────────────────┐
│  📞 Call with John Smith - Acme Corp           │
│                                                 │
│  HubSpot Context:                               │
│  • VP of Sales at Acme Corp (500 employees)    │
│  • Last interaction: 2 weeks ago                │
│  • Open deal: "Enterprise Package" ($50k)       │
│  • Current stage: Negotiation                   │
│                                                 │
│  Suggested talking points:                      │
│  • Follow up on pricing concerns                │
│  • Discuss implementation timeline              │
│  • Address security requirements                │
└─────────────────────────────────────────────────┘
```

**2. During the Call**
```typescript
// Real-time insights are generated but not yet synced
const insights = {
  competitorMentions: ['Competitor X mentioned at 5:23'],
  budgetDiscussion: 'Budget range confirmed: $40-60k',
  objections: ['Integration complexity concern at 10:15'],
  nextSteps: ['Demo scheduled for next Tuesday']
};
```

**3. After the Call (Auto-Sync)**
```typescript
// Triggered when session.finalize() is called
const syncToHubSpot = async (session, summary) => {
  const integration = await getHubSpotIntegration(session.organization_id);
  
  // 1. Create engagement (meeting activity)
  const engagement = await hubspotClient.crm.engagements.create({
    engagement: {
      active: false,
      type: 'MEETING',
      timestamp: session.started_at
    },
    associations: {
      contactIds: [contact.id],
      companyIds: [company.id],
      dealIds: [deal.id]
    },
    metadata: {
      title: session.title || 'Sales Call',
      body: formatSummaryForHubSpot(summary),
      durationMilliseconds: session.duration_seconds * 1000,
      outcome: 'COMPLETED',
      meetingNotes: `
        Key Points Discussed:
        ${summary.keyPoints.join('\n')}
        
        Action Items:
        ${summary.actionItems.join('\n')}
        
        Next Steps:
        ${summary.nextSteps.join('\n')}
      `
    }
  });
  
  // 2. Create tasks for action items
  for (const actionItem of summary.actionItems) {
    await hubspotClient.crm.tasks.create({
      properties: {
        hs_task_subject: actionItem.title,
        hs_task_body: actionItem.description,
        hs_task_status: 'NOT_STARTED',
        hs_task_priority: actionItem.priority || 'MEDIUM',
        hs_due_date: actionItem.dueDate
      },
      associations: [{
        to: { id: contact.id },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
      }]
    });
  }
  
  // 3. Update contact properties
  await hubspotClient.crm.contacts.update(contact.id, {
    properties: {
      last_meeting_date: new Date().toISOString(),
      engagement_score: calculateEngagementScore(session),
      notes_last_updated: new Date().toISOString(),
      recent_conversation_summary: summary.brief
    }
  });
  
  // 4. Update deal stage if needed
  if (summary.recommendedDealUpdate) {
    await hubspotClient.crm.deals.update(deal.id, {
      properties: {
        dealstage: summary.recommendedDealUpdate.stage,
        notes_last_updated: new Date().toISOString(),
        hs_next_step: summary.nextSteps[0]
      }
    });
  }
  
  // 5. Create timeline event
  await hubspotClient.crm.timeline.create({
    eventTemplateId: 'liveprompt_conversation',
    objectId: contact.id,
    tokens: {
      duration: session.duration_seconds,
      summary: summary.brief,
      sentiment: summary.sentiment
    }
  });
};
```

**4. View in HubSpot**

**Contact Record in HubSpot:**
```
┌─────────────────────────────────────────────────┐
│  John Smith                                     │
│  VP of Sales at Acme Corp                       │
│                                                 │
│  Recent Activity                                │
│  ┌─────────────────────────────────────────┐   │
│  │ 📞 Sales Call (30 min)          Today   │   │
│  │ Discussed pricing and timeline.         │   │
│  │ View full summary →                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Tasks                                          │
│  □ Send implementation timeline    Due: Tue     │
│  □ Prepare security documentation  Due: Thu     │
│                                                 │
│  Engagement Score: 85/100 ↑                     │
│  Last Meeting: Today                            │
└─────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  liveprompt.ai  │     │  Integration    │     │    HubSpot      │
│                 │     │    Service      │     │                 │
│ 1. Session ends │────▶│ 2. Process data │────▶│ 3. Create       │
│                 │     │                 │     │    engagement   │
│                 │     │ 4. Transform    │     │                 │
│                 │     │    to HubSpot   │────▶│ 5. Create tasks │
│                 │     │    format       │     │                 │
│                 │     │                 │     │                 │
│                 │     │ 6. Queue sync   │────▶│ 7. Update       │
│                 │     │                 │     │    contact      │
│                 │     │ 8. Handle       │     │                 │
│                 │     │    response     │◀────│ 9. Return       │
│                 │     │                 │     │    status       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Common Use Cases

### 1. Sales Team Use Case

**Automatic Actions:**
- ✅ Meeting logged in HubSpot with full context
- ✅ Follow-up tasks created and assigned
- ✅ Deal stage updated based on conversation
- ✅ Contact engagement score increased
- ✅ Next meeting scheduled in calendar

**Time Saved:** 15-20 minutes per call

### 2. Customer Success Use Case

**Automatic Actions:**
- ✅ Support call logged with issues discussed
- ✅ Feature requests captured as notes
- ✅ Satisfaction indicators updated
- ✅ Renewal risk flags if concerns detected
- ✅ Follow-up tasks for issue resolution

### 3. Marketing Qualification Use Case

**Automatic Actions:**
- ✅ Discovery call notes synced
- ✅ Lead score updated based on fit
- ✅ Qualification criteria checked
- ✅ Handoff notes prepared for sales
- ✅ Campaign attribution maintained

## Troubleshooting & Monitoring

### Integration Health Dashboard

```
┌─────────────────────────────────────────────────┐
│  HubSpot Integration Health                     │
│                                                 │
│  Status: ✅ Active                              │
│  Last Sync: 2 minutes ago                       │
│                                                 │
│  Today's Activity:                              │
│  • Sessions synced: 24                          │
│  • Tasks created: 18                            │
│  • Contacts updated: 31                         │
│  • Errors: 0                                    │
│                                                 │
│  Recent Syncs:                                  │
│  ✅ 14:30 - Sales call with John Smith         │
│  ✅ 13:15 - Discovery call with Acme Corp      │
│  ✅ 11:00 - Support call with Beta User        │
│                                                 │
│  [View Logs]  [Test Connection]  [Support]      │
└─────────────────────────────────────────────────┘
```

### Common Issues & Solutions

**1. Contacts Not Matching**
```
Issue: Participant not found in HubSpot
Solution: Check email format, enable auto-create
```

**2. Sync Delays**
```
Issue: Data not appearing immediately
Solution: Check sync frequency settings
```

**3. Permission Errors**
```
Issue: Cannot create tasks
Solution: Re-authorize with proper scopes
```

## Advanced Features

### 1. Custom Object Sync
```typescript
// Sync to custom objects
const syncToCustomObject = async (session) => {
  await hubspotClient.crm.objects.create('coaching_sessions', {
    properties: {
      session_id: session.id,
      duration: session.duration_seconds,
      key_insights: JSON.stringify(session.insights),
      coach_notes: session.coach_notes
    }
  });
};
```

### 2. Workflow Triggers
```
HubSpot Workflow: "High-Value Call Follow-up"
Trigger: When engagement created by liveprompt
Conditions: 
  - Duration > 30 minutes
  - Deal value > $50k
  - Positive sentiment
Actions:
  - Send follow-up email template
  - Create task for account executive
  - Notify sales manager
```

### 3. Reporting Integration
```
Custom Reports in HubSpot:
- Conversation duration by deal stage
- Action item completion rates
- Engagement scores over time
- Meeting frequency by account
```

## Security & Compliance

### Data Handling
- Only essential data is synced
- PII is encrypted in transit
- No audio recordings transferred
- Audit logs maintained

### Access Control
- Organization-level permissions
- User consent required
- Revocable at any time
- Data deletion on disconnect

## Pricing & Limits

### Included in Plans
- **Starter**: 100 syncs/month
- **Professional**: 1,000 syncs/month  
- **Enterprise**: Unlimited syncs

### API Rate Limits
- HubSpot: 100 requests/10 seconds
- Managed automatically by integration
- Queued during high volume

## Support Resources

### Setup Help
- Video walkthrough available
- In-app setup wizard
- Support chat during setup
- Integration specialist available

### Documentation
- API reference
- Troubleshooting guide
- Best practices
- FAQ section

---

This integration transforms every conversation into actionable CRM data, saving hours of manual data entry while ensuring no valuable insight is lost.