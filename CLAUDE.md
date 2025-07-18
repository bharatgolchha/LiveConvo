# CLAUDE.md - AI Assistant Guide for liveprompt.ai

## Project Overview

liveprompt.ai is a real-time conversation coaching application that provides AI-powered guidance during live conversations. The application features real-time transcription, contextual AI suggestions, conversation summaries, and timeline generation.

### Key Capabilities
- Real-time speech-to-text transcription using Deepgram
- AI-powered conversation guidance with <2 second latency
- Document and context upload support
- Session management and analytics
- Comprehensive post-conversation summaries
- Interactive checklist and task management
The database is Postgres hosted on Supabase
Please use Supabase MCP for anything database related.
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_f8add63cb4621e0d0ab3e61c6db3dc566a7c5af0"
      ]
    }
  }
}

SUPABASE_URL=https://ucvfgfbjcrxbzppwjpuu.supabase.co
PRODUCTION_SUPABASE_URL=https://xkxjycccifwyxgtvflxz.supabase.co
### Core Technologies
- **Frontend**: Next.js 15.3.2, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API routes, Supabase PostgreSQL
- **AI**: OpenRouter API with Google Gemini 2.5 Flash models
- **Transcription**: Deepgram API
- **Deployment**: Vercel + Supabase

### Database Environments
- **Development**: `ucvfgfbjcrxbzppwjpuu` (VoiceConvo Dev)
- **Production**: `juuysuamfoteblrqqdnu` (livePrompt Live)
## API DOCS
Please use Context7 via supabase MCP for referencing any API DOCS... Super important

## Tech Stack

### Frontend
- **Framework**: Next.js 15.3.2 with TypeScript
- **UI**: React 19, Tailwind CSS, Radix UI components
- **Animation**: Framer Motion
- **State**: React Context API (AuthContext, ThemeContext)

### Backend & Services
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **AI**: OpenRouter API (Google Gemini 2.5 Flash models)
- **Speech**: Deepgram SDK for transcription
- **Real-time**: WebRTC for audio capture

### Development
- **Testing**: Jest + React Testing Library
- **Build**: Next.js with Turbopack
- **Linting**: ESLint
- **Type Checking**: TypeScript

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard page
│   │   └── summary/      # Summary pages
│   ├── components/       # React components
│   │   ├── conversation/ # Conversation UI components
│   │   ├── guidance/     # AI guidance components
│   │   ├── session/      # Session management
│   │   └── ui/          # Shared UI components
│   ├── lib/             # Utilities and hooks
│   │   ├── hooks/       # Custom React hooks
│   │   └── conversation/ # Conversation utilities
│   └── types/           # TypeScript type definitions
└── tests/               # Test files
```

## Common Development Tasks

### Starting Development
```bash
cd frontend
npm run dev    # Starts development server with Turbopack
```

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run build          # Type check and build
```

## Key API Endpoints

### Session Management
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - List user sessions
- `GET /api/sessions/[id]` - Get session details
- `POST /api/sessions/[id]/finalize` - End and finalize session

### AI Features
- `POST /api/guidance` - Generate AI guidance
- `POST /api/chat-guidance` - Interactive chat guidance
- `GET /api/sessions/[id]/timeline` - Get session timeline
- `POST /api/summary` - Generate session summary
- `POST /api/topic-summary` - Generate topic-specific summary

### Context & Documents
- `POST /api/documents` - Upload documents
- `POST /api/sessions/[id]/context` - Add text context
- `GET /api/sessions/[id]/transcript` - Get session transcript

### Checklist
- `GET /api/checklist/[id]` - Get checklist items
- `POST /api/checklist` - Create checklist item
- `PATCH /api/checklist/[id]` - Update checklist item

## Important Components

### Core Components
1. **ConversationContent** (`/components/conversation/ConversationContent.tsx`)
   - Main conversation interface
   - Manages recording state and real-time updates

2. **AICoachSidebar** (`/components/guidance/AICoachSidebar.tsx`)
   - AI guidance display and interaction
   - Chat interface for real-time assistance

3. **RealtimeAudioCapture** (`/components/session/RealtimeAudioCapture.tsx`)
   - WebRTC audio capture and streaming
   - Deepgram integration

