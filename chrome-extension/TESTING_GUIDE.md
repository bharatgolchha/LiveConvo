# Chrome Extension Testing Guide

## Prerequisites
- Chrome browser version 88+ (version 114+ for sidebar support)
- A valid liveprompt.ai account

## Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

## Testing Authentication

### Login
1. Click the LivePrompt extension icon in your toolbar
2. Click "Sign In" in the popup
3. Enter your liveprompt.ai credentials:
   - Email: your_email@example.com
   - Password: your_password
4. Click "Sign In" button

### Verify Authentication
- After successful login, you should see:
  - Your email displayed in the popup
  - "Open AI Coach" button enabled
  - Access to recording features

### Troubleshooting Login Issues
1. Check Chrome DevTools Console:
   - Right-click extension icon → "Inspect popup"
   - Check for error messages

2. Verify Supabase connection:
   - Open background service worker console:
     - Go to `chrome://extensions/`
     - Find LivePrompt extension
     - Click "service worker" link
   - Check for auth state logs

3. Common issues:
   - Wrong credentials: Double-check email/password
   - Network issues: Ensure you have internet connection
   - Session expired: Try logging out and back in

## Next Steps
Once authentication is working:
1. Test the AI Coach sidebar
2. Test conversation recording features
3. Integrate Deepgram for real-time transcription

## Development Mode
For development with hot reload:
```bash
npm run dev
```

Then reload the extension in Chrome when you make changes.