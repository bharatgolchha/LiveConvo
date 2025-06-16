# Authentication Recovery Guide

## Quick Fix (Browser Console)

If you're stuck and can't sign in or sign out, open your browser console (F12) and run:

```javascript
// Clear all auth data
Object.keys(localStorage).forEach(k => k.includes('supabase') || k.includes('sb-') ? localStorage.removeItem(k) : null);
Object.keys(sessionStorage).forEach(k => k.includes('supabase') || k.includes('sb-') ? sessionStorage.removeItem(k) : null);
window.location.href = '/';
```

## Recovery Options

### Option 1: Use the Recovery Page
Navigate to: `/auth/recovery`

This page will:
- Clear all authentication data
- Reset your session
- Redirect you to the homepage

### Option 2: Manual Browser Clear
1. Open Developer Tools (F12)
2. Go to Application tab
3. Clear Local Storage, Session Storage, and Cookies
4. Refresh the page

### Option 3: Use the Clear Script
```bash
# In your browser console, run:
node frontend/src/scripts/clear-auth.js
```

## What We Fixed

1. **Enhanced Auth Context**
   - Better error detection for auth failures
   - Automatic cleanup of invalid sessions
   - Force sign out even when Supabase fails

2. **Auth Utilities**
   - `clearAuthData()` - Clears all auth-related storage
   - `isAuthError()` - Detects auth-related errors
   - `handleAuthError()` - Automatic recovery flow

3. **Recovery Page**
   - `/auth/recovery` - Dedicated recovery page
   - Clears all auth data automatically
   - Provides clear next steps

4. **Error Boundary**
   - Catches unhandled auth errors
   - Automatic redirect to recovery
   - Prevents infinite error loops

## Prevention Tips

1. **Regular Session Refresh**
   - The app now handles token refresh automatically
   - If you see session warnings, sign out and back in

2. **Clear Browser Data**
   - If issues persist, clear browser cache
   - Try incognito/private mode

3. **Check Network**
   - Ensure stable internet connection
   - Check if Supabase services are operational

## Common Error Messages

- "Auth session missing!" - Your session expired or is invalid
- "Refresh token expired" - Need to sign in again
- "401 Unauthorized" - Authentication required

All these errors will now automatically redirect to recovery.

## Still Having Issues?

1. Try a different browser
2. Check browser console for specific errors
3. Ensure cookies are enabled
4. Check if JavaScript is enabled
5. Contact support with error details