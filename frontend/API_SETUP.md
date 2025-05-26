# OpenAI API Key Setup

To enable AI guidance functionality in LiveConvo, you need to configure your OpenAI API key.

## Setup Instructions

1. **Get your OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key or use an existing one
   - Copy the API key (starts with `sk-`)

2. **Configure Environment Variables**
   - Open `frontend/.env.local`
   - Replace `your_openai_api_key_here` with your actual API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Restart the Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

## Security Notes

- ✅ API key is stored server-side only (secure)
- ✅ Never exposed to the browser/client
- ✅ Used only for server-side API calls
- ✅ `.env.local` is automatically ignored by git

## Features Enabled

With a valid API key configured:
- ✨ Real-time AI conversation guidance
- 🎯 Context-aware suggestions
- 📝 Conversation analysis
- 🔍 Smart recommendations

## Troubleshooting

If AI guidance isn't working:
1. Check that your API key is valid and starts with `sk-`
2. Ensure you have sufficient OpenAI API credits
3. Restart the development server after changing `.env.local`
4. Check the browser console for any error messages 