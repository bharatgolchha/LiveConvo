# liveprompt.ai - AI-Powered Real-Time Conversation Coach

liveprompt.ai is an advanced AI conversation coaching platform that provides real-time guidance during live conversations. Whether you're in a sales call, interview, support session, or meeting, liveprompt.ai helps you communicate more effectively with AI-powered suggestions and analysis.

## 🚀 Features

- **Real-time AI Coaching**: Get live suggestions during conversations
- **Conversation Analysis**: Detailed summaries and timelines
- **Multiple Conversation Types**: Sales, Support, Meetings, Interviews
- **Live Transcription**: Real-time speech-to-text with Deepgram
- **Interactive Chat Coach**: Ask questions and get contextual guidance
- **Session Management**: Track and review past conversations
- **Multi-modal Input**: Upload context documents and files

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI**: OpenRouter API (OpenAI-compatible) with GPT-4o models
- **Transcription**: Deepgram API
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenRouter API key (for AI features)
- Deepgram API key (for transcription)
- Supabase account (for database and auth)

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd liveprompt.ai/frontend
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the `frontend` directory:

```bash
# OpenRouter API (Required for AI guidance)
OPENROUTER_API_KEY=your_openrouter_key_here

# Deepgram API (Required for transcription)
DEEPGRAM_API_KEY=your_deepgram_key_here

# Supabase (Optional - for data persistence)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Get Your API Keys

#### OpenRouter API Key (Required)
1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Go to the API Keys section
4. Create a new API key
5. Add it to your `.env.local` file

#### Deepgram API Key (Required for transcription)
1. Visit [Deepgram](https://deepgram.com/)
2. Sign up for an account
3. Navigate to the API Keys section
4. Create a new API key
5. Add it to your `.env.local` file

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to start using liveprompt.ai!

## 🔧 Configuration Options

### AI Models

liveprompt.ai uses OpenRouter API with the following models:
- **Chat Guidance**: `google/gemini-2.5-flash-preview-05-20` (interactive coaching)
- **Auto Guidance**: `google/gemini-2.5-flash-preview-05-20` (real-time analysis)
- **Summaries**: `google/gemini-2.5-flash-preview-05-20` (conversation summaries)
- **Timeline**: `google/gemini-2.5-flash-preview-05-20` (conversation timelines)

You can modify model selection in the respective API routes under `src/app/api/`.

### Conversation Types

- **Sales**: Customer conversations, lead qualification
- **Support**: Customer service and troubleshooting
- **Meetings**: Team meetings and discussions
- **Interviews**: Job interviews and assessments
- **General**: Any other conversation type

## 📚 Usage Guide

### Basic Workflow

1. **Setup**: Upload context documents, set conversation type
2. **Start Session**: Begin recording/transcription
3. **Get Guidance**: Receive real-time AI suggestions
4. **Chat Coach**: Ask questions during the conversation
5. **Review**: Analyze summaries and timelines afterward

### Key Features

- **Real-time Guidance**: Automatic suggestions based on conversation flow
- **Interactive Coach**: Chat interface for asking specific questions
- **Context-Aware**: Uses uploaded documents and conversation history
- **Multi-format Support**: Text documents, PDFs, and other file types
- **Session Management**: Track multiple conversations over time

## 🧪 Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Code Style

The project uses ESLint and Prettier for code formatting. Run:

```bash
npm run lint
npm run format
```

## 📖 Documentation

- [API Setup Guide](frontend/API_SETUP.md)
- [Authentication Setup](frontend/README_AUTH.md)
- [Deepgram Integration](DEEPGRAM_INTEGRATION.md)
- [Planning & Architecture](PLANNING.md)
- **[Supabase MCP Setup](SUPABASE_MCP_SETUP.md)** - Connect AI tools to your database

## 🤖 AI Development with MCP

liveprompt.ai supports the Model Context Protocol (MCP) for connecting AI tools directly to your Supabase database. This enables:

- **Automatic Database Context**: AI assistants can query your schema and data directly
- **Enhanced Development**: Get intelligent suggestions based on your actual database structure
- **Smart Analytics**: Generate insights from your liveprompt.ai data without manual queries

### Quick MCP Setup

1. **Create Supabase Personal Access Token**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard) → Settings → Access Tokens
   - Generate new token with appropriate scopes

2. **Configure Your AI Tool**
   - **Cursor**: Token goes in `.cursor/mcp.json` (already created)
   - **VS Code**: Use `.vscode/mcp.json` configuration
   - **Claude**: Copy `claude-mcp-config.json` to Claude settings

3. **Test Connection**
   - Ask your AI: *"What tables do I have in my liveprompt.ai database?"*
   - Follow the test guide in `test-mcp-connection.md`

For detailed setup instructions, see **[SUPABASE_MCP_SETUP.md](SUPABASE_MCP_SETUP.md)**.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the documentation files
2. Review existing issues
3. Create a new issue with detailed information

## 🔄 Migration from OpenAI

If you're migrating from a previous version that used OpenAI directly:

1. Replace `OPENAI_API_KEY` with `OPENROUTER_API_KEY` in your environment
2. Update any hardcoded references to OpenAI API endpoints
3. Models are now prefixed (e.g., `openai/gpt-4o-mini`)
4. All API calls now go through OpenRouter for better model access and pricing 

## 🚀 Deployment

### Production Environment

LiveConvo is deployed with the following infrastructure:

- **Platform**: Vercel
- **Database**: Supabase PostgreSQL
- **Production Database**: `juuysuamfoteblrqqdnu` (LiveConvo Production)
- **Development Database**: `ucvfgfbjcrxbzppwjpuu` (VoiceConvo Dev)

### Environment URLs

#### Production
- **Database URL**: `https://juuysuamfoteblrqqdnu.supabase.co`
- **Edge Functions**:
  - Stripe Webhooks: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/stripe-webhooks`
  - Create Checkout: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/create-checkout-session`
  - Billing Portal: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/create-portal-session`
  - Test Stripe Config: `https://juuysuamfoteblrqqdnu.supabase.co/functions/v1/test-stripe-config`

#### Development
- **Database URL**: `https://ucvfgfbjcrxbzppwjpuu.supabase.co`
- **Local Development**: `http://localhost:3000`

### Deployment Configuration

The project uses Vercel for deployment with the following configuration:

```json
{
  "buildCommand": "cd frontend && npm ci --include=dev && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Production Environment Variables

For production deployment, configure these environment variables in Vercel:

```bash
# Production Database
NEXT_PUBLIC_SUPABASE_URL=https://juuysuamfoteblrqqdnu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your production anon key from Supabase Dashboard]
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]

# API Keys
OPENROUTER_API_KEY=[Your OpenRouter API key]
DEEPGRAM_API_KEY=[Your Deepgram API key]

# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_[Your production Stripe secret key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[Your production Stripe publishable key]
STRIPE_WEBHOOK_SECRET=whsec_[Your production webhook secret]

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production
```

### Database Schema

The production database includes:
- **20 core tables** with complete relationships
- **Row-Level Security (RLS)** policies for data protection
- **Edge functions** for Stripe integration and billing
- **Default plans** (Free & Pro) with pricing configuration
- **Usage tracking** and analytics capabilities

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). 