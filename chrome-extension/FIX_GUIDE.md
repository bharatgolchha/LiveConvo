# Extension Error Fix Guide

## ✅ Fixed Issues

### 1. **SidePanel API Error**
**Error**: `Cannot read properties of undefined (reading 'create')`
**Cause**: Missing `sidePanel` permission in manifest.json
**Solution**: Added `"sidePanel"` to permissions array

### 2. **Fallback for SidePanel**
**Issue**: SidePanel API might not be available in all Chrome versions
**Solution**: Added fallback to open sidebar in new tab if API unavailable

## 🔄 Steps to Apply Fix

1. **Reload the Extension**:
   - Go to `chrome://extensions/`
   - Find "LivePrompt AI Advisor"
   - Click the refresh icon (🔄) on the extension card
   - Or remove and re-add the extension

2. **Clear Any Errors**:
   - If you see "Errors" button, click it
   - Click "Clear all" to remove old errors
   - Refresh the extension again

## 🧪 Test the Fixed Extension

### Test 1: Basic Popup
1. Click extension icon
2. Should see login form without errors

### Test 2: Mock Authentication
In service worker console:
```javascript
chrome.storage.local.set({
  authState: {
    isAuthenticated: true,
    accessToken: 'test-token',
    userId: 'test-123',
    userEmail: 'test@example.com'
  }
});
```

### Test 3: Sidebar Opening
1. With mock auth active, click extension icon
2. Click "Open AI Advisor Panel"
3. Should either:
   - Open as sidebar (if Chrome supports it)
   - Open in new tab as fallback

## 📝 Chrome Version Notes

### SidePanel API Availability:
- **Chrome 114+**: Full sidePanel support
- **Chrome 88-113**: Extension works but sidebar opens in tab
- **Earlier versions**: May have other compatibility issues

To check your Chrome version:
1. Type `chrome://version/` in address bar
2. Look for version number (e.g., "120.0.6099.129")

## 🎯 What Should Work Now

✅ Extension loads without errors  
✅ Popup opens normally  
✅ Authentication flow works  
✅ Sidebar opens (either as panel or tab)  
✅ No console errors in service worker  

## 🚨 If Still Having Issues

1. **Complete Clean Reload**:
```bash
# Remove extension from Chrome
# Then in terminal:
cd chrome-extension
rm -rf dist
npm run build
# Re-add extension
```

2. **Check Chrome Flags**:
   - Go to `chrome://flags/`
   - Search for "side panel"
   - Ensure not disabled

3. **Try Incognito Mode**:
   - Enable extension in incognito
   - Test there for clean state

## ✨ The Extension is Now Ready!

The error has been fixed and the extension should work properly. The sidebar will use Chrome's native side panel when available, or open in a new tab as a fallback.