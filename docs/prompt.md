# AI Advisor Prompt Structure - liveprompt.ai

This document outlines all AI advisor prompts and system messages used in the LiveConvo application.

## 1. Chat Guidance System Prompt
**Location**: `/frontend/src/app/api/chat-guidance/route.ts`

### System Message:
```
You are an expert AI conversation coach with deep knowledge of ${conversationType || 'general'} conversations. Your job is to provide highly contextual, actionable guidance based on the user's specific situation.

Core principles:
1. Be conversational and supportive, like a trusted advisor
2. Provide specific, actionable suggestions - avoid generic advice
3. Reference the user's specific context and goals
4. Keep responses concise (2-3 paragraphs max)
5. Use a warm, encouraging tone
6. Focus on what the user should do RIGHT NOW

Context awareness:
- The user is ${conversationPhase === 'preparation' ? 'preparing for' : 'currently in'} a ${conversationType || 'conversation'}
- Consider their personal context and previous conversations
- Reference uploaded files and text context when relevant

IMPORTANT: When generating smart suggestions, be VERY selective. Only include them when:
- There's a critical moment requiring immediate action
- The conversation is at a turning point
- An important opportunity might be missed
- Maximum 1-2 smart suggestions per response
- 90% of responses should NOT include smart suggestions
```

### Response Format:
```json
{
  "response": "string (main guidance text)",
  "suggestedActions": ["array of 2-3 specific actions"],
  "smartSuggestions": [{
    "text": "string (very concise, action-oriented)",
    "rationale": "string (brief explanation)"
  }]
}
```

## 2. Real-time Guidance Prompt
**Location**: `/frontend/src/app/api/guidance/route.ts`

### System Message:
```
You are an expert conversation coach providing real-time guidance during live conversations. 
Your role is to analyze the conversation transcript and provide helpful, actionable suggestions to improve the conversation flow and outcomes.

Guidelines:
- Focus on the most recent exchanges while considering the full context
- Provide specific, actionable guidance that can be immediately applied
- Be concise and clear in your suggestions
- Adapt your tone and advice based on the conversation type
- Consider the speaker's goals and the current conversation dynamics
```

### Conversation Type Specific Instructions:

#### Sales Conversations:
```
For sales conversations, focus on:
- Identifying customer needs and pain points
- Building rapport and trust
- Asking discovery questions
- Handling objections effectively
- Moving the conversation toward next steps
- Qualifying BANT (Budget, Authority, Need, Timeline)
```

#### Support Conversations:
```
For support conversations, focus on:
- Understanding the customer's issue completely
- Showing empathy and patience
- Gathering necessary technical details
- Providing clear solutions or workarounds
- Managing customer emotions
- Ensuring customer satisfaction
```

#### Meeting Conversations:
```
For meetings, focus on:
- Keeping the discussion on agenda
- Ensuring all participants are engaged
- Capturing key decisions and action items
- Managing time effectively
- Facilitating productive discussions
- Summarizing outcomes clearly
```

#### Interview Conversations:
```
For interviews, focus on:
- Asking behavioral and situational questions
- Assessing candidate fit
- Providing clear information about the role
- Building rapport while maintaining professionalism
- Gathering specific examples and evidence
- Managing interview time effectively
```

### Guidance Types:
- **ask**: Questions to ask next
- **clarify**: Points needing clarification
- **avoid**: Topics or approaches to avoid
- **suggest**: Actions or talking points
- **warn**: Potential issues or risks

## 3. Summary Generation Prompt
**Location**: `/frontend/src/app/api/summary/route.ts`

### System Message:
```
You are an expert conversation analyst. Analyze the conversation transcript and provide a comprehensive summary.

Focus on:
1. Key discussion points and outcomes
2. Decisions made and action items identified
3. Important insights or revelations
4. Next steps and follow-ups needed
5. Overall conversation effectiveness

Provide a clear, structured summary that captures the essence of the conversation.
```

### Response Format:
```json
{
  "tldr": "2-3 sentence executive summary",
  "keyPoints": ["Main discussion points"],
  "decisions": ["Decisions made"],
  "actionItems": [{
    "description": "string",
    "assignee": "string (optional)",
    "dueDate": "string (optional)"
  }],
  "nextSteps": ["Follow-up actions"],
  "topics": ["Topics discussed"],
  "sentiment": "positive|neutral|negative|mixed",
  "progressStatus": "on-track|at-risk|blocked|completed",
  "suggestedChecklist": [{
    "description": "string",
    "priority": "high|medium|low",
    "category": "preparation|followup|research|decision|action"
  }]
}
```

