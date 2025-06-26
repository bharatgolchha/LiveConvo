# Building an Electron App for Desktop Recording

This guide explains how to build an Electron application that uses the Recall.ai Desktop Recording SDK to record Zoom and Google Meet calls locally.

## Why Electron?

The Recall.ai Desktop Recording SDK requires:
- Access to native system APIs (screen capture, audio devices)
- Ability to spawn child processes
- File system access for recordings
- Detection of native applications (Zoom, Google Meet)

These capabilities are not available in web browsers due to security restrictions.

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  liveprompt.ai      │────▶│  Your Backend    │────▶│   Recall.ai     │
│  (Web Browser)      │     │  (API Routes)    │     │   API Server    │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
         ▲                           ▲
         │                           │
         │   WebSocket/HTTP API      │
         └───────────────────────────┤
                                    │
                          ┌─────────────────────┐
                          │   Electron App      │
                          │  (Desktop Client)   │
                          │  - Desktop SDK      │
                          │  - Recording Logic  │
                          └─────────────────────┘
                                    │
                          ┌─────────────────────┐
                          │  Zoom/Google Meet   │
                          │  (Native Apps)      │
                          └─────────────────────┘
```

## Step 1: Create Electron App Structure

```bash
mkdir liveprompt-desktop
cd liveprompt-desktop
npm init -y
```

## Step 2: Install Dependencies

```bash
npm install electron @recallai/desktop-sdk dotenv
npm install --save-dev @types/node typescript webpack webpack-cli
```

## Step 3: Create Main Process (main.js)

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const RecallAiSdk = require('@recallai/desktop-sdk');
require('dotenv').config();

let mainWindow;
let recordingState = new Map();

// Initialize Recall SDK
RecallAiSdk.init({
  apiUrl: process.env.RECALL_AI_API_URL || 'https://us-east-1.recall.ai',
  acquirePermissionsOnStartup: ['accessibility', 'screen-capture', 'microphone'],
  restartOnError: true,
});

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
}

// Set up SDK event listeners
RecallAiSdk.addEventListener('meeting-detected', async (evt) => {
  const { window } = evt;
  console.log('Meeting detected:', window);
  
  // Notify the web app via API
  await notifyWebApp('meeting-detected', {
    windowId: window.id,
    title: window.title,
    platform: window.platform,
  });
  
  // Update UI
  mainWindow.webContents.send('meeting-detected', window);
});

RecallAiSdk.addEventListener('recording-started', async (evt) => {
  mainWindow.webContents.send('recording-started', evt.window);
});

RecallAiSdk.addEventListener('recording-ended', async (evt) => {
  mainWindow.webContents.send('recording-ended', evt.window);
  
  // Auto-upload when recording ends
  RecallAiSdk.uploadRecording({ windowId: evt.window.id });
});

RecallAiSdk.addEventListener('realtime-event', async (evt) => {
  if (evt.type === 'transcript') {
    // Send transcript to web app
    await sendTranscriptToWebApp(evt.window.id, evt.data);
  }
});

// IPC handlers for renderer process
ipcMain.handle('start-recording', async (event, { windowId, sessionId }) => {
  try {
    // Get upload token from backend
    const uploadToken = await getUploadToken(sessionId);
    
    await RecallAiSdk.startRecording({
      windowId,
      uploadToken,
    });
    
    recordingState.set(windowId, { sessionId, uploadToken });
    return { success: true };
  } catch (error) {
    console.error('Failed to start recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-recording', async (event, { windowId }) => {
  try {
    await RecallAiSdk.stopRecording({ windowId });
    return { success: true };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return { success: false, error: error.message };
  }
});

// Helper functions
async function getUploadToken(sessionId) {
  const response = await fetch(`${process.env.BACKEND_URL}/api/recall/desktop-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.USER_AUTH_TOKEN}`,
    },
    body: JSON.stringify({ sessionId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get upload token');
  }
  
  const { upload_token } = await response.json();
  return upload_token;
}

async function notifyWebApp(event, data) {
  try {
    await fetch(`${process.env.BACKEND_URL}/api/desktop-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.USER_AUTH_TOKEN}`,
      },
      body: JSON.stringify({ event, data }),
    });
  } catch (error) {
    console.error('Failed to notify web app:', error);
  }
}

async function sendTranscriptToWebApp(windowId, transcript) {
  const recording = recordingState.get(windowId);
  if (!recording) return;
  
  try {
    await fetch(`${process.env.BACKEND_URL}/api/sessions/${recording.sessionId}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.USER_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        content: transcript.text,
        speaker: transcript.speaker,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Failed to send transcript:', error);
  }
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

