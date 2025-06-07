# Final Troubleshooting Guide

## The "Cannot read properties of undefined" Error

This error is happening because one of the Chrome APIs is trying to call `.create()` on something that doesn't exist.

## Immediate Solutions

### Solution 1: Reload Extension Properly
1. Go to `chrome://extensions/`
2. **Remove** the extension completely (not just disable)
3. Close all Chrome windows
4. Reopen Chrome
5. Load the extension fresh from the `dist` folder

### Solution 2: Check Chrome Version
Type `chrome://version/` in address bar. You need:
- Chrome 88+ for basic extension features
- Chrome 114+ for sidePanel API

### Solution 3: Test in a New Chrome Profile
1. Open Chrome menu → Settings → Add person
2. Create new profile
3. Load extension in the new profile
4. This eliminates conflicts with other extensions

### Solution 4: Use Simplified Service Worker
If the error persists, temporarily use the simplified version:

1. Edit `webpack.config.js`:
```javascript
entry: {
  'background/service-worker': './src/background/service-worker-simple.ts',
  // ... rest of entries
},
```

2. Rebuild: `npm run build`
3. Reload extension

## Debugging the Exact Cause

In the service worker console, run:

```javascript
// Find which API is undefined
console.log({
  browser: typeof browser !== 'undefined',
  chrome: typeof chrome !== 'undefined',
  'chrome.alarms': chrome.alarms,
  'chrome.notifications': chrome.notifications,
  'chrome.tabs': chrome.tabs,
  'chrome.sidePanel': chrome.sidePanel
});
```

## Common Fixes by Error Location

### If it's `alarms.create`:
- Your Chrome might be too old (needs v22+)
- Try without alarms for now

### If it's `notifications.create`:
- Check if notifications are blocked for extensions
- Chrome Settings → Privacy → Site Settings → Notifications

### If it's `sidePanel.open`:
- This is normal for Chrome < 114
- The extension already has a fallback

## Nuclear Option: Minimal Extension

If nothing works, create a minimal test:

1. Create new folder `test-extension`
2. Add minimal `manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Test",
  "version": "1.0",
  "background": {
    "service_worker": "background.js"
  }
}
```

3. Add minimal `background.js`:
```javascript
console.log('Test extension loaded');
```

4. If this fails too, it's a Chrome installation issue

## Most Likely Cause

Based on the error pattern, it's probably:
1. **Chrome version** - Update Chrome
2. **Corrupted extension state** - Remove and re-add
3. **Permission policy** - Check enterprise policies

## Quick Working Version

For immediate use while debugging:
1. Remove all problematic API calls
2. Use only core features (storage, tabs, runtime)
3. Add features back one by one

The extension WILL work - we just need to find which specific API is causing issues in your Chrome installation.