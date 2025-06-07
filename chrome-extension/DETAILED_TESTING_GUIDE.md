# Detailed Chrome Extension Testing Guide

## 🚀 Initial Setup

### 1. Build the Extension
```bash
cd chrome-extension
npm install  # If not already done
npm run build
```

This creates the `dist` folder with your built extension.

### 2. Load Extension in Chrome

1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable Developer Mode** - Toggle switch in top right corner
3. **Click "Load unpacked"** button
4. **Select the `dist` folder** from the file browser
5. **Verify** - You should see "LivePrompt AI Advisor" in your extensions list

![Extension Loaded](Successfully loaded indicator)

### 3. Pin the Extension
- Click the puzzle piece icon in Chrome toolbar
- Find "LivePrompt AI Advisor"
- Click the pin icon to keep it visible

## 🧪 Step-by-Step Testing Guide

### Test 1: Extension Popup (Basic UI)

1. **Click the extension icon** in toolbar
2. **Expected**: A popup window (400x500px) should appear

**What to check:**
- [ ] LivePrompt AI logo/icon appears
- [ ] Login form is visible
- [ ] "Sign up" and "Forgot password" links work
- [ ] Dark mode works (if system is in dark mode)

**Screenshot what you should see:**
```
┌─────────────────────────┐
│   🧠 LivePrompt AI      │
│   Sign in to start...   │
│ ┌─────────────────────┐ │
│ │ Email               │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Password            │ │
│ └─────────────────────┘ │
│   [Sign In]             │
│                         │
│  Don't have account?    │
│     Sign up             │
└─────────────────────────┘
```

### Test 2: Authentication Flow