4. **ChecklistTab** (`/components/checklist/ChecklistTab.tsx`)
   - Checklist management UI
   - Real-time task tracking

### Custom Hooks
- `useTranscription` - Manages transcription state
- `useRealtimeSummary` - Real-time summary generation
- `useIncrementalTimeline` - Timeline updates
- `useChatGuidance` - AI chat interactions
- `useConversationState` - Conversation state management

## Database Schema

The complete database schema is defined in `supabase_schema_latest.sql`. This is the source of truth for the database structure.

### Key Tables
- `users` - User accounts with onboarding status
- `sessions` - Conversation sessions
- `transcripts` - Real-time transcript data (unique constraint on session_id + sequence_number)
- `guidance` - AI-generated suggestions
- `summaries` - Post-session summaries
- `documents` - Uploaded files
- `prep_checklist` - Session task items
- `session_timeline_events` - Chronological events
- `user_stats` - User statistics and usage metrics

## Environment Variables

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
DEEPGRAM_API_KEY=
```

## 🚀 Deployment Environments

### Development Environment
- **Database**: VoiceConvo Dev (`ucvfgfbjcrxbzppwjpuu`)
- **URL**: https://ucvfgfbjcrxbzppwjpuu.supabase.co
- **Region**: ap-southeast-1 (Singapore)
- **Status**: Active development database

### Production Environment  
- **Database**: livePrompt Live (West) (`xkxjycccifwyxgtvflxz`)
- **URL**: https://xkxjycccifwyxgtvflxz.supabase.co
- **Region**: us-west-1 (US West)
- **Status**: Production-ready with full schema and edge functions

### Edge Functions (Production)
- **Stripe Webhooks**: `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/stripe-webhooks`
- **Create Checkout**: `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/create-checkout-session`
- **Billing Portal**: `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/create-portal-session`
- **Test Stripe Config**: `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/test-stripe-config`

### Deployment Configuration
- **Platform**: Vercel
- **Framework**: Next.js 15.3.2
- **Build Directory**: `frontend/`
- **Output Directory**: `frontend/.next`
- **Node Version**: 18+

### Production Environment Variables
```bash
# Production Database
NEXT_PUBLIC_SUPABASE_URL=https://xkxjycccifwyxgtvflxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Get from Supabase Dashboard - production anon key]
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]

# API Keys
OPENROUTER_API_KEY=[Your OpenRouter API key]
DEEPGRAM_API_KEY=[Your Deepgram API key]

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_[Your production Stripe secret key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[Your production Stripe publishable key]
STRIPE_WEBHOOK_SECRET=whsec_[Your production webhook secret]

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production
```

## Testing Guidelines

### Test Structure
- Component tests: Use React Testing Library
- API tests: Mock external services
- Hook tests: Use renderHook from RTL
- Always mock Supabase and fetch calls

### Example Test Pattern
```typescript
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({ select: jest.fn() }))
  }))
}));
```

## Common Issues & Solutions

### 1. Transcript Duplication
- Check unique constraint on transcripts table
- Ensure sequence_number is properly incremented

### 2. Summary Display Issues
- Verify summary data structure matches SummaryData type
- Check for proper error handling in summary generation

### 3. Authentication Errors
- Verify Supabase credentials
- Check RLS policies on database tables
- Ensure user is properly authenticated

### 4. Real-time Features Not Working
- Check WebRTC permissions
- Verify Deepgram API key
- Ensure proper error handling in audio capture

## Development Conventions

### Code Style
- Use TypeScript for all new code
- Follow existing component patterns
- NO comments unless explicitly requested
- Use descriptive variable and function names

### State Management
- Local state for UI-only concerns
- Context for cross-component state
- Supabase for persistent data

### Error Handling
- Always provide user-friendly error messages
- Log errors for debugging
- Graceful fallbacks for missing services

### Performance
- Use incremental loading for large data
- Implement proper caching strategies
- Optimize real-time updates

## Deployment Considerations

### Production Build
```bash
npm run build
npm start
```

### Database Migrations
- All schema changes in SQL files
- Run migrations in order
- Test RLS policies thoroughly

### API Keys
- Never commit API keys
- Use environment variables
- Implement proper key rotation

## Useful Commands for Development

### Database Queries (via Supabase dashboard)
```sql
-- Check recent sessions
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;

