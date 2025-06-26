# Environment Variables

This file contains the required environment variables for the LiveConvo project. Replace the sample values with your actual credentials.

## Development Environment (.env.local)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# API Keys
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key
GOOGLE_GEMINI_API_KEY=AIza-your-google-gemini-api-key
OPENAI_API_KEY=sk-proj-your-openai-api-key
DEEPGRAM_API_KEY=your-deepgram-api-key

# Recall AI Configuration
RECALL_AI_API_KEY=your-recall-ai-api-key
RECALL_AI_REGION=us-west-2

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
```

## Production Environment

For production deployment, ensure you have the following additional variables:

```bash
# Production Database
NEXT_PUBLIC_SUPABASE_URL=https://juuysuamfoteblrqqdnu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Stripe (Production) - if using payments
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
APP_URL=https://your-production-domain.com
NODE_ENV=production
```

## Environment Variable Descriptions

- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Public anonymous key for Supabase
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for server-side Supabase operations
- **OPENROUTER_API_KEY**: API key for OpenRouter (AI model access)
- **GOOGLE_GEMINI_API_KEY**: Google Gemini API key for AI services
- **OPENAI_API_KEY**: OpenAI API key (if using OpenAI models)
- **DEEPGRAM_API_KEY**: Deepgram API key for speech-to-text services
- **RECALL_AI_API_KEY**: Recall.ai API key for meeting bot integration
- **RECALL_AI_REGION**: AWS region for Recall.ai services
- **NEXT_PUBLIC_APP_URL**: Public-facing application URL
- **APP_URL**: Server-side application URL

## Getting Your API Keys

1. **Supabase**: Create a project at [supabase.com](https://supabase.com) and find your keys in Settings > API
2. **OpenRouter**: Sign up at [openrouter.ai](https://openrouter.ai) to get your API key
3. **Google Gemini**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. **OpenAI**: Create an API key at [platform.openai.com](https://platform.openai.com)
5. **Deepgram**: Sign up at [deepgram.com](https://deepgram.com) for speech-to-text API access
6. **Recall.ai**: Contact Recall.ai for API access and documentation

## Security Notes

- Never commit `.env.local` or any file containing real API keys
- Keep `SUPABASE_SERVICE_ROLE_KEY` secure - it bypasses Row Level Security
- Use different API keys for development and production environments
- Rotate API keys regularly for security