// State management
const state = {
  meetings: new Map(),
  isDesktopRecording: false,
  desktopWindowId: null,
  transcripts: new Map(),
  permissions: {
    accessibility: false,
    'screen-capture': false,
    microphone: false
  },
  backendUrl: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Get backend URL
  state.backendUrl = await window.desktopAPI.getBackendUrl();
  updateConnectionStatus('connected');

  // Set up event listeners
  setupEventListeners();
  
  // Check initial permissions
  checkPermissions();
});

// Event Listeners Setup
function setupEventListeners() {
  // SDK Events
  window.desktopAPI.onPermissionsGranted(() => {
    console.log('All permissions granted');
    Object.keys(state.permissions).forEach(permission => {
      state.permissions[permission] = true;
      updatePermissionUI(permission, true);
    });
    document.getElementById('permissionsPanel').style.display = 'none';
  });

  window.desktopAPI.onPermissionStatus((data) => {
    state.permissions[data.permission] = data.granted;
    updatePermissionUI(data.permission, data.granted);
  });

  window.desktopAPI.onMeetingDetected((meeting) => {
    console.log('Meeting detected:', meeting);
    state.meetings.set(meeting.id, { ...meeting, isRecording: false });
    renderMeetings();
  });

  window.desktopAPI.onRecordingStarted((window) => {
    const meeting = state.meetings.get(window.id);
    if (meeting) {
      meeting.isRecording = true;
      renderMeetings();
    }
  });

  window.desktopAPI.onRecordingEnded((window) => {
    const meeting = state.meetings.get(window.id);
    if (meeting) {
      meeting.isRecording = false;
      meeting.uploadProgress = 0;
      renderMeetings();
    }
  });

  window.desktopAPI.onTranscriptReceived((data) => {
    addTranscript(data);
  });

  window.desktopAPI.onUploadProgress((data) => {
    const meeting = state.meetings.get(data.windowId);
    if (meeting) {
      meeting.uploadProgress = data.progress;
      renderMeetings();
    }
  });

  window.desktopAPI.onError((error) => {
    console.error('SDK Error:', error);
    showNotification('Error: ' + error.message, 'error');
  });

  window.desktopAPI.onDeepLink((url) => {
    handleDeepLink(url);
  });
}

// Permission Management
async function requestPermission(permission) {
  const result = await window.desktopAPI.requestPermission(permission);
  if (!result.success) {
    showNotification(`Failed to request ${permission} permission`, 'error');
  }
}

function checkPermissions() {
  // This would ideally check actual permission status
  // For now, we'll rely on the SDK to tell us
}

function updatePermissionUI(permission, granted) {
  const item = document.querySelector(`[data-permission="${permission}"]`);
  if (item) {
    if (granted) {
      item.classList.add('granted');
      item.querySelector('button').textContent = 'Granted';
      item.querySelector('button').disabled = true;
    }
  }
}

