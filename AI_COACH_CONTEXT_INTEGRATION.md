# AI Coach Context Integration

## Overview

This document describes the context integration feature for the AI Coach sidebar, which enables the AI to provide context-aware guidance during conversations by leveraging information from the Setup & Context drawer.

The AI Coach now receives comprehensive context from the conversation setup and provides intelligent, context-aware guidance that adapts to both preparation and live conversation scenarios.

## ✨ Features Implemented

### 🎯 Context-Aware AI Coaching

The AI Coach now receives and utilizes comprehensive context information to provide more relevant and targeted guidance:

- **Conversation Setup Context**: Title, type (sales/support/meeting/interview), and current state
- **Background Context**: User-provided text context and background notes
- **File Context**: Uploaded documents (PDF, DOC, TXT, MD) as additional context
- **Historical Context**: Selected previous conversation summaries
- **Real-time Context**: Current transcript length and conversation progress

### 🎯 **Dual-Mode Intelligence** ✨
The AI Coach automatically detects and adapts to two distinct scenarios:

1. **Preparation Mode**: When user is planning/brainstorming before the conversation starts
   - No active transcript available
   - Helps with meeting agenda planning, topic brainstorming, strategy development
   - Provides preparation frameworks and anticipatory guidance
   - Example: "Hi what should this meeting be about?" → Brainstorming agenda items and objectives

2. **Live Conversation Mode**: When user is actively participating in a conversation
   - Active transcript or contextual clues indicate live participation
   - Provides real-time guidance and immediate actionable advice
   - Helps with orientation, responses, and next steps
   - Example: "Hi what is this meeting about?" (with transcript) → Analysis of current discussion

### 🧠 **Context Detection Logic**
```typescript
// Automatic mode detection based on:
const hasActiveTranscript = transcript && transcript.trim().length > 0;
const isLiveConversation = hasActiveTranscript || 
  message.toLowerCase().includes('they') || 
  message.toLowerCase().includes('currently') || 
  message.toLowerCase().includes('right now');
```

### 🧠 Dynamic Quick Help System

The quick help system now provides completely different sets of suggestions based on both conversation type AND current mode (preparation vs. live):

#### 📋 Dual-Mode Quick Help Chips ✨

The quick help buttons adapt based on whether you're preparing for a conversation or actively participating in one:

**Preparation Mode Quick Help:**
- **Sales**: "🎯 Set call objectives", "🔍 Research prospect", "💡 Prepare questions", "📝 Plan agenda"
- **Support**: "📋 Review case history", "🔧 Prepare solutions", "📝 Plan approach", "🎯 Set expectations"  
- **Meeting**: "📋 Create agenda", "🎯 Define objectives", "💡 Brainstorm topics", "⏰ Plan timing"
- **Interview**: "📝 Review candidate", "❓ Prepare questions", "📊 Set criteria", "🎯 Plan structure"

**Live Conversation Mode Quick Help:**
- **Sales**: "💡 Discovery questions", "🎯 Closing techniques", "🛡️ Handle objections", "💰 Present value"
- **Support**: "🔍 Troubleshoot", "😊 Check satisfaction", "📝 Document issue", "⏰ Manage time"
- **Meeting**: "📋 Check agenda", "⏰ Manage time", "🤝 Capture actions", "🎯 Make decisions"
- **Interview**: "🎯 Assess response", "📚 Follow-up", "💡 Culture fit", "🔍 Deep dive"

**Dynamic Titles:**
- Shows "Preparation Sales Help" when planning
- Shows "Live Sales Help" when in active conversation
- Automatically detects mode based on recording status and transcript presence

#### Context-Aware Quick Help for Each Conversation Type

Context-aware quick help buttons that adapt based on conversation type:

#### Sales Conversations
- 💡 Discovery questions
- 🎯 Closing techniques  
- 🛡️ Handle objections
- 📊 Qualify prospect
- 💰 Value proposition
- 🤝 Next steps

#### Support Conversations
- 🔍 Troubleshooting
- 😊 Customer satisfaction
- 📝 Documentation
- ⏰ Response time
- 🔄 Follow-up
- 📞 Escalation

#### Meeting Conversations
- 📋 Agenda check
- ⏰ Time management
- 🤝 Action items
- 🎯 Key decisions
- 👥 Participation
- 📝 Summary

#### Interview Conversations
- 🎯 Assessment
- 📚 Follow-up questions
- 💡 Culture fit
- 🔍 Deep dive
- ⚖️ Decision criteria
- 📝 Key takeaways

