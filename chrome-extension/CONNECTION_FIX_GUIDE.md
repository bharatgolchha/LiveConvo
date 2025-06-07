# Connection Error Fix Guide

## ✅ Fixed: "Could not establish connection" Error

### What Caused This Error?
The popup was trying to communicate with the background service worker before it was ready, or the connection was interrupted.

### What I Fixed:
1. **Added error handling** to all `browser.runtime.sendMessage` calls
2. **Added fallback behavior** when connection fails
3. **Added connection retry logic**
4. **Made the UI more resilient** to connection issues

## 🔄 Steps to Apply the Fix

### 1. Reload the Extension
1. Go to `chrome://extensions/`
2. Find "LivePrompt AI Advisor"
3. Click the refresh button (🔄)

### 2. Clear Chrome Extension Cache (if needed)
```bash
# On Mac:
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Extension*

# On Windows:
# Delete contents of: %LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions
```

### 3. Test the Extension
1. Click the extension icon
2. The popup should load without errors
3. Check the service worker console for any remaining issues

## 🧪 Testing Connection

### Quick Test in Service Worker Console
```javascript
// Check if service worker is responding
chrome.runtime.sendMessage({type: 'GET_AUTH_STATE'}, response => {
  console.log('Service worker response:', response);
});

// Set mock auth to test UI
chrome.storage.local.set({
  authState: {
    isAuthenticated: true,
    accessToken: 'mock-token',
    userId: 'test-123',
    userEmail: 'test@example.com'
  }
}, () => {
  console.log('Mock auth set!');
});
```

## 🔍 Debugging Tips

### 1. Check Service Worker Status
- Go to `chrome://extensions/`
- Look at "service worker" - should say "Active"
- If it says "Inactive", click it to activate

### 2. Check for Errors
- Service worker console (background page)
- Popup DevTools (right-click icon → Inspect popup)
- Browser console (F12 on any page)

### 3. Common Issues & Solutions

**Service Worker Not Starting**
- Reload extension
- Check for syntax errors in background script
- Restart Chrome

**Popup Closes Too Fast**
- This is normal Chrome behavior
- Use console.log debugging
- Test in service worker console

**Storage Access Issues**
```javascript
// Test storage access
chrome.storage.local.get(null, (items) => {
  console.log('All storage items:', items);
});
```

## ✨ What Works Now

The extension now has:
- ✅ Graceful error handling
- ✅ Connection retry logic
- ✅ Fallback UI states
- ✅ Better debugging output
- ✅ Resilient messaging

## 🚀 Next Steps

1. **Test Basic Flow**:
   - Click extension icon
   - Login form should appear
   - No errors in console

2. **Test Mock Authentication**:
   - Run mock auth script above
   - Popup should show authenticated UI

3. **Test Features**:
   - Recording controls
   - Sidebar opening
   - Tab detection

## 💡 Pro Tips

1. **Always check service worker console first** - Most errors appear there
2. **Use mock data for testing** - Don't need real backend
3. **Reload extension after changes** - Chrome caches aggressively
4. **Check permissions** - Some features need explicit permissions

The connection errors should now be resolved! The extension will gracefully handle any communication issues and continue working.