# Chrome Extension Authentication Persistence Solution

## Overview

This document explains the comprehensive authentication persistence solution implemented for the LivePrompt Chrome extension to prevent frequent logouts when connected to the production server.

## Key Problems Solved

1. **Service Worker Suspension**: Chrome suspends inactive service workers, causing loss of in-memory authentication state
2. **Token Expiration**: Access tokens expire after 1 hour without proper refresh
3. **Incorrect Refresh Endpoint**: Previous implementation used wrong Supabase endpoint
4. **Missing Refresh Tokens**: API wasn't returning refresh tokens
5. **No Recovery Mechanisms**: Single point of failure when auth failed

## Solution Components

### 1. Chrome Alarms for Keep-Alive

Added Chrome alarms to prevent service worker suspension:
- **auth-refresh**: Runs every 4 minutes to check and refresh tokens
- **keep-alive**: Runs every 30 seconds to keep service worker active

```javascript
chrome.alarms.create('auth-refresh', { periodInMinutes: 4 });
chrome.alarms.create('keep-alive', { periodInMinutes: 0.5 });
```

### 2. Token Expiration Tracking

Implemented proactive token refresh:
- Stores `tokenExpiresAt` timestamp when token is received
- Checks if token expires in next 5 minutes
- Refreshes token before expiration

```javascript
const expiresIn5Min = tokenExpiresAt - 5 * 60 * 1000;
if (Date.now() >= expiresIn5Min) {
  await refreshAccessToken();
}
```

### 3. Fixed Supabase Token Refresh

Corrected the refresh token endpoint:
- **Old**: `${WEB_BASE_URL}/auth/v1/token?grant_type=refresh_token`
- **New**: `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`
- Added proper `apikey` header

### 4. Dynamic Supabase Configuration

Instead of hardcoding sensitive keys:
- Created `/api/auth/extension-config` endpoint
- Fetches Supabase URL and anon key dynamically
- Stores config in chrome.storage.local for offline use

### 5. Enhanced API Routes

Updated authentication routes to return refresh tokens:
- `/api/auth/extension-login`: Now returns `refresh_token`
- `/api/auth/check-session`: Extracts and returns refresh token from cookies

### 6. Multiple Recovery Methods

Implemented fallback chain for 401 errors:
1. Try refresh token via Supabase
2. Try web session sync
3. Check web session cookies
4. Only logout if all methods fail

```javascript
if (response.status === 401 && retry) {
  // Try Method 1: Refresh token
  if (refreshToken && await refreshAccessToken()) {
    refreshed = true;
  }
  // Try Method 2: Web session sync
  if (!refreshed && await refreshWebSession()) {
    refreshed = true;
  }
  // Try Method 3: Check web session
  if (!refreshed && await checkWebSession()) {
    refreshed = true;
  }
}
```

### 7. Improved Web Session Detection

Enhanced `web-session.js` content script:
- Polls localStorage every 1.5 seconds for token changes
- Detects both access and refresh tokens
- Sends tokens to background immediately on change
- Handles logout detection

## Storage Structure

The extension stores the following in `chrome.storage.local`:
```javascript
{
  authToken: string,        // Current access token
  refreshToken: string,     // Refresh token for renewal
  tokenExpiresAt: number,   // Timestamp when token expires
  supabaseUrl: string,      // Dynamic Supabase project URL
  supabaseAnonKey: string,  // Dynamic Supabase anon key
  userId: string,           // User ID
  userEmail: string         // User email
}
```

## Authentication Flow

1. **Initial Login**:
   - User enters credentials in popup
   - Extension calls `/api/auth/extension-login`
   - Receives access token, refresh token, and user info
   - Fetches Supabase config from `/api/auth/extension-config`
   - Stores everything in chrome.storage.local
   - Sets up Chrome alarms

2. **Token Refresh**:
   - Chrome alarm triggers every 4 minutes
   - Checks if token expires in next 5 minutes
   - Calls Supabase refresh endpoint with refresh token
   - Updates stored tokens and expiration

3. **Web Session Sync**:
   - Content script monitors localStorage for Supabase tokens
   - Detects login/logout on LivePrompt website
   - Sends tokens to extension background
   - Extension fetches config and syncs state

4. **Error Recovery**:
   - On 401 error, tries multiple recovery methods
   - Maintains auth state through service worker restarts
   - Only logs out user after all recovery attempts fail

## Testing the Solution

1. **Install Extension**: Load unpacked extension in Chrome
2. **Login**: Use email/password or Google OAuth
3. **Verify Persistence**:
   - Check chrome://extensions - service worker should stay active
   - Wait >1 hour - token should auto-refresh
   - Close/reopen browser - should remain logged in
   - Login on website - extension should sync automatically

## Monitoring

Check logs in service worker console:
- "Auth refresh alarm triggered" - Every 4 minutes
- "Keep-alive ping" - Every 30 seconds  
- "Token refreshed successfully" - When token renewed
- "Synced session from web login" - When web sync occurs

## Future Improvements

1. Add token encryption before storage
2. Implement token rotation on each refresh
3. Add telemetry for auth success/failure rates
4. Consider using chrome.storage.session for sensitive data

## Troubleshooting

If authentication still fails:
1. Check if Supabase anon key is correct in production environment
2. Verify CORS settings allow extension origin
3. Check if refresh token is being returned by auth endpoints
4. Monitor Network tab for failed refresh attempts
5. Clear extension storage and re-login

This solution ensures robust authentication persistence by combining proactive token refresh, service worker keep-alive, multiple recovery methods, and seamless web session synchronization.