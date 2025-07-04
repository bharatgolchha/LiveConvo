# 🤖 AI Agent Guide - LiveConvo Development

## 📋 Overview

This guide provides essential information for AI agents working on the LiveConvo codebase. Follow these conventions, patterns, and best practices to maintain code quality and consistency.

## 🎯 Project Context

**LiveConvo** is a real-time AI conversation coaching platform that provides:
- Real-time transcription and AI guidance during live conversations
- Interactive chat coaching with contextual suggestions
- Comprehensive conversation summaries and analytics
- Session management with billing and usage tracking

## 🏗️ Architecture & Tech Stack

### Core Technologies
- **Frontend**: Next.js 15.3.2, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API routes, Supabase PostgreSQL
- **AI**: OpenRouter API with Google Gemini 2.5 Flash models
- **Transcription**: Deepgram API
- **Deployment**: Vercel + Supabase

### Database Environments
- **Development**: `ucvfgfbjcrxbzppwjpuu` (VoiceConvo Dev)
  - URL: https://ucvfgfbjcrxbzppwjpuu.supabase.co
- **Production**: `xkxjycccifwyxgtvflxz` (livePrompt Live) 
  - URL: https://xkxjycccifwyxgtvflxz.supabase.co
  - Region: us-west-1 (US West)
  - Status: Production-ready with full schema and edge functions

### Supabase MCP Configuration
The database is Postgres hosted on Supabase. Please use Supabase MCP for anything database related:
```json
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
```

### Production Environment Variables
```bash
# Production Database
NEXT_PUBLIC_SUPABASE_URL=https://xkxjycccifwyxgtvflxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Get from Supabase Dashboard - production anon key]
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]
```

**⚠️ IMPORTANT**: Always test database changes in development environment first before applying to production!

## ✅ DO's - Essential Guidelines

### 🔧 **Code Quality & Structure**
- **✅ Use TypeScript** for all new code with proper type definitions
- **✅ Follow existing patterns** - study similar components before creating new ones
- **✅ Keep files under 500 lines** - split into modules if approaching this limit
- **✅ Use descriptive variable names** - `transcriptText` not `txt`
- **✅ Add proper error handling** with user-friendly messages
- **✅ Use existing UI components** from `/components/ui/` before creating new ones

### 🗄️ **Database Operations**
- **✅ Use Supabase MCP** for all database-related tasks
- **✅ Check schema.md** and `temp_schema_dump.sql` for latest schema
- **✅ Apply RLS policies** for all user data tables
- **✅ Use proper foreign key relationships** as defined in schema
- **✅ Test database changes** in development environment first

### 🤖 **AI Integration**
- **✅ Use OpenRouter API** (not direct OpenAI) for all AI functionality
- **✅ Use `google/gemini-2.5-flash-preview-05-20`** as the primary model
- **✅ Include proper headers**: `HTTP-Referer` and `X-Title` for OpenRouter
- **✅ Implement proper error handling** for API failures
- **✅ Use structured JSON responses** for consistency

### 🧪 **Testing & Reliability**
- **✅ Create Pytest unit tests** for new functions and features
- **✅ Test edge cases** and failure scenarios
- **✅ Update existing tests** when modifying logic
- **✅ Mock external APIs** in tests (Supabase, OpenRouter, Deepgram)

### 📝 **Documentation**
- **✅ Update TASK.md** when completing tasks
- **✅ Add docstrings** using Google style for all functions
- **✅ Comment complex logic** with `# Reason:` explanations
- **✅ Update README.md** when adding new features or dependencies

## ❌ DON'T's - Critical Restrictions

### 🚫 **Code Anti-Patterns**
- **❌ Never create files over 500 lines** - refactor instead
- **❌ Don't use direct OpenAI API** - use OpenRouter instead
- **❌ Don't hardcode API keys** - use environment variables
- **❌ Don't commit sensitive data** - check .gitignore
- **❌ Don't create unnecessary comments** - code should be self-documenting
- **❌ Don't use `any` type** - define proper TypeScript interfaces

### 🗄️ **Database Don'ts**
- **❌ Never bypass RLS policies** - they protect user data
- **❌ Don't modify production database directly** - use migrations
- **❌ Don't hardcode UUIDs** - use proper foreign key relationships
- **❌ Don't ignore unique constraints** - especially on transcripts table
- **❌ Don't create tables without proper indexes** - check performance impact

### 🤖 **AI Integration Don'ts**
- **❌ Don't use deprecated OpenAI endpoints** - everything goes through OpenRouter
- **❌ Don't ignore rate limiting** - implement proper throttling
- **❌ Don't make excessive API calls** - batch requests when possible
- **❌ Don't ignore API errors** - provide fallback responses
- **❌ Don't use inconsistent models** - stick to Gemini 2.5 Flash

### 🔒 **Security Don'ts**
- **❌ Never expose service role keys** to frontend
- **❌ Don't skip authentication checks** in API routes
- **❌ Don't trust user input** - validate and sanitize
- **❌ Don't log sensitive information** - API keys, user data, etc.

## 🎨 Code Conventions