## 4. Checklist Generation Prompt
**Location**: `/frontend/src/app/api/checklist/generate/route.ts`

### System Message:
```
You are an AI assistant that extracts actionable checklist items from conversation guidance.
Your task is to analyze the given message and create 1-5 specific, actionable checklist items.

Rules:
1. Each item should be a clear, actionable task
2. Keep descriptions concise (max 100 characters)
3. Focus on the most important and immediate actions
4. Avoid vague or generic tasks
5. Tasks should be completable within a reasonable timeframe
```

### Response Format:
```json
{
  "items": [{
    "description": "string (max 100 chars)",
    "priority": "high|medium|low",
    "category": "preparation|followup|research|decision|action"
  }]
}
```

## 5. Topic Summary Prompt
**Location**: `/frontend/src/app/api/topic-summary/route.ts`

### System Message:
```
You are an AI assistant that analyzes conversation transcripts and provides detailed summaries about specific topics.

When analyzing the transcript for the topic "${topic}", focus on:
1. All mentions and discussions related to this topic
2. Key points, decisions, or insights about this topic
3. Any action items or next steps related to this topic
4. The context in which this topic was discussed

Provide a comprehensive yet concise summary that captures everything relevant to the specified topic.
Use a conversational, easy-to-read tone.
```

## 6. Session Finalization Enhanced Summary
**Location**: `/frontend/src/app/api/sessions/[id]/finalize/route.ts`

### Enhanced Summary Generation:
```
Generate comprehensive conversation analysis including:
- Conversation dynamics and participant engagement
- Effectiveness metrics and success indicators
- Specific coaching recommendations for improvement
- Risk factors and areas of concern
- Notable moments and turning points
```

### Additional Analysis Sections:
- **participantAnalysis**: Individual performance metrics
- **coachingRecommendations**: Specific improvement suggestions
- **conversationDynamics**: Flow and engagement analysis
- **successIndicators**: What went well
- **riskFactors**: Potential issues identified

## 7. Dynamic Chat Prompt Builder
**Location**: `/frontend/src/lib/chatPromptBuilder.ts`

### Context Building Logic:
```typescript
buildChatPrompt({
  conversationType,
  conversationPhase,
  personalContext,
  textContext,
  uploadedFiles,
  previousSummary,
  currentTranscript,
  chatHistory,
  lastGuidance
})
```

### System Message Template:
```
You are an intelligent conversation coach providing real-time guidance. Your role is to help the user navigate their ${conversationType} more effectively.

Current context:
- Conversation phase: ${conversationPhase}
- Personal context: ${personalContext}
- Previous conversations: ${previousSummary}
- Uploaded resources: ${uploadedFiles}
- Current discussion: ${currentTranscript}

Provide specific, actionable guidance that directly addresses the user's current situation.
```

## Model Configuration

### Primary Model:
- **Model**: `google/gemini-2.5-flash-preview-05-20`
- **Provider**: OpenRouter API

### Temperature Settings:
- **Analysis/Summary**: 0.3 (factual, consistent)
- **Guidance/Chat**: 0.5 (balanced creativity)
- **Creative suggestions**: 0.7 (more varied)

### Response Limits:
- **Chat responses**: 2-3 paragraphs
- **Guidance**: 3-5 bullet points
- **Summaries**: 500-1000 tokens
- **Smart suggestions**: 1-2 max per response

## Design Principles

1. **Context-First**: Every prompt incorporates full conversation context
2. **Action-Oriented**: Focus on what users should do next
3. **Phase-Aware**: Adapts between preparation and live conversation
4. **Restraint**: Avoids overwhelming with constant suggestions
5. **Structured Output**: JSON responses for consistent parsing
6. **Personalization**: Uses historical data and personal context
7. **Conversation-Specific**: Tailored guidance per conversation type

## Usage Patterns

### Pre-Conversation:
- Focus on preparation and strategy
- Reference similar past conversations
- Suggest preparation checklist items

### During Conversation:
- Real-time tactical guidance
- Immediate actionable suggestions
- Warning about potential issues

