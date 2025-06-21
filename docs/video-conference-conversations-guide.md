# Video Conference Conversations Implementation Guide

## Overview
This guide provides a complete roadmap for implementing the new video conference-focused conversations feature for LivePrompt.ai. The feature enables real-time transcription and AI guidance for Zoom, Google Meet, and Microsoft Teams meetings.

## Architecture Overview

### Key Components
1. **Create Meeting Modal** - Streamlined meeting setup flow
2. **Conversations Page** - Real-time transcript and AI guidance display
3. **Recall.ai Integration** - Bot management for meeting transcription
4. **Real-time Updates** - SSE-based transcript streaming
5. **AI Features** - Live guidance, summaries, and smart notes

### Technology Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion
- **Real-time**: Server-Sent Events (SSE)
- **Transcription**: Recall.ai bots
- **AI**: OpenRouter API (Gemini 2.5 Flash)
- **State Management**: React Context + Custom Hooks

## Implementation Checklist

### Phase 1: Foundation Setup ✅
- [x] Create new directory structure
  - [x] `/app/meeting/` - New meeting pages
  - [x] `/components/meeting/` - Meeting-specific components
  - [x] `/lib/meeting/` - Meeting utilities and hooks
  - [x] `/app/api/meeting/` - Meeting API endpoints

### Phase 2: Create Meeting Modal 🚀
- [x] **Modal Components**
  - [x] `CreateMeetingModal.tsx` - Main modal container
  - [x] `MeetingBasicsStep.tsx` - Title and type selection
  - [x] `MeetingContextStep.tsx` - Context/agenda input
  - [x] `MeetingLinkStep.tsx` - URL input with validation
  - [x] `MeetingTypeSelector.tsx` - Visual type selection cards

- [x] **Features**
  - [x] Platform auto-detection (Zoom/Meet/Teams)
  - [x] URL validation
  - [x] Meeting scheduling (optional)
  - [x] Context/agenda input
  - [x] Type selection (Sales, Support, Team Meeting, etc.)

### Phase 3: Conversations Page Layout 📐
- [x] **Page Structure**
  - [x] `/app/meeting/[id]/page.tsx` - Main page component
  - [x] `/app/meeting/layout.tsx` - Meeting layout wrapper
  - [x] Responsive 65/35 split layout
  - [x] Collapsible panels

- [x] **Header Components**
  - [x] `MeetingHeader.tsx` - Meeting info and controls
  - [x] `MeetingStatus.tsx` - Bot connection status
  - [x] `MeetingTimer.tsx` - Duration tracker
  - [x] `MeetingActions.tsx` - End meeting, settings

### Phase 4: Conversation Components (Left Panel) 💬
- [x] **Tab System**
  - [x] `ConversationTabs.tsx` - Tab navigation
  - [x] `TabContent.tsx` - Tab content container
  - [x] Tab animations with Framer Motion

- [x] **Live Transcript Tab**
  - [x] `LiveTranscriptTab.tsx` - Transcript container
  - [x] `TranscriptMessage.tsx` - Individual messages
  - [x] `SpeakerAvatar.tsx` - Participant avatars
  - [ ] `TranscriptSkeleton.tsx` - Loading states (using LoadingSkeleton)
  - [x] Auto-scroll functionality
  - [x] Speaker identification (ME/THEM)

- [x] **Real-time Summary Tab**
  - [x] `RealtimeSummaryTab.tsx` - Summary display
  - [ ] `SummarySection.tsx` - Summary sections (inline in RealtimeSummaryTab)
  - [x] Progressive updates
  - [x] Key points, decisions, action items

- [x] **Smart Notes Tab**
  - [x] `SmartNotesTab.tsx` - AI-generated notes
  - [ ] `NoteSection.tsx` - Note categories (inline in SmartNotesTab)
  - [ ] `NoteEditor.tsx` - Manual note editing (inline in SmartNotesTab)
  - [ ] Export functionality

### Phase 5: AI Advisor Components (Right Panel) 🤖
- [x] **Core Components**
  - [x] `AIAdvisorPanel.tsx` - Main container
  - [x] `AIGuidanceCard.tsx` - Guidance items
  - [x] `AIChat.tsx` - Interactive chat
  - [x] `QuickActions.tsx` - Common actions
  - [x] `ContextPanel.tsx` - Meeting context

