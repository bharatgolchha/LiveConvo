# Quick Test Guide - LivePrompt AI Chrome Extension

## ✅ Extension Successfully Built!

The code you're seeing is the compiled JavaScript - this is normal and means the build worked.

## 🚀 Loading the Extension

### Step 1: Open Chrome Extensions Page
1. Open Chrome
2. Type in address bar: `chrome://extensions/`
3. Press Enter

### Step 2: Enable Developer Mode
- Look for "Developer mode" toggle in the top right
- Turn it ON (it should be blue/enabled)

### Step 3: Load the Extension
1. Click the "Load unpacked" button (top left)
2. Navigate to this exact folder:
   ```
   /Users/bharatgolchha/CursorProjects/LiveConvo/chrome-extension/dist
   ```
3. Click "Select" or "Open"

### Step 4: Verify It Loaded
You should see:
- "LivePrompt AI Advisor" card in the extensions list
- Version: 1.0.0
- No errors (if there are errors, there will be an "Errors" button)

## 📍 Finding Your Extension

### Pin the Extension:
1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find "LivePrompt AI Advisor"
3. Click the pin icon (📌) next to it
4. The extension icon should now appear in your toolbar

## 🧪 First Test

### Test 1: Click the Extension Icon
- You should see a popup window with a login form
- The popup should be 400px wide

### Test 2: Check the Background Script
1. On chrome://extensions/ page
2. Find "LivePrompt AI Advisor"
3. Click "service worker" link
4. A DevTools window opens - this is the background script console
5. You should see no red errors

### Test 3: Mock Login (for testing UI)
In the service worker console, paste and run:
```javascript
chrome.storage.local.set({
  authState: {
    isAuthenticated: true,
    accessToken: 'test-token',
    userId: 'test-123',
    userEmail: 'test@example.com'
  }
});
console.log('Mock auth set! Close and reopen the popup.');
```

Now click the extension icon again - you should see the authenticated UI!

## 🎯 What You Should See

### Before Mock Login:
```
┌─────────────────────────┐
│   🧠 LivePrompt AI      │
│                         │
│   Email: [_________]    │
│   Password: [______]    │
│                         │
│      [Sign In]          │
│                         │
│   Forgot password?      │
│   Sign up               │
└─────────────────────────┘
```

### After Mock Login:
```
┌─────────────────────────┐
│ LivePrompt AI      ⚙️ ❓ │
├─────────────────────────┤
│ Signed in as            │
│ test@example.com    →   │
├─────────────────────────┤
│ Recording Source:       │
│ [Tab Audio] [Microphone]│
│                         │
│  [Start Recording]      │
│                         │
│ [Open AI Advisor Panel] │
└─────────────────────────┘
```

## 🔍 Troubleshooting

### If Extension Doesn't Load:
1. Make sure you selected the `dist` folder, not `chrome-extension`
2. Check for error messages on the extension card
3. Try removing and re-adding

### If Popup Doesn't Open:
1. Make sure extension is pinned
2. Try disabling other extensions
3. Check service worker console for errors

### If You See "Minified Code":
- That's the compiled JavaScript - it's supposed to look like that!
- Use Chrome DevTools to debug (service worker link)

## ✨ Success Indicators

✅ Extension loads without errors  
✅ Icon appears in toolbar  
✅ Popup opens when clicked  
✅ Login form is visible  
✅ No errors in service worker console  

## 🎉 Next Steps

1. Test the mock login flow
2. Click "Open AI Advisor Panel" to test sidebar
3. Visit meet.google.com to test meeting detection
4. Try the recording controls

The extension is ready for testing! All core UI components are in place.