const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process
// to communicate with the main process
contextBridge.exposeInMainWorld('desktopAPI', {
  // Recording controls
  startRecording: (windowId, sessionId) => 
    ipcRenderer.invoke('start-recording', { windowId, sessionId }),
  
  stopRecording: (windowId) => 
    ipcRenderer.invoke('stop-recording', { windowId }),
  
  startDesktopRecording: (sessionId) =>
    ipcRenderer.invoke('start-desktop-recording', { sessionId }),
  
  // Permission management
  requestPermission: (permission) =>
    ipcRenderer.invoke('request-permission', { permission }),
  
  // Get backend URL
  getBackendUrl: () => 
    ipcRenderer.invoke('get-backend-url'),
  
  // Event listeners
  onMeetingDetected: (callback) => {
    ipcRenderer.on('meeting-detected', (event, window) => callback(window));
  },
  
  onRecordingStarted: (callback) => {
    ipcRenderer.on('recording-started', (event, window) => callback(window));
  },
  
  onRecordingEnded: (callback) => {
    ipcRenderer.on('recording-ended', (event, window) => callback(window));
  },
  
  onTranscriptReceived: (callback) => {
    ipcRenderer.on('transcript-received', (event, data) => callback(data));
  },
  
  onUploadProgress: (callback) => {
    ipcRenderer.on('upload-progress', (event, data) => callback(data));
  },
  
  onPermissionsGranted: (callback) => {
    ipcRenderer.on('permissions-granted', () => callback());
  },
  
  onPermissionStatus: (callback) => {
    ipcRenderer.on('permission-status', (event, data) => callback(data));
  },
  
  onError: (callback) => {
    ipcRenderer.on('sdk-error', (event, error) => callback(error));
  },
  
  onDeepLink: (callback) => {
    ipcRenderer.on('deep-link', (event, url) => callback(url));
  },
  
  // Remove event listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('meeting-detected');
    ipcRenderer.removeAllListeners('recording-started');
    ipcRenderer.removeAllListeners('recording-ended');
    ipcRenderer.removeAllListeners('transcript-received');
    ipcRenderer.removeAllListeners('upload-progress');
    ipcRenderer.removeAllListeners('permissions-granted');
    ipcRenderer.removeAllListeners('permission-status');
    ipcRenderer.removeAllListeners('sdk-error');
    ipcRenderer.removeAllListeners('deep-link');
  }
});