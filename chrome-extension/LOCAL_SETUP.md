# Local Backend Setup Guide

## Prerequisites
- The LivePrompt frontend running locally on port 3000
- Chrome extension built with local API configuration

## Setup Steps

### 1. Start the Local Backend
```bash
cd frontend
npm run dev
```
The frontend/backend should now be running at http://localhost:3000

### 2. Update Chrome Extension
1. Go to `chrome://extensions/`
2. Click the refresh button on LivePrompt extension
3. Or reload the extension if you just built it

### 3. Test Authentication
1. Click the LivePrompt extension icon
2. Login with your local credentials
3. The extension will now use http://localhost:3000 for all API calls

### 4. Verify API Calls
1. Open the service worker console:
   - Go to `chrome://extensions/`
   - Click "service worker" link under LivePrompt
2. Try creating a session
3. Check Network tab to ensure calls go to localhost:3000

## Configuration

The API base URL is configured in `src/config/api.ts`:
```typescript
export const API_CONFIG = {
  baseUrl: 'http://localhost:3000',
  // ...
}
```

To switch between local and production:
- Local: `baseUrl: 'http://localhost:3000'`
- Production: `baseUrl: 'https://liveprompt.ai'`

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure your local backend allows requests from Chrome extensions:
- Origin: `chrome-extension://[your-extension-id]`

### Connection Refused
- Verify the backend is running on port 3000
- Check if you need to use a different port
- Ensure no firewall is blocking localhost connections

### Authentication Failures
- Local backend may use different Supabase instance
- Check if credentials match between extension and local setup
- Verify Supabase configuration in both environments