const { app, BrowserWindow, ipcMain, Menu, Tray, shell } = require('electron');
const path = require('path');
const RecallAiSdk = require('@recallai/desktop-sdk');
require('dotenv').config();

let mainWindow;
let tray;
let recordingState = new Map();
let isQuitting = false;

// Initialize Recall SDK
RecallAiSdk.init({
  apiUrl: process.env.RECALL_AI_API_URL || 'https://us-east-1.recall.ai',
  acquirePermissionsOnStartup: ['accessibility', 'screen-capture', 'microphone'],
  restartOnError: true,
});

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'LivePrompt Desktop Recorder',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Handle window close to minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create system tray
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icon.png');
    // Check if icon exists
    const fs = require('fs');
    if (!fs.existsSync(iconPath)) {
      console.log('Tray icon not found, skipping tray creation');
      return;
    }
    
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          mainWindow.show();
        }
      },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('LivePrompt Desktop Recorder');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

// Set up SDK event listeners
RecallAiSdk.addEventListener('permissions-granted', () => {
  console.log('All permissions granted for desktop recording');
  mainWindow.webContents.send('permissions-granted');
});

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
    // Send transcript to renderer
    mainWindow.webContents.send('transcript-received', {
      windowId: evt.window.id,
      transcript: evt.data
    });
    
    // Send transcript to web app
    await sendTranscriptToWebApp(evt.window.id, evt.data);
  }
});

RecallAiSdk.addEventListener('upload-progress', (evt) => {
  console.log(`Upload progress: ${evt.progress}%`);
  mainWindow.webContents.send('upload-progress', {
    windowId: evt.window.id,
    progress: evt.progress
  });
});

RecallAiSdk.addEventListener('error', (evt) => {
  console.error('Desktop SDK error:', evt);
  mainWindow.webContents.send('sdk-error', evt);
});

RecallAiSdk.addEventListener('permission-status', (evt) => {
  console.log(`Permission ${evt.permission}: ${evt.granted ? 'granted' : 'denied'}`);
  mainWindow.webContents.send('permission-status', {
    permission: evt.permission,
    granted: evt.granted
  });
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

ipcMain.handle('start-desktop-recording', async (event, { sessionId }) => {
  try {
    const uploadToken = await getUploadToken(sessionId);
    const windowId = await RecallAiSdk.prepareDesktopAudioRecording();
    
    recordingState.set(windowId, { sessionId, uploadToken });
    
    await RecallAiSdk.startRecording({
      windowId,
      uploadToken,
    });
    
    return { success: true, windowId };
  } catch (error) {
    console.error('Failed to start desktop recording:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('request-permission', async (event, { permission }) => {
  try {
    await RecallAiSdk.requestPermission(permission);
    return { success: true };
  } catch (error) {
    console.error(`Failed to request ${permission} permission:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-backend-url', () => {
  return process.env.BACKEND_URL || 'http://localhost:3000';
});

// Helper functions
async function getUploadToken(sessionId) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/recall/desktop-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.USER_AUTH_TOKEN}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ sessionId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload token error:', response.status, errorText);
      throw new Error(`Failed to get upload token: ${response.status}`);
    }
    
    const data = await response.json();
    return data.upload_token;
  } catch (error) {
    console.error('Error getting upload token:', error);
    throw error;
  }
}

async function notifyWebApp(event, data) {
  try {
    await fetch(`${process.env.BACKEND_URL}/api/desktop-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.USER_AUTH_TOKEN}`,
        'ngrok-skip-browser-warning': 'true',
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
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        content: transcript.text,
        speaker: transcript.speaker || 'Speaker',
        timestamp: new Date().toISOString(),
        source: 'desktop_recording',
      }),
    });
  } catch (error) {
    console.error('Failed to send transcript:', error);
  }
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();
});

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

app.on('before-quit', () => {
  isQuitting = true;
});

// Handle protocol for deep linking
app.setAsDefaultProtocolClient('liveprompt-desktop');

app.on('open-url', (event, url) => {
  event.preventDefault();
  // Parse URL and handle action
  // e.g., liveprompt-desktop://start-recording?sessionId=123
  if (mainWindow) {
    mainWindow.show();
    mainWindow.webContents.send('deep-link', url);
  }
});