### 📁 **File Organization**
```
frontend/src/
├── app/              # Next.js app router pages
│   ├── api/          # API routes
│   ├── dashboard/    # Dashboard pages
│   └── auth/         # Authentication pages
├── components/       # React components
│   ├── ui/           # Shared UI components (Radix)
│   ├── conversation/ # Conversation-specific components
│   └── guidance/     # AI guidance components
├── lib/              # Utilities and hooks
│   ├── hooks/        # Custom React hooks
│   └── utils/        # Helper functions
└── types/            # TypeScript type definitions
```

### 🏷️ **Naming Conventions**
- **Components**: PascalCase (`ConversationContent.tsx`)
- **Files**: kebab-case (`real-time-audio.ts`)
- **Variables**: camelCase (`transcriptText`, `isRecording`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Database tables**: snake_case (`session_timeline_events`)

### 🎯 **Component Patterns**
```typescript
// ✅ Good: Proper TypeScript interface
interface ConversationProps {
  sessionId: string;
  isRecording: boolean;
  onTranscriptUpdate: (text: string) => void;
}

// ✅ Good: Descriptive component with proper error handling
export default function ConversationContent({ 
  sessionId, 
  isRecording, 
  onTranscriptUpdate 
}: ConversationProps) {
  // Implementation with proper error boundaries
}
```

## 🔄 Common Workflows

### 🆕 **Adding New Features**
1. **Check TASK.md** - ensure task is documented
2. **Study existing patterns** - find similar implementations
3. **Create TypeScript interfaces** - define proper types
4. **Implement with error handling** - graceful failures
5. **Add unit tests** - cover main use cases and edge cases
6. **Update documentation** - README.md, TASK.md
7. **Test in development** - verify functionality
8. **Mark task complete** - update TASK.md

### 🗄️ **Database Changes**
1. **Use Supabase MCP** - never direct SQL unless specified
2. **Check current schema** - review schema.md
3. **Create migration** - use `mcp_supabase_apply_migration`
4. **Test in development** - verify changes work
5. **Update schema documentation** - if significant changes
6. **Apply to production** - when ready for deployment

### 🤖 **AI Feature Development**
1. **Use OpenRouter API** - never direct OpenAI
2. **Follow existing patterns** - check `/api/guidance` or `/api/chat-guidance`
3. **Use Gemini 2.5 Flash** - consistent model across features
4. **Implement proper error handling** - API failures, rate limits
5. **Add structured responses** - JSON format for consistency
6. **Test with real data** - verify AI responses are helpful

## 🚨 Critical Patterns

### 🔐 **Authentication Pattern**
```typescript
// ✅ Always check authentication in API routes
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 🤖 **OpenRouter API Pattern**
```typescript
// ✅ Correct OpenRouter implementation
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://liveconvo.app',
    'X-Title': 'liveprompt.ai Feature Name',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-preview-05-20',
    messages: [...],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  })
});
```

### 🗄️ **Database Query Pattern**
```typescript
// ✅ Proper RLS-aware query with error handling
const { data, error } = await supabase
  .from('sessions')
  .select('*')
  .eq('user_id', user.id)
  .single();

if (error) {
  console.error('Database error:', error);
  return NextResponse.json({ error: 'Database error' }, { status: 500 });
}
```

## 🔍 Debugging & Troubleshooting

### 🐛 **Common Issues**
- **Transcript duplication**: Check unique constraints on `session_id + sequence_number`
- **RLS policy errors**: Verify user has proper organization membership
- **API rate limits**: Implement proper throttling and error handling
- **Environment variables**: Ensure all required vars are set in deployment

### 📊 **Useful Database Queries**
```sql
-- Check recent sessions
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10;

-- Debug transcript issues  
SELECT session_id, sequence_number, COUNT(*) 
FROM transcripts 
GROUP BY session_id, sequence_number 
HAVING COUNT(*) > 1;

-- Check user organization membership
SELECT u.email, om.role, o.name 
FROM users u 
JOIN organization_members om ON u.id = om.user_id 
JOIN organizations o ON om.organization_id = o.id;
```

## 📚 Key Files to Reference

### 📖 **Essential Documentation**
- **TASK.md** - Current tasks and project status
- **schema.md** - Complete database schema
- **PLANNING.md** - Architecture and design decisions
- **CLAUDE.md** - Technical implementation details

### 🔧 **Key Implementation Files**
- **`/lib/supabase.ts`** - Database client configuration
- **`/app/api/*/route.ts`** - API endpoint implementations
- **`/components/conversation/`** - Core conversation components
- **`/lib/hooks/`** - Custom React hooks for state management

## 🎯 Success Metrics

When working on LiveConvo, aim for:
- **Code Quality**: TypeScript strict mode, proper error handling
- **Performance**: <2s API response times, efficient database queries
- **User Experience**: Intuitive interfaces, helpful error messages
- **Reliability**: Graceful fallbacks, comprehensive testing
- **Maintainability**: Clear code structure, proper documentation

---

**Remember**: LiveConvo is a production application serving real users. Every change should enhance the user experience while maintaining system reliability and performance. 