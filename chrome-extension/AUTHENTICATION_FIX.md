# Authentication Fix - Chrome Extension

## Issue Fixed
The "Failed to create session" error was occurring because the RecordingControl component was making direct API calls without authentication headers.

## Solution Implemented

### 1. Service Worker Updates
- Added `CREATE_SESSION` message handler in service worker
- Created `createSession` method that properly includes the Bearer token from Supabase
- Updated `startRecording` to accept sessionId instead of sessionData

### 2. RecordingControl Component Updates
- Changed from direct `fetch` calls to using `browser.runtime.sendMessage`
- Session creation now goes through the authenticated service worker
- Proper error handling and user feedback

## How It Works Now

1. **User clicks "Start Recording"**
2. **RecordingControl sends CREATE_SESSION message** to service worker
3. **Service worker creates session** with authenticated API call
4. **RecordingControl receives session** and sends START_RECORDING message
5. **Service worker starts recording** with the session ID

## Testing Instructions

1. **Reload the extension**
   - Go to `chrome://extensions/`
   - Click the refresh button on LivePrompt extension

2. **Test authentication**
   - Click the extension icon
   - Login with your liveprompt.ai credentials
   - You should see your email displayed

3. **Test recording**
   - Open any tab (preferably a meeting platform)
   - Click "Start Recording"
   - The session should be created successfully
   - Check the service worker console for logs

## Debugging

If issues persist:
1. **Check service worker console**:
   - Go to `chrome://extensions/`
   - Click "service worker" link
   - Look for authentication errors

2. **Verify token**:
   - In service worker console, type:
   ```javascript
   this.authState
   ```
   - Should show session with access_token

3. **Check API response**:
   - Network tab in service worker DevTools
   - Look for `/api/sessions` requests
   - Verify Authorization header is present