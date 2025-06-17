# liveprompt.ai - Real-Time Conversation Intelligence Platform

## Executive Summary

liveprompt.ai is a cutting-edge real-time conversation coaching platform that provides AI-powered guidance during live conversations. It combines speech recognition, natural language processing, and contextual AI to help professionals excel in high-stakes conversations like sales calls, negotiations, interviews, and customer support interactions.

## Problem Statement

Professionals often struggle during critical conversations:
- Sales reps miss key objections or forget important talking points
- Customer support agents lack instant access to relevant information
- Interviewers may not ask optimal follow-up questions
- Negotiators miss opportunities to create value
- Real-time pressure leads to suboptimal outcomes

Traditional solutions like post-call coaching or static scripts are inadequate because they either come too late or are too rigid for dynamic conversations.

## Solution Overview

liveprompt.ai provides:
1. **Real-time transcription** of ongoing conversations
2. **Contextual AI suggestions** delivered in under 2 seconds
3. **Dynamic guidance** based on conversation flow
4. **Post-conversation analytics** and improvement insights
5. **Knowledge base integration** for instant access to relevant information

## Technical Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Conversation │  │ AI Coach     │  │ Timeline &       │  │
│  │ View         │  │ Sidebar      │  │ Checklist Panel  │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                    State Management                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ AuthContext │  │ Conversation │  │ Realtime         │  │
│  │             │  │ State        │  │ Summary State    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ WebRTC      │  │ Deepgram     │  │ OpenRouter      │  │
│  │ Audio       │  │ WebSocket    │  │ API Client      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /sessions   │  │ /guidance    │  │ /summary        │  │
│  │ /transcript │  │ /chat-guide  │  │ /timeline       │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ sessions    │  │ transcripts  │  │ guidance        │  │
│  │ users       │  │ summaries    │  │ checklist       │  │
│  │ documents   │  │ timeline     │  │ context         │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                 External Services                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Deepgram    │  │ OpenRouter   │  │ Stripe          │  │
│  │ (Speech)    │  │ (AI Models)  │  │ (Billing)       │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Features Explained

### 1. Real-Time Transcription Engine

**How it works:**
1. **Audio Capture**: WebRTC captures audio from user's microphone
2. **Streaming**: Audio streams to Deepgram via WebSocket connection
3. **Processing**: Deepgram returns transcribed text with speaker diarization
4. **Storage**: Transcripts stored with sequence numbers to prevent duplication
5. **Display**: UI updates in real-time with new transcript segments

**Technical Details:**
- Uses `MediaRecorder` API with `webm-opus` codec
- Chunks audio every 100ms for low latency
- Implements automatic reconnection for reliability
- Stores both interim and final transcripts

### 2. AI Guidance System

**How it works:**
1. **Context Assembly**: Recent transcript + session context + user preferences
2. **Prompt Engineering**: Dynamic prompts based on conversation type
3. **AI Processing**: Gemini 2.0 Flash model generates suggestions
4. **Relevance Filtering**: Only high-priority, timely suggestions shown
5. **Display Logic**: Non-intrusive sidebar updates

**Guidance Types:**
- **Conversation Tips**: Real-time coaching on technique
- **Information Retrieval**: Relevant facts from knowledge base
- **Response Suggestions**: What to say next
- **Warning Alerts**: Potential issues to address
- **Question Prompts**: Follow-up questions to ask

### 3. Interactive Chat Interface

**How it works:**
1. User can ask questions directly to AI coach
2. AI has full conversation context
3. Responses tailored to current moment
4. Can request specific types of help

**Use Cases:**
- "What questions should I ask about their budget?"
- "How do I handle this objection?"
- "What are the key features I should highlight?"
- "Help me close this deal"

### 4. Session Timeline

**How it works:**
1. **Event Detection**: AI identifies key conversation moments
2. **Categorization**: Events tagged (objection, question, commitment, etc.)
3. **Timestamp Mapping**: Links to exact transcript location
4. **Visual Timeline**: Chronological event display
5. **Navigation**: Click to jump to any moment

**Event Types:**
- Topic changes
- Important questions
- Objections raised
- Commitments made
- Action items discussed
- Emotional moments

### 5. Smart Checklist

**How it works:**
1. **Pre-conversation**: User or AI creates task list
2. **Real-time Tracking**: AI detects when topics covered
3. **Auto-completion**: Items marked done automatically
4. **Recommendations**: AI suggests new items based on conversation
5. **Post-call Review**: See what was missed

### 6. Document Intelligence

**How it works:**
1. **Upload**: Support for PDF, TXT, MD files
2. **Processing**: Text extraction and indexing
3. **Embedding**: Vector embeddings for semantic search
4. **Retrieval**: AI references documents during conversation
5. **Citations**: Shows source when using document info

### 7. Post-Conversation Analysis

**Comprehensive Summary:**
- Executive summary
- Key topics discussed
- Action items and next steps
- Sentiment analysis
- Performance metrics
- Improvement suggestions

**Analytics Include:**
- Talk time ratio
- Question effectiveness
- Objection handling score
- Engagement metrics
- Conversation flow analysis

## User Journey

### 1. Pre-Conversation Setup
```
User logs in → Creates new session → Uploads relevant documents → 
Adds context notes → Sets conversation goals → Creates checklist
```

