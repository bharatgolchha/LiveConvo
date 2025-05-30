# LiveConvo - AI-Powered Real-Time Conversation Coach

LiveConvo is an advanced AI conversation coaching platform that provides real-time guidance during live conversations. Whether you're in a sales call, interview, support session, or meeting, LiveConvo helps you communicate more effectively with AI-powered suggestions and analysis.

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
cd LiveConvo/frontend
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

Visit `http://localhost:3000` to start using LiveConvo!

## 🔧 Configuration Options

### AI Models

LiveConvo uses OpenRouter API with the following models:
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