-- Debug transcript issues
SELECT session_id, sequence_number, COUNT(*) 
FROM transcripts 
GROUP BY session_id, sequence_number 
HAVING COUNT(*) > 1;

-- View user statistics
SELECT id, email, total_sessions, total_audio_seconds
FROM users
WHERE total_sessions > 0;
```

### Quick Fixes
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json && npm install

# Reset database (careful!)
# Run SQL migration files in order
```

## Feature Flags & Demo Mode

The app supports demo mode when Supabase is not configured:
- Mock transcription data
- Simulated AI responses
- No persistence

This is useful for development and testing without external services.

## Recent Updates & Known Issues

### Recent Changes
- Fixed transcript duplication issue
- Improved summary display scrolling
- Added checklist recommendations feature
- Integrated personal context into AI advisor system prompt
  - Personal context from dashboard settings is now automatically included in AI guidance
  - Added visual indicator in chat when personal context is active
  - AI advisor now provides personalized recommendations based on user's role and preferences

### Known Issues
- WebRTC may require HTTPS in production
- Large file uploads may timeout
- Some UI animations may lag on slower devices

## 💳 Stripe Checkout Architecture

### Important: How Checkout Works

**We use Supabase Edge Functions for ALL Stripe operations.** Edge functions are deployed on BOTH development and production Supabase instances.

#### Checkout Flow:
1. **Frontend (PricingModal)** → Calls `/api/checkout/create-session` 
2. **Next.js API Route** → Forwards request to Supabase edge function
3. **Supabase Edge Function** → `create-checkout-session` handles Stripe API calls

### Architecture Details:

- **Stripe keys are stored in Supabase Vault** (not in .env files)
- **Edge functions are deployed on BOTH instances**:
  - Development: `ucvfgfbjcrxbzppwjpuu.supabase.co`
  - Production: `xkxjycccifwyxgtvflxz.supabase.co`
- **Each environment uses its own Stripe keys** configured in Supabase Vault

### Edge Function Endpoints:

#### Development:
- `https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/create-checkout-session`
- `https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/stripe-webhooks`
- `https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/create-portal-session`
- `https://ucvfgfbjcrxbzppwjpuu.supabase.co/functions/v1/test-stripe-config`

#### Production:
- `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/create-checkout-session`
- `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/stripe-webhooks`
- `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/create-portal-session`
- `https://xkxjycccifwyxgtvflxz.supabase.co/functions/v1/test-stripe-config`

### If Checkout Fails:

1. **Check if Stripe keys are configured in Supabase Vault**:
   - Go to your Supabase project dashboard
   - Navigate to Settings → Vault
   - Add these secrets:
     - `STRIPE_SECRET_KEY`: Your Stripe secret key
     - `STRIPE_WEBHOOK_SECRET`: Your webhook secret
2. **Verify edge functions are deployed and active**
3. **Check console logs for specific error messages**

### Important Notes:
- **DO NOT add Stripe keys to .env.local files**
- The `/api/checkout/create-session` route simply forwards requests to the edge function
- Authentication is handled by passing the user's JWT token to the edge function

### 🔄 Subscription Management Flow

1. **New Subscriptions**: `/api/checkout/create-session` → `create-checkout-session` edge function
2. **Manage Billing**: `/api/billing/portal` → `create-portal-session` edge function → Stripe Customer Portal
3. **In the Portal, users can**:
   - Update payment methods
   - Download invoices  
   - Upgrade/downgrade plans (with proration)
   - Cancel subscription (continues until period end)
   - Reactivate canceled subscriptions

4. **Webhook Processing**: All subscription changes are handled by the `stripe-webhooks` edge function
   - Plan changes take effect immediately for upgrades
   - Downgrades typically apply at period end
   - Cancellations continue access until period end

See `STRIPE_SUBSCRIPTION_GUIDE.md` for detailed implementation details.

---

**Note**: This guide is designed to help AI assistants understand and work with the liveprompt.ai codebase effectively. Always refer to the actual code for the most up-to-date implementation details.