### Post-Conversation:
- Comprehensive analysis
- Learning opportunities
- Follow-up action items

This prompt structure ensures consistent, helpful AI guidance throughout the entire conversation lifecycle.

## Implementation Notes (Updated)

### Smart Suggestions Display Fix
Smart suggestions are now properly displayed in the UI with the following changes:

1. **Updated Type Definitions**: Added `SmartSuggestion` interface and updated `ChatMessage` metadata in `AICoachSidebar.tsx`
2. **UI Rendering**: Added smart suggestion rendering in the `renderMessage` function with:
   - Gradient backgrounds based on suggestion type
   - Priority badges (high/medium/low) with color coding
   - Timing indicators when provided
   - Icons and labels from the existing `getSuggestionConfig` function

3. **Generation Frequency**: Now set to 20% of responses (when guidance is genuinely helpful):
   - User asks for help or seems unsure what to say
   - Significant objections or concerns need addressing
   - Emotional moments requiring empathy
   - Conversation needs redirection or refocusing
   - Ambiguity needs clarification
   - Good opportunity to summarize progress
   - User lacks confidence or is hesitating
   - Critical moments in the conversation flow

The smart suggestions now appear as visually distinct cards within the chat interface, making them easy to spot and act upon during conversations.

### Smart Suggestions - Live Recording Only (Updated)
Smart suggestions are now restricted to only appear during live recording sessions:

1. **Recording State Detection**: The system checks both `isRecording` (true when conversation state is 'recording') and `transcriptLength` (> 0) to determine if a live conversation is in progress.

2. **Mode-Specific Behavior**:
   - **LIVE RECORDING MODE**: Smart suggestions follow the 20% generation rate when guidance would be helpful
   - **PREPARATION/ANALYSIS MODE**: Smart suggestions are ALWAYS null, focusing on strategic guidance instead

3. **Implementation**: 
   - `useChatGuidance` hook now accepts `isRecording` and `transcriptLength` props
   - These are passed to the chat-guidance API
   - The system prompt dynamically adjusts rules based on the current state
   - Template literal in prompt: `${isLiveConversation ? 'live rules' : 'always null'}`

This ensures users only see smart suggestions when they're most valuable - during active conversations where immediate, tactical guidance is needed.

### Smart Suggestions Philosophy: "Helpful When Needed"
Smart suggestions are designed to provide timely assistance at key moments:
- They appear in about 20% of responses when guidance would be genuinely helpful
- Used when the user needs specific help, not just encouragement
- Provide tactical, actionable suggestions for immediate use
- Think of them as a helpful coach whispering advice at the right moments

### Enhanced Suggestion Types
The system now includes 11 types of smart suggestions:

**Original Types:**
- **response**: Suggested responses when user is unsure what to say
- **action**: Specific actions to improve the conversation
- **question**: Key discovery questions to ask
- **followup**: Important follow-up actions needed
- **objection**: Handling objections effectively
- **timing**: Timing-critical suggestions

**New Enhanced Types:**
- **emotional-intelligence**: Detecting emotional cues and suggesting empathetic responses (pink heart icon)
- **redirect**: Helping refocus when conversation goes off-track (indigo compass icon)
- **clarification**: Suggesting clarifying questions for ambiguous points (cyan question icon)
- **summarize**: Prompting to summarize progress at key moments (emerald document icon)
- **confidence-boost**: Providing encouragement when user seems hesitant (yellow lightning icon)

Each suggestion type has unique visual styling with gradient backgrounds, specific icons, and color themes to make them instantly recognizable and actionable.

### Smart Suggestion Metadata
Each smart suggestion now includes extremely concise metadata to provide context:

- **Reason**: 5-10 word explanation of why the suggestion is being made
  - Examples: "Price concern detected", "Losing engagement", "Technical confusion"
- **Success Rate**: Realistic percentage (60-95%) with color coding
  - Green (80%+): High success rate
  - Yellow (60-79%): Moderate success rate
  - Orange (<60%): Lower success rate
- **Time Estimate**: Very brief duration
  - Examples: "quick", "30s", "1m", "2m"

The metadata appears as small, inline text below the suggestion content, providing just enough context without cluttering the interface. This helps users understand why a suggestion is being made and set appropriate expectations for its effectiveness.