// Meeting Management
function renderMeetings() {
  const container = document.getElementById('meetingsList');
  
  if (state.meetings.size === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No meetings detected. Start a Zoom or Google Meet call to begin.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  
  state.meetings.forEach((meeting) => {
    const card = document.createElement('div');
    card.className = `meeting-card ${meeting.isRecording ? 'recording' : ''}`;
    
    card.innerHTML = `
      <div class="meeting-header">
        <div>
          <div class="meeting-title">${meeting.title || 'Untitled Meeting'}</div>
          <div class="meeting-platform">${meeting.platform || 'Unknown'}</div>
        </div>
      </div>
      <div class="meeting-id">ID: ${meeting.id}</div>
      <div class="meeting-controls">
        ${meeting.isRecording ? `
          <button class="btn btn-danger btn-small" onclick="stopRecording('${meeting.id}')">
            Stop Recording
          </button>
          <div class="recording-indicator">
            <span class="recording-dot"></span>
            Recording
          </div>
        ` : `
          <input type="text" id="sessionId-${meeting.id}" placeholder="Session ID" class="session-input" style="width: 150px; height: 32px;">
          <button class="btn btn-primary btn-small" onclick="startRecording('${meeting.id}')">
            Start Recording
          </button>
        `}
      </div>
      ${meeting.uploadProgress !== undefined && meeting.uploadProgress > 0 ? `
        <div class="upload-progress">
          <div class="upload-progress-bar" style="width: ${meeting.uploadProgress}%"></div>
        </div>
      ` : ''}
    `;
    
    container.appendChild(card);
  });
}

// Recording Controls
async function startRecording(windowId) {
  const sessionInput = document.getElementById(`sessionId-${windowId}`);
  const sessionId = sessionInput?.value.trim();
  
  if (!sessionId) {
    showNotification('Please enter a session ID from LivePrompt', 'error');
    return;
  }

  const result = await window.desktopAPI.startRecording(windowId, sessionId);
  if (!result.success) {
    showNotification('Failed to start recording: ' + result.error, 'error');
  } else {
    showNotification('Recording started successfully', 'success');
  }
}

async function stopRecording(windowId) {
  const result = await window.desktopAPI.stopRecording(windowId);
  if (!result.success) {
    showNotification('Failed to stop recording: ' + result.error, 'error');
  } else {
    showNotification('Recording stopped', 'success');
  }
}

// Desktop Recording
async function toggleDesktopRecording() {
  const btn = document.getElementById('desktopRecordBtn');
  const sessionInput = document.getElementById('desktopSessionId');
  
  if (!state.isDesktopRecording) {
    const sessionId = sessionInput.value.trim();
    if (!sessionId) {
      showNotification('Please enter a session ID from LivePrompt', 'error');
      return;
    }

    const result = await window.desktopAPI.startDesktopRecording(sessionId);
    if (result.success) {
      state.isDesktopRecording = true;
      state.desktopWindowId = result.windowId;
      btn.textContent = 'Stop Desktop Recording';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
      sessionInput.disabled = true;
      showNotification('Desktop recording started', 'success');
    } else {
      showNotification('Failed to start desktop recording: ' + result.error, 'error');
    }
  } else {
    const result = await window.desktopAPI.stopRecording(state.desktopWindowId);
    if (result.success) {
      state.isDesktopRecording = false;
      state.desktopWindowId = null;
      btn.textContent = 'Start Desktop Recording';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
      sessionInput.disabled = false;
      showNotification('Desktop recording stopped', 'success');
    } else {
      showNotification('Failed to stop desktop recording: ' + result.error, 'error');
    }
  }
}

// Transcript Management
function addTranscript(data) {
  const { windowId, transcript } = data;
  
  if (!state.transcripts.has(windowId)) {
    state.transcripts.set(windowId, []);
  }
  
  state.transcripts.get(windowId).push({
    text: transcript.text,
    speaker: transcript.speaker || 'Speaker',
    timestamp: new Date()
  });
  
  renderTranscripts();
}

function renderTranscripts() {
  const container = document.getElementById('transcriptContainer');
  
  // Get all transcripts from all windows
  const allTranscripts = [];
  state.transcripts.forEach((transcripts) => {
    allTranscripts.push(...transcripts);
  });
  
  if (allTranscripts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Transcript will appear here when recording starts...</p>
      </div>
    `;
    return;
  }
  
  // Sort by timestamp
  allTranscripts.sort((a, b) => a.timestamp - b.timestamp);
  
  // Render last 50 entries
  const recentTranscripts = allTranscripts.slice(-50);
  
  container.innerHTML = recentTranscripts.map(entry => `
    <div class="transcript-entry">
      <div class="transcript-speaker">${entry.speaker}</div>
      <div class="transcript-text">${entry.text}</div>
      <div class="transcript-time">${entry.timestamp.toLocaleTimeString()}</div>
    </div>
  `).join('');
  
  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// UI Helpers
function updateConnectionStatus(status) {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.className = `connection-status ${status}`;
  
  const statusText = statusEl.querySelector('.status-text');
  switch (status) {
    case 'connected':
      statusText.textContent = 'Connected';
      break;
    case 'error':
      statusText.textContent = 'Connection Error';
      break;
    default:
      statusText.textContent = 'Connecting...';
  }
}

function showNotification(message, type = 'info') {
  // Simple console notification for now
  // In production, you'd want a proper notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function openWebApp() {
  require('electron').shell.openExternal(state.backendUrl);
}

// Deep Link Handling
function handleDeepLink(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    if (urlObj.hostname === 'start-recording') {
      const sessionId = params.get('sessionId');
      if (sessionId) {
        // Auto-fill session ID
        document.getElementById('desktopSessionId').value = sessionId;
        showNotification('Session ID loaded from web app', 'success');
      }
    }
  } catch (error) {
    console.error('Failed to parse deep link:', error);
  }
}

// Cleanup on window close
window.addEventListener('beforeunload', () => {
  window.desktopAPI.removeAllListeners();
});