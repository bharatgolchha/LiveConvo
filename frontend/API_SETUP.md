# API Setup Guide - OpenRouter Integration

This guide will help you set up the required API keys for LiveConvo, which has migrated from OpenAI to OpenRouter for better model access and pricing.

## Why OpenRouter?

OpenRouter provides:
- **Better Pricing**: Often cheaper than direct OpenAI API
- **Model Variety**: Access to multiple AI providers in one API
- **Reliability**: Built-in fallbacks and redundancy
- **OpenAI Compatibility**: Same request/response format as OpenAI

## Required API Keys

### 1. OpenRouter API Key (Required)

OpenRouter provides access to OpenAI models (and many others) through a unified API.

**Steps to get your OpenRouter API key:**

1. **Sign up**: Go to [https://openrouter.ai/](https://openrouter.ai/) and create an account
2. **Verify Email**: Check your email and verify your account
3. **Add Credits**: Go to the Credits section and add some credits to your account
   - Minimum: $5 recommended for testing
   - OpenRouter typically costs 10-50% less than direct OpenAI API
4. **Generate API Key**: 
   - Navigate to "API Keys" in your dashboard
   - Click "Create API Key"
   - Give it a name like "LiveConvo"
   - Copy the generated key (starts with `sk-or-...`)

5. **Add to Environment**:
   ```bash
   OPENROUTER_API_KEY=sk-or-your-actual-api-key-here
   ```

### 2. Deepgram API Key (Required for Transcription)

Deepgram provides high-quality speech-to-text transcription.

**Steps to get your Deepgram API key:**

1. **Sign up**: Go to [https://deepgram.com/](https://deepgram.com/)
2. **Complete Registration**: Verify your email and complete setup
3. **Get Free Credits**: Deepgram provides $200 in free credits for new accounts
4. **Generate API Key**:
   - Go to your dashboard
   - Navigate to "API Keys"
   - Create a new API key
   - Copy the key

5. **Add to Environment**:
   ```bash
   DEEPGRAM_API_KEY=your-deepgram-api-key-here
   ```

## Environment File Setup

Create a `.env.local` file in the `frontend` directory with your API keys:

```bash
# OpenRouter API (Required for AI features)
OPENROUTER_API_KEY=sk-or-your-actual-api-key-here

# Deepgram API (Required for transcription)  
DEEPGRAM_API_KEY=your-deepgram-api-key-here

# Optional: Supabase (for data persistence)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Models Used

LiveConvo uses these specific models through OpenRouter:

- **Chat Guidance**: `google/gemini-2.5-flash-preview-05-20` - Fast, high-quality for interactive chat
- **Auto Guidance**: `google/gemini-2.5-flash-preview-05-20` - Advanced capability for complex analysis
- **Summaries**: `google/gemini-2.5-flash-preview-05-20` - Efficient for content summarization  
- **Timeline**: `google/gemini-2.5-flash-preview-05-20` - Good for structured data extraction

## Cost Estimation

### OpenRouter Pricing (approximate)
- **Gemini 2.5 Flash**: ~$0.075/1M input tokens, ~$0.30/1M output tokens

### Deepgram Pricing
- **Nova-2**: $0.0043 per minute of audio
- **Free tier**: $200 in credits (≈46,000 minutes)

### Typical Usage Costs
- **1-hour conversation**: ~$0.25-0.50 total (transcription + AI analysis)
- **Monthly active user**: ~$5-15 depending on usage

## Testing Your Setup

After setting up your API keys, test them:

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Check API Status**:
   - Visit `http://localhost:3000/api/config`
   - Should return `{"openrouter": true, "deepgram": true}`

3. **Test AI Features**:
   - Upload a context document
   - Start a conversation
   - Ask the AI coach a question
   - Verify you get responses

## Troubleshooting

### Common Issues

**"OpenRouter API key not configured"**
- Ensure your `.env.local` file is in the `frontend` directory
- Check the key starts with `sk-or-`
- Restart your development server after adding the key

**"Insufficient credits"**
- Add more credits to your OpenRouter account
- Check your usage dashboard on OpenRouter

**"Model not available"**
- Some models may require special access
- Try switching to `openai/gpt-3.5-turbo` in the API routes for testing

**Rate Limiting**
- OpenRouter has built-in rate limiting
- Upgrade your OpenRouter account for higher limits

### Getting Help

1. **OpenRouter Support**: [https://openrouter.ai/docs](https://openrouter.ai/docs)
2. **Deepgram Support**: [https://developers.deepgram.com/](https://developers.deepgram.com/)
3. **LiveConvo Issues**: Create an issue in the GitHub repository

## Migration from OpenAI

If you were previously using direct OpenAI API:

1. **Replace Environment Variable**:
   ```bash
   # Old
   OPENAI_API_KEY=sk-...
   
   # New  
   OPENROUTER_API_KEY=sk-or-...
   ```

2. **Update Code References** (if you have custom implementations):
   - Endpoint: `https://api.openai.com/v1/chat/completions` → `https://openrouter.ai/api/v1/chat/completions`
   - Models: `gpt-4o-mini` → `openai/gpt-4o-mini`
   - Headers: Add `HTTP-Referer` and `X-Title` for app identification

3. **Benefits of Migration**:
   - Lower costs (typically 10-50% savings)
   - Better reliability with automatic fallbacks
   - Access to other model providers if needed
   - Unified billing across different AI providers

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys regularly** (monthly recommended)
4. **Monitor usage** through provider dashboards
5. **Set spending alerts** to avoid unexpected charges

---

You should now have LiveConvo set up with OpenRouter and Deepgram APIs! The application will provide real-time AI coaching during your conversations. 