### 📊 Context Summary Display

Real-time context summary showing:
- **Conversation Type & Title**: Visual icon and conversation details
- **Background Notes**: User-provided context (truncated for space)
- **Context Indicators**: File count, previous conversations, transcript lines
- **Toggle Functionality**: Show/hide context summary

### 🔧 Technical Implementation

#### Component Architecture

```typescript
interface ContextSummary {
  conversationTitle: string;
  conversationType: 'sales' | 'support' | 'meeting' | 'interview';
  textContext: string;
  uploadedFiles: File[];
  selectedPreviousConversations: string[];
  previousConversationTitles: string[];
}

interface AICoachSidebarProps {
  // ... existing props
  contextSummary?: ContextSummary;
  transcriptLength?: number;
  conversationState?: string;
}
```

#### Context Integration Flow

1. **Context Collection**: Main app passes context from Setup & Context drawer
2. **Context Processing**: AI Coach processes context for display and message enhancement
3. **Message Enhancement**: User messages are prefixed with context information
4. **Dynamic UI**: Quick help buttons and placeholders adapt to conversation type
5. **Visual Indicators**: Context summary shows relevant information at a glance

#### Message Context Prefixing

User messages are automatically enhanced with context:
```
Original: "What should I ask next?"
Enhanced: "[Context: sales - Product Demo Call] What should I ask next?"
```

### 🎨 Visual Design

- **Context Summary Section**: Gradient background with conversation type icon
- **Smart Indicators**: File count, previous conversations, transcript lines
- **Adaptive UI**: Placeholder text and help buttons change based on context
- **Toggle Control**: Hide/show context summary with smooth animations
- **Conversation Type Badges**: Visual indicators in collapsed state

### 🧪 Testing

Comprehensive test suite with 15 test cases covering:
- ✅ Basic rendering without context
- ✅ Context summary display
- ✅ Context-aware quick help for all conversation types
- ✅ Message context integration
- ✅ Context summary toggle functionality
- ✅ Placeholder text adaptation
- ✅ Collapsed state display
- ✅ Graceful handling of missing/empty context
- ✅ Quick help button interactions

## 🚀 Usage

### For Users

1. **Setup Context**: Configure conversation title, type, and background notes in Setup & Context drawer
2. **Upload Files**: Add relevant documents for additional context
3. **Select Previous Conversations**: Choose relevant past conversations for continuity
4. **Start Conversation**: AI Coach automatically receives all context information
5. **Get Context-Aware Help**: Use quick help buttons tailored to your conversation type
6. **Ask Contextual Questions**: AI responses consider your setup and background

### For Developers

#### Passing Context to AI Coach

```typescript
<AICoachSidebar
  // ... other props
  contextSummary={{
    conversationTitle,
    conversationType,
    textContext,
    uploadedFiles,
    selectedPreviousConversations,
    previousConversationTitles
  }}
  transcriptLength={transcript.length}
  conversationState={conversationState}
/>
```

#### Extending Context Types

To add new conversation types:

1. Update `ContextSummary` interface
2. Add type to `getConversationTypeInfo()`  
3. Add quick help configuration to `getContextAwareQuickHelp()`
4. Add corresponding icon and colors

## 🔄 Integration Points

### Setup & Context Drawer
- Provides conversation configuration
- Manages file uploads and previous conversation selection
- Passes all context data to main app

### Main App Component
- Aggregates context from various sources
- Passes consolidated context to AI Coach
- Maintains context state throughout conversation

### AI Guidance System  
- Receives enhanced messages with context prefixes
- Can utilize context information for better responses
- Provides more relevant and targeted guidance

## 📈 Benefits

1. **Improved Relevance**: AI guidance is tailored to specific conversation types and context
2. **Better Continuity**: Previous conversations provide historical context
3. **Enhanced Preparation**: Background notes and files inform AI responses
4. **Streamlined UX**: Context-aware quick help reduces cognitive load
5. **Visual Clarity**: Context summary provides at-a-glance situation awareness

## 🔮 Future Enhancements

- **File Content Parsing**: Extract and analyze uploaded document content
- **Previous Conversation Deep Integration**: Automatically load relevant summaries
- **Context-Based Templates**: Pre-filled templates based on conversation type
- **Smart Context Suggestions**: AI-recommended context based on conversation flow
- **Context History**: Track how context influences conversation outcomes 