- [x] **Features**
  - [x] Real-time guidance generation
  - [x] Interactive Q&A
  - [x] Context-aware suggestions
  - [x] Quick action buttons

### Phase 6: State Management 🔄
- [x] **Custom Hooks**
  - [x] `useMeetingSession.ts` - Session state
  - [x] `useMeetingTranscript.ts` - Transcript management
  - [x] `useRecallBotStatus.ts` - Bot lifecycle (renamed from useRecallBot)
  - [ ] `useMeetingGuidance.ts` - AI guidance (using useChatGuidance)
  - [x] `useSmartNotes.ts` - Smart notes

- [x] **Context Provider**
  - [x] `MeetingContext.tsx` - Global state
  - [ ] State persistence
  - [x] Error handling

### Phase 7: API Implementation 🔌
- [x] **Meeting Management**
  - [x] `POST /api/meeting/create` - Create session
  - [x] `GET /api/meeting/[id]` - Get details
  - [x] `PATCH /api/meeting/[id]` - Update meeting
  - [x] `DELETE /api/meeting/[id]` - End meeting

- [x] **Bot Management**
  - [ ] `POST /api/meeting/[id]/start-bot` - Deploy bot (handled in create)
  - [x] `POST /api/meeting/[id]/stop-bot` - Stop bot
  - [ ] `GET /api/meeting/[id]/bot-status` - Bot status (using existing endpoint)

- [x] **Real-time Features**
  - [x] `GET /api/sessions/[id]/transcript-stream` - SSE stream (using existing endpoint)
  - [x] `POST /api/webhooks/recall/[sessionId]` - Webhook handler (implemented)
  - [x] Event broadcasting logic (via transcript-broadcaster.ts)

- [x] **AI Features**
  - [ ] `POST /api/meeting/[id]/guidance` - Generate guidance (using existing endpoint)
  - [x] `POST /api/meeting/[id]/smart-notes` - Generate notes
  - [ ] `GET /api/meeting/[id]/summary` - Get summary (using existing endpoint)

### Phase 8: Real-time Implementation ⚡
- [x] **SSE Setup**
  - [x] Server-sent events endpoint (using /api/sessions/[id]/transcript-stream)
  - [x] Client-side event handling (in useMeetingTranscript hook)
  - [x] Reconnection logic (5 second retry)
  - [x] Error handling

- [x] **Webhook Processing**
  - [x] Recall.ai webhook handler (/api/webhooks/recall/[sessionId]/route.ts)
  - [x] Event validation
  - [x] Transcript processing (both partial and final)
  - [x] Participant tracking

### Phase 9: UI/UX Polish ✨
- [x] **Styling**
  - [x] Consistent color scheme
  - [x] Dark mode support
  - [x] Platform-specific branding
  - [x] Loading states
  - [x] Error states

- [x] **Animations**
  - [x] Page transitions
  - [x] Message animations
  - [x] Tab switching
  - [x] Smooth scrolling

- [ ] **Responsiveness**
  - [ ] Mobile layout
  - [ ] Tablet optimization
  - [x] Collapsible panels
  - [ ] Touch gestures

### Phase 10: Testing & Optimization 🧪
- [ ] **Testing**
  - [ ] Unit tests for hooks
  - [ ] Component testing
  - [ ] API endpoint tests
  - [ ] E2E testing

- [ ] **Performance**
  - [ ] Transcript virtualization
  - [ ] Memo optimization
  - [ ] Bundle size optimization
  - [ ] SSE connection pooling

### Additional Completed Features ✅
- [x] **Dashboard Integration**
  - [x] `NewConversationButton.tsx` - Dropdown button for regular/video conference
  - [x] Updated dashboard to show both options
  - [x] Updated EmptyState component to support both modes
  - [x] Proper navigation to meeting pages

- [x] **Type Definitions**
  - [x] `meeting.types.ts` - Meeting-related types
  - [x] `transcript.types.ts` - Transcript and summary types
  - [x] `guidance.types.ts` - AI guidance types

- [x] **Utility Functions**
  - [x] `platform-detector.ts` - Meeting platform detection
  - [x] `time-formatters.ts` - Time formatting utilities
  - [x] Meeting URL validation