#### 2a. Test Login (Without Backend)
1. Enter any email/password
2. Click "Sign In"
3. **Expected**: Loading spinner, then error (since backend isn't connected)

#### 2b. Mock Authentication (For UI Testing)
To test the authenticated UI without a backend, modify the extension:

1. Open Chrome DevTools for the extension:
   - Go to `chrome://extensions/`
   - Find LivePrompt AI Advisor
   - Click "background page" under "Inspect views"

2. In the console, run:
```javascript
// Mock authentication
chrome.storage.local.set({
  authState: {
    isAuthenticated: true,
    accessToken: 'mock-token',
    userId: 'test-user-123',
    userEmail: 'test@example.com'
  }
});
```

3. Close and reopen the popup
4. **Expected**: You should now see the authenticated UI

### Test 3: Authenticated Popup Interface

With mock auth active, test:

- [ ] User email displays correctly
- [ ] "Dashboard" link opens new tab
- [ ] Recording source selector works (Tab Audio / Microphone)
- [ ] "Start Recording" button is enabled
- [ ] "Open AI Advisor Panel" button works
- [ ] Settings and Help icons are clickable

### Test 4: Sidebar Panel

1. Click "Open AI Advisor Panel" in popup
2. **Expected**: Sidebar opens on the right side of the browser

**Test in sidebar:**
- [ ] AI Advisor tab is active
- [ ] Transcript tab is clickable
- [ ] "No Active Session" message appears
- [ ] Sign out button works

### Test 5: Meeting Platform Detection

1. Navigate to a meeting platform:
   - `https://meet.google.com/new` (creates test meeting)
   - `https://zoom.us/test` (Zoom test page)
   - `https://teams.microsoft.com`

2. **Expected**:
   - Notification appears: "Meeting Detected"
   - Floating blue button appears (bottom-right)
   - Popup shows "google meet meeting detected"

### Test 6: Recording Flow

1. On a meeting page, open the popup
2. Select "Tab Audio"
3. Click "Start Recording"

**Expected sequence:**
- Loading spinner appears
- Chrome permission prompt may appear
- Badge shows "REC" on extension icon
- If no backend: Error notification

### Test 7: Content Script Injection

1. On any meeting platform page
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. **Expected**: You should see:
   ```
   LivePrompt AI content script loaded
   ```

### Test 8: Chrome DevTools Debugging

#### For Background Script:
1. `chrome://extensions/` → LivePrompt AI → "background page"
2. Check for any errors in console
3. Test commands:
```javascript
// Check auth state
chrome.storage.local.get(['authState'], (result) => console.log(result));

// Simulate recording start
chrome.runtime.sendMessage({type: 'GET_ACTIVE_SESSION'}, (response) => console.log(response));
```

#### For Popup:
1. Right-click extension icon → "Inspect popup"
2. Check Console for errors
3. Check Network tab for API calls

#### For Sidebar:
1. Open sidebar → Right-click → "Inspect"
2. Test React components in React DevTools

## 🔍 Advanced Testing

### Test 9: Storage Persistence

1. Set mock auth (as shown above)
2. Close Chrome completely
3. Reopen Chrome
4. Click extension icon
5. **Expected**: Still logged in

### Test 10: Error Handling

Test various error scenarios:

1. **No Internet**: Disconnect internet, try to login
2. **Invalid Credentials**: Use wrong email format
3. **Tab Permissions**: Deny microphone access
4. **Multiple Tabs**: Open extension in multiple tabs

### Test 11: UI Components

With sidebar open and mock session active:

```javascript
// In background page console, create mock session
chrome.storage.local.set({
  activeSession: {
    id: 'test-session-123',
    recordingStartTime: Date.now(),
    source: 'tab',
    conversationType: 'meeting'
  }
});

// Send update message
chrome.runtime.sendMessage({
  type: 'SESSION_UPDATED',
  session: {
    id: 'test-session-123',
    recordingStartTime: Date.now(),
    source: 'tab',
    conversationType: 'meeting'
  }
});
```

Then test:
- [ ] AI Advisor shows guidance UI
- [ ] Chat button opens chat interface
- [ ] Quick action chips are clickable
- [ ] Transcript tab shows empty state

### Test 12: Performance Testing

1. Open Chrome Task Manager (Shift+Esc)
2. Find "Extension: LivePrompt AI Advisor"
3. Monitor:
   - Memory usage (should be <50MB idle)
   - CPU usage (should be ~0% when idle)

## 🐛 Common Issues & Solutions

### Extension Not Loading
```bash
# Check for build errors
npm run build

# Look for errors in:
# - manifest.json syntax
# - Missing files in dist/
# - Invalid permissions
```

### Popup Closes Immediately
- This is normal Chrome behavior
- Use sidebar for persistent UI

### "Cannot read property of undefined"
- Usually means API calls failing
- Check Network tab in DevTools
- Verify mock data is set correctly

### Sidebar Not Opening
- Some Chrome versions need:
```javascript
// In background console
chrome.sidePanel.open({windowId: chrome.windows.WINDOW_ID_CURRENT});
```

## 📊 Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Popup opens and renders correctly
- [ ] Login form validates input
- [ ] Dark mode matches system theme
- [ ] All buttons have hover states

### Navigation
- [ ] External links open in new tabs
- [ ] Sidebar opens/closes properly
- [ ] Tab switching works in sidebar
- [ ] Back navigation works

### State Management
- [ ] Auth state persists after reload
- [ ] Session state updates in real-time
- [ ] Recording state shows in badge
- [ ] Error states display properly

### Integration Points
- [ ] Meeting detection works
- [ ] Floating button appears on meeting pages
- [ ] Content script loads on target sites
- [ ] Storage API works correctly

### UI/UX Polish
- [ ] Loading states appear during async operations
- [ ] Error messages are user-friendly
- [ ] Animations are smooth
- [ ] Icons load correctly
- [ ] Responsive to different screen sizes

## 🎯 Quick Test Script

For rapid testing, save this as `test-extension.js` and run in background page console:

```javascript
// Quick test script
async function testExtension() {
  console.log('🧪 Starting extension tests...');
  
  // Test 1: Storage
  await chrome.storage.local.set({test: 'data'});
  const stored = await chrome.storage.local.get(['test']);
  console.log('✓ Storage:', stored.test === 'data' ? 'PASS' : 'FAIL');
  
  // Test 2: Message passing
  try {
    const response = await chrome.runtime.sendMessage({type: 'GET_AUTH_STATE'});
    console.log('✓ Messaging:', response ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('✗ Messaging: FAIL', e.message);
  }
  
  // Test 3: Tab query
  const tabs = await chrome.tabs.query({active: true});
  console.log('✓ Tab API:', tabs.length > 0 ? 'PASS' : 'FAIL');
  
  // Test 4: Permissions
  const perms = await chrome.permissions.getAll();
  console.log('✓ Permissions:', perms);
  
  console.log('🎉 Tests complete!');
}

testExtension();
```

## 🚀 Next Steps After Testing

1. **Document any bugs** found during testing
2. **Take screenshots** of working features
3. **Note performance metrics**
4. **Test on different sites** beyond meeting platforms
5. **Try different Chrome profiles**

## 💡 Pro Tips

1. **Use Chrome Canary** for testing latest Chrome APIs
2. **Enable verbose logging** in background script for debugging
3. **Test in Incognito** to ensure it works with fresh state
4. **Use Chrome's Guest profile** for clean testing
5. **Test with slow network** (DevTools → Network → Slow 3G)

Remember: Since the backend isn't connected yet, focus on:
- UI/UX testing
- Component interaction
- State management
- Error handling
- Performance baseline

Happy Testing! 🎉