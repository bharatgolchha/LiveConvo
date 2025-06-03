# Testing OpenRouter API Connection

## Quick Test Commands

### 1. Test Basic OpenRouter Connection
```bash
curl -X POST http://localhost:3001/api/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "openrouter"}'
```

### 2. Test Summary Generation with Sample Transcript
```bash
curl -X POST http://localhost:3001/api/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "summary"}'
```

### 3. Test Summary API Directly
```bash
curl -X POST http://localhost:3001/api/summary \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Speaker 1: Hello, let us discuss the project timeline.\nSpeaker 2: Sure, what are the key milestones?\nSpeaker 1: We need to deliver the prototype by end of month.\nSpeaker 2: I will start working on the design today.",
    "sessionId": "test-123",
    "conversationType": "meeting"
  }'
```

## What to Check

1. **OpenRouter API Key**: Make sure `OPENROUTER_API_KEY` is set in your `.env.local` file
2. **API Response**: Check the console logs for detailed debugging information
3. **JSON Parsing**: Look for any JSON parsing errors in the logs

## Common Issues

1. **API Key Not Set**: Check if the environment variable is properly loaded
2. **Invalid API Key**: Verify the key is correct and has proper permissions
3. **Model Access**: Ensure your OpenRouter account has access to `google/gemini-2.5-flash-preview-05-20`
4. **Rate Limits**: Check if you're hitting any rate limits

## Debug Output

When running these tests, check the terminal where your Next.js server is running for detailed logs:

- 🚀 Summary API Request
- 📤 Sending to OpenRouter
- 🤖 OpenRouter Full Response
- 📝 AI Raw Content
- ✅ Successfully parsed JSON (or 💥 JSON Parse Error)