## Step 4: Create Preload Script (preload.js)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  startRecording: (windowId, sessionId) => 
    ipcRenderer.invoke('start-recording', { windowId, sessionId }),
  
  stopRecording: (windowId) => 
    ipcRenderer.invoke('stop-recording', { windowId }),
  
  onMeetingDetected: (callback) => 
    ipcRenderer.on('meeting-detected', (event, window) => callback(window)),
  
  onRecordingStarted: (callback) => 
    ipcRenderer.on('recording-started', (event, window) => callback(window)),
  
  onRecordingEnded: (callback) => 
    ipcRenderer.on('recording-ended', (event, window) => callback(window)),
});
```

## Step 5: Create UI (index.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>LivePrompt Desktop Recorder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .meeting-card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .meeting-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .button {
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 8px;
    }
    .button:hover {
      background: #0056b3;
    }
    .button.stop {
      background: #dc3545;
    }
    .button.stop:hover {
      background: #c82333;
    }
    .status {
      color: #28a745;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>LivePrompt Desktop Recorder</h1>
  <p class="status" id="status">Waiting for meetings...</p>
  <div id="meetings"></div>

  <script>
    const meetingsDiv = document.getElementById('meetings');
    const statusDiv = document.getElementById('status');
    const activeMeetings = new Map();

    // Listen for meeting detection
    window.desktopAPI.onMeetingDetected((meeting) => {
      if (!activeMeetings.has(meeting.id)) {
        activeMeetings.set(meeting.id, meeting);
        renderMeetings();
        statusDiv.textContent = `Found meeting: ${meeting.title || 'Untitled'}`;
      }
    });

    // Listen for recording events
    window.desktopAPI.onRecordingStarted((window) => {
      const meeting = activeMeetings.get(window.id);
      if (meeting) {
        meeting.isRecording = true;
        renderMeetings();
      }
    });

    window.desktopAPI.onRecordingEnded((window) => {
      const meeting = activeMeetings.get(window.id);
      if (meeting) {
        meeting.isRecording = false;
        renderMeetings();
      }
    });

    // Render meetings UI
    function renderMeetings() {
      meetingsDiv.innerHTML = '';
      
      activeMeetings.forEach((meeting) => {
        const card = document.createElement('div');
        card.className = 'meeting-card';
        
        card.innerHTML = `
          <div class="meeting-title">${meeting.title || 'Untitled Meeting'}</div>
          <div style="color: #666; font-size: 14px; margin-bottom: 12px;">
            ${meeting.platform || 'Unknown'} - ${meeting.id}
          </div>
          <div>
            ${meeting.isRecording ? `
              <button class="button stop" onclick="stopRecording('${meeting.id}')">
                Stop Recording
              </button>
              <span style="color: red;">● Recording</span>
            ` : `
              <button class="button" onclick="startRecording('${meeting.id}')">
                Start Recording
              </button>
            `}
          </div>
        `;
        
        meetingsDiv.appendChild(card);
      });
    }

    // Recording controls
    async function startRecording(windowId) {
      // In a real app, get sessionId from your web app
      const sessionId = prompt('Enter session ID from liveprompt.ai:');
      if (!sessionId) return;
      
      const result = await window.desktopAPI.startRecording(windowId, sessionId);
      if (!result.success) {
        alert('Failed to start recording: ' + result.error);
      }
    }

    async function stopRecording(windowId) {
      const result = await window.desktopAPI.stopRecording(windowId);
      if (!result.success) {
        alert('Failed to stop recording: ' + result.error);
      }
    }
  </script>
</body>
</html>
```

## Step 6: Environment Configuration (.env)

```bash
# Recall.ai Configuration
RECALL_AI_API_KEY=your_recall_ai_api_key
RECALL_AI_API_URL=https://us-east-1.recall.ai

# Backend Configuration
BACKEND_URL=http://localhost:3000
USER_AUTH_TOKEN=your_auth_token_here
```

## Step 7: Package.json Scripts

```json
{
  "name": "liveprompt-desktop",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "dist": "electron-builder --mac --win --linux"
  },
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.0.0"
  },
  "dependencies": {
    "@recallai/desktop-sdk": "latest",
    "dotenv": "^16.0.0"
  },
  "build": {
    "appId": "ai.liveprompt.desktop",
    "productName": "LivePrompt Desktop",
    "directories": {
      "output": "dist"
    },
    "mac": {
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

## Step 8: Running the App

1. **Development Mode:**
   ```bash
   npm start
   ```

2. **Build for Distribution:**
   ```bash
   npm run dist
   ```

## Integration with Web App

### 1. Deep Linking

Add protocol handler to open desktop app from web:

```javascript
// In Electron main.js
app.setAsDefaultProtocolClient('liveprompt-desktop');

// Handle protocol
app.on('open-url', (event, url) => {
  event.preventDefault();
  // Parse URL and handle action
  // e.g., liveprompt-desktop://start-recording?sessionId=123
});
```

### 2. WebSocket Connection

For real-time communication:

```javascript
// In Electron app
const WebSocket = require('ws');
const ws = new WebSocket(`${process.env.BACKEND_URL.replace('http', 'ws')}/desktop-sync`);

ws.on('open', () => {
  ws.send(JSON.stringify({ 
    type: 'register', 
    deviceId: app.getPath('userData') 
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  // Handle commands from web app
});
```

### 3. Auto-Update

Use electron-updater for automatic updates:

```javascript
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

## Security Considerations

1. **Code Signing**: Sign your app for distribution
2. **API Authentication**: Use secure tokens for API communication
3. **Permission Handling**: Request permissions gracefully
4. **Data Encryption**: Encrypt sensitive data in transit
5. **Update Security**: Use signed updates only

## Distribution

1. **macOS**: Requires Apple Developer account for distribution outside App Store
2. **Windows**: Code signing certificate recommended
3. **Auto-update server**: Set up update server for seamless updates

## Next Steps

1. Implement proper authentication flow
2. Add auto-update functionality
3. Create installer with proper branding
4. Set up CI/CD for automated builds
5. Implement crash reporting and analytics

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Recall.ai Desktop SDK Docs](https://docs.recall.ai/docs/desktop-recording-sdk)
- [Electron Builder](https://www.electron.build/)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)