- [x] **Common Components**
  - [x] `LoadingStates.tsx` - Various loading states
  - [x] `ErrorBoundary.tsx` - Error handling wrapper

## Component Structure

### Directory Layout
```
frontend/src/
├── app/
│   ├── meeting/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx (redirect)
│   └── api/
│       └── meeting/
│           ├── create/
│           │   └── route.ts
│           ├── [id]/
│           │   ├── route.ts
│           │   ├── start-bot/
│           │   │   └── route.ts
│           │   ├── stop-bot/
│           │   │   └── route.ts
│           │   ├── bot-status/
│           │   │   └── route.ts
│           │   ├── transcript-stream/
│           │   │   └── route.ts
│           │   ├── guidance/
│           │   │   └── route.ts
│           │   └── smart-notes/
│           │       └── route.ts
│           └── webhooks/
│               └── recall/
│                   └── route.ts
├── components/
│   └── meeting/
│       ├── create/
│       │   ├── CreateMeetingModal.tsx
│       │   ├── MeetingBasicsStep.tsx
│       │   ├── MeetingContextStep.tsx
│       │   ├── MeetingLinkStep.tsx
│       │   └── MeetingTypeSelector.tsx
│       ├── conversation/
│       │   ├── ConversationTabs.tsx
│       │   ├── LiveTranscriptTab.tsx
│       │   ├── TranscriptMessage.tsx
│       │   ├── SpeakerAvatar.tsx
│       │   ├── RealtimeSummaryTab.tsx
│       │   ├── SmartNotesTab.tsx
│       │   └── TabContent.tsx
│       ├── ai-advisor/
│       │   ├── AIAdvisorPanel.tsx
│       │   ├── AIGuidanceCard.tsx
│       │   ├── AIChat.tsx
│       │   ├── QuickActions.tsx
│       │   └── ContextPanel.tsx
│       ├── header/
│       │   ├── MeetingHeader.tsx
│       │   ├── MeetingStatus.tsx
│       │   ├── MeetingTimer.tsx
│       │   └── MeetingActions.tsx
│       └── common/
│           ├── LoadingStates.tsx
│           ├── ErrorBoundary.tsx
│           └── EmptyStates.tsx
└── lib/
    └── meeting/
        ├── hooks/
        │   ├── useMeetingSession.ts
        │   ├── useMeetingTranscript.ts
        │   ├── useRecallBot.ts
        │   ├── useMeetingGuidance.ts
        │   └── useSmartNotes.ts
        ├── utils/
        │   ├── meeting-validators.ts
        │   ├── platform-detector.ts
        │   ├── transcript-processor.ts
        │   └── time-formatters.ts
        ├── types/
        │   ├── meeting.types.ts
        │   ├── transcript.types.ts
        │   └── guidance.types.ts
        └── context/
            └── MeetingContext.tsx
```

## Implementation Guidelines

### 1. Component Best Practices
- **Single Responsibility**: Each component should have one clear purpose
- **Props Interface**: Define TypeScript interfaces for all props
- **Memoization**: Use React.memo for expensive components
- **Error Boundaries**: Wrap major sections in error boundaries
- **Loading States**: Always provide loading feedback

### 2. State Management Guidelines
- **Local State**: Use for UI-only state (modals, toggles)
- **Context**: Use for cross-component state (session, transcript)
- **Server State**: Keep source of truth in database
- **Optimistic Updates**: Update UI immediately, sync later

### 3. Real-time Considerations
- **Debouncing**: Debounce rapid updates (summaries, guidance)
- **Batching**: Batch transcript updates for performance
- **Reconnection**: Implement automatic SSE reconnection
- **Fallbacks**: Provide offline functionality where possible

### 4. Performance Optimization
- **Virtualization**: Use for long transcript lists
- **Lazy Loading**: Split code for better initial load
- **Image Optimization**: Use Next.js Image component
- **Bundle Size**: Monitor and optimize bundle size

### 5. Accessibility Requirements
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels
- **Focus Management**: Logical focus flow
- **Color Contrast**: WCAG AA compliance

## Database Schema Updates

