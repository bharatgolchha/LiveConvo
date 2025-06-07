# Debug Script for Chrome Extension

## Finding the Exact Error Location

The error "Cannot read properties of undefined (reading 'create')" is happening somewhere in the service worker. To find exactly where:

### 1. Check Chrome Version & API Support

Run this in the service worker console:

```javascript
// Check Chrome version
console.log('Chrome version:', navigator.userAgent);

// Check available APIs
console.log('APIs available:', {
  alarms: !!chrome.alarms,
  notifications: !!chrome.notifications,
  sidePanel: !!chrome.sidePanel,
  tabCapture: !!chrome.tabCapture,
  storage: !!chrome.storage,
  tabs: !!chrome.tabs,
  runtime: !!chrome.runtime
});

// Check specific methods
console.log('Methods available:', {
  'alarms.create': !!(chrome.alarms && chrome.alarms.create),
  'notifications.create': !!(chrome.notifications && chrome.notifications.create),
  'tabs.create': !!(chrome.tabs && chrome.tabs.create),
  'sidePanel.open': !!(chrome.sidePanel && chrome.sidePanel.open)
});
```

### 2. Test Each API Individually

```javascript
// Test alarms
if (chrome.alarms && chrome.alarms.create) {
  chrome.alarms.create('test', { delayInMinutes: 1 }, () => {
    console.log('Alarm created successfully');
  });
} else {
  console.log('Alarms API not available');
}

// Test notifications
if (chrome.notifications && chrome.notifications.create) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/public/icon-128.png',
    title: 'Test',
    message: 'Test notification'
  }, (id) => {
    console.log('Notification created:', id);
  });
} else {
  console.log('Notifications API not available');
}

// Test tabs
if (chrome.tabs && chrome.tabs.create) {
  console.log('Tabs API is available');
} else {
  console.log('Tabs API not available');
}
```

### 3. Check Permissions

```javascript
// List all granted permissions
chrome.permissions.getAll((result) => {
  console.log('Permissions:', result.permissions);
  console.log('Origins:', result.origins);
});
```

### 4. Possible Solutions

Based on what's missing, try:

#### If alarms is missing:
- Check Chrome version (needs 22+)
- Verify "alarms" in manifest permissions

#### If notifications is missing:
- Check Chrome version (needs 28+)
- Verify "notifications" in manifest permissions
- User might have blocked notifications

#### If sidePanel is missing:
- Check Chrome version (needs 114+)
- This is expected in older versions

### 5. Quick Fix Test

Try this minimal service worker to isolate the issue:

```javascript
console.log('Service worker starting...');

// Only use APIs that exist
const apis = {
  hasAlarms: 'alarms' in chrome,
  hasNotifications: 'notifications' in chrome,
  hasSidePanel: 'sidePanel' in chrome,
  hasTabs: 'tabs' in chrome
};

console.log('Available APIs:', apis);

// Basic message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  sendResponse({ success: true });
  return true;
});

console.log('Service worker ready');
```

### 6. Common Causes

1. **Old Chrome Version**: Some APIs need newer Chrome
2. **Missing Permissions**: Check manifest.json
3. **Incognito Mode**: Some APIs restricted
4. **Enterprise Policy**: Admin might block features
5. **Corrupted Extension**: Try remove and re-add

### 7. Emergency Workaround

If nothing else works, create a minimal service worker:

```javascript
// Minimal working service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_STATE') {
    chrome.storage.local.get(['authState'], (result) => {
      sendResponse(result.authState || { isAuthenticated: false });
    });
    return true;
  }
  sendResponse({ error: 'Unknown message type' });
  return true;
});
```

This will at least let the popup work while we debug the full version.