### 2. During Conversation
```
Starts recording → Sees real-time transcript → Receives AI suggestions →
Interacts with chat → Monitors checklist progress → Views timeline
```

### 3. Post-Conversation
```
Ends recording → Reviews summary → Downloads transcript → 
Analyzes performance → Plans follow-up → Shares insights
```

## Technical Implementation Details

### WebSocket Management
```typescript
class DeepgramConnection {
  - Maintains persistent WebSocket connection
  - Handles reconnection with exponential backoff
  - Queues messages during disconnection
  - Processes both interim and final results
  - Manages speaker identification
}
```

### AI Processing Pipeline
```typescript
async function generateGuidance(transcript, context) {
  1. Extract recent conversation window (last 30 seconds)
  2. Identify current conversation phase
  3. Analyze emotional tone and engagement
  4. Retrieve relevant context documents
  5. Generate suggestions with <2s latency
  6. Filter for relevance and priority
  7. Return top 3 actionable insights
}
```

### State Synchronization
```typescript
- Transcript state syncs with database every 5 seconds
- Guidance updates trigger immediate UI refresh  
- Timeline builds incrementally to avoid reprocessing
- Checklist status persists across sessions
- All states recoverable after connection loss
```

## Unique Differentiators

### 1. Ultra-Low Latency
- Sub-2-second guidance generation
- Streaming transcription with <500ms delay
- Optimized prompt templates for speed

### 2. Context Awareness
- Maintains conversation history
- Understands document references
- Tracks discussion threads
- Recognizes conversation patterns

### 3. Adaptive Intelligence
- Adjusts to conversation style
- Learns from user feedback
- Personalizes suggestions over time
- Balances intervention frequency

### 4. Professional Focus
- Industry-specific templates
- Compliance-aware suggestions
- CRM integration ready
- Team performance analytics

## Security & Privacy

### Data Protection
- End-to-end encryption for audio streams
- Row-level security in database
- Automatic data retention policies
- GDPR compliance features
- No audio recording storage (only transcripts)

### Access Control
- Organization-based isolation
- Role-based permissions
- API key management
- Session-based authentication
- Audit trail logging

## Scalability Architecture

### Performance Optimizations
- Edge function deployment for low latency
- Incremental data loading
- Efficient caching strategies
- Database query optimization
- CDN for static assets

### Infrastructure Scaling
- Horizontal scaling for API servers
- Separate processing queues for AI
- Database read replicas
- Auto-scaling WebSocket servers
- Global CDN distribution

## Business Model

### Pricing Tiers

1. **Starter** ($29/month)
   - 10 hours of conversation
   - Basic AI guidance
   - 30-day transcript history
   - Email support

2. **Professional** ($99/month)
   - 50 hours of conversation
   - Advanced AI features
   - Unlimited history
   - Custom templates
   - Priority support

3. **Enterprise** (Custom)
   - Unlimited usage
   - Custom AI training
   - API access
   - Dedicated support
   - Compliance features

### Revenue Streams
- Monthly subscriptions
- Pay-per-use overages
- Enterprise contracts
- API access fees
- Custom AI training services

## Future Roadmap

### Phase 1 (Current)
- ✅ Real-time transcription
- ✅ Basic AI guidance
- ✅ Session management
- ✅ Document upload
- ✅ Summary generation

### Phase 2 (Q2 2024)
- 🔄 CRM integrations (Salesforce, HubSpot)
- 🔄 Team analytics dashboard
- 🔄 Mobile app development
- 🔄 Advanced sentiment analysis
- 🔄 Custom AI model training

### Phase 3 (Q3 2024)
- 📋 Video call support
- 📋 Multi-language support
- 📋 Industry-specific modules
- 📋 Automated follow-up generation
- 📋 Performance coaching AI

### Phase 4 (Q4 2024)
- 📋 Predictive conversation outcomes
- 📋 Real-time translation
- 📋 VR/AR integration
- 📋 Advanced team collaboration
- 📋 AI conversation simulation

## Technical Stack Summary

### Frontend
- **Framework**: Next.js 15.3.2 (App Router)
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **State**: Context API + Custom Hooks
- **Animation**: Framer Motion
- **Build**: Turbopack

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **File Storage**: Supabase Storage
- **Edge Functions**: Supabase Functions

### AI & Speech
- **Speech-to-Text**: Deepgram
- **AI Models**: Google Gemini 2.0 Flash (via OpenRouter)
- **Embeddings**: OpenAI Ada (future)
- **Vector DB**: pgvector (future)

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase Cloud
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics
- **Error Tracking**: Sentry (planned)

## Competitive Advantages

1. **Real-time Processing**: Unlike post-call analytics tools
2. **Contextual Intelligence**: Not just generic scripts
3. **Professional Focus**: Built for high-stakes conversations
4. **Low Latency**: Sub-2-second guidance
5. **Easy Integration**: Works with existing tools
6. **Privacy First**: No audio storage, only transcripts
7. **Customizable**: Adapts to industry needs
8. **Scalable**: From individual to enterprise

## Conclusion

liveprompt.ai represents the future of professional communication - where AI augments human conversation skills in real-time. By combining cutting-edge speech recognition, contextual AI, and thoughtful UX design, we're enabling professionals to have more successful, productive conversations every day.

The platform is designed to scale from individual users to large enterprises, with a clear path to becoming the standard tool for anyone who relies on conversations for their success.