### New/Updated Tables
```sql
-- Sessions table updates
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meeting_platform VARCHAR(50);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meeting_scheduled_at TIMESTAMP;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meeting_agenda TEXT;

-- Meeting-specific metadata
CREATE TABLE IF NOT EXISTS meeting_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  meeting_id VARCHAR(255),
  host_id VARCHAR(255),
  participant_count INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Smart notes table
CREATE TABLE IF NOT EXISTS smart_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  importance VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Response Formats

### Meeting Creation Response
```typescript
{
  success: boolean;
  meeting: {
    id: string;
    title: string;
    type: string;
    platform: 'zoom' | 'google_meet' | 'teams';
    meetingUrl: string;
    status: 'scheduled' | 'active' | 'completed';
    botId?: string;
    createdAt: string;
  };
}
```

### Transcript Stream Event
```typescript
{
  type: 'transcript' | 'status' | 'error';
  data: {
    id: string;
    speaker: string;
    text: string;
    timestamp: string;
    isFinal: boolean;
    confidence?: number;
  };
}
```

### Guidance Response
```typescript
{
  id: string;
  type: 'suggestion' | 'warning' | 'insight';
  content: string;
  priority: 'high' | 'medium' | 'low';
  actions?: Array<{
    label: string;
    action: string;
  }>;
}
```

## Error Handling Strategy

### Client-Side Errors
```typescript
// Error boundary for each major section
<ErrorBoundary fallback={<ErrorFallback />}>
  <ConversationContent />
</ErrorBoundary>

// Hook error handling
const { data, error, isLoading } = useMeetingSession(id);
if (error) return <MeetingError error={error} />;
```

### Server-Side Errors
```typescript
// API error responses
{
  error: {
    code: 'MEETING_NOT_FOUND',
    message: 'The requested meeting was not found',
    details: {}
  }
}
```

### Recall.ai Bot Errors
- Handle bot join failures gracefully
- Provide fallback to manual recording
- Show clear error messages to users
- Log errors for debugging

## Testing Strategy

### Unit Tests
- Test all custom hooks
- Test utility functions
- Test component logic

### Integration Tests
- Test API endpoints
- Test webhook processing
- Test real-time features

### E2E Tests
- Test complete meeting flow
- Test error scenarios
- Test different platforms

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance testing done
- [ ] Accessibility audit passed
- [ ] Security review completed

### Deployment
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] API keys configured
- [ ] Webhook URLs updated
- [ ] SSL certificates valid

### Post-deployment
- [ ] Smoke tests passed
- [ ] Monitoring enabled
- [ ] Error tracking active
- [ ] Performance metrics baseline
- [ ] User feedback collection

## Monitoring & Analytics

### Key Metrics
- Meeting creation rate
- Bot success rate
- Transcript latency
- AI response time
- User engagement

### Error Tracking
- Sentry integration
- Custom error logging
- Webhook failure alerts
- Performance monitoring

## Future Enhancements

### Phase 2 Features
- [ ] Calendar integration
- [ ] Automated meeting joining
- [ ] Multi-language support
- [ ] Custom AI prompts
- [ ] Meeting recordings

### Phase 3 Features
- [ ] Team collaboration
- [ ] Meeting analytics
- [ ] Custom integrations
- [ ] Mobile app
- [ ] Offline support

## Resources & References

### Documentation
- [Recall.ai API Docs](https://docs.recall.ai/)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

### Internal Docs
- `/recall-api-documentation.md` - Recall.ai integration details
- `/recall-integration-checklist.md` - Integration progress
- `/CLAUDE.md` - Project guidelines

## Support & Troubleshooting

### Common Issues
1. **Bot fails to join meeting**
   - Check meeting URL format
   - Verify platform permissions
   - Check Recall.ai quota

2. **No transcripts appearing**
   - Verify webhook configuration
   - Check SSE connection
   - Review bot status

3. **AI guidance delayed**
   - Check OpenRouter API status
   - Review rate limits
   - Optimize prompt size

### Debug Tools
- Browser DevTools Network tab
- React Developer Tools
- Redux DevTools (if using)
- Server logs

## Conclusion

This implementation creates a professional, intuitive video conference conversation experience focused on real-time transcription and AI assistance. The modular architecture ensures maintainability and scalability while providing an excellent user experience.