let isAuthenticated = false;
let activeSession = null;
let sessionTimer = null;
let meetings = [];
let sessions = [];
let frontendBase = 'https://liveprompt.ai'; // Production URL
let isRefreshing = false; // Prevent concurrent refreshes
let refreshInterval = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  setupEventListeners();
  startSmartRefresh();
});

// Smart refresh that only runs when visible and prevents concurrent operations
function startSmartRefresh() {
  // Clear any existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(async () => {
    // Skip if already refreshing
    if (isRefreshing) return;
    
    // Check if document is visible
    if (document.hidden) return;
    
    isRefreshing = true;
    
    try {
      chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
        if (response?.isAuthenticated) {
          checkActiveSession();
          loadSessions();
          loadMeetings(); // Also refresh meetings
        }
        isRefreshing = false;
      });
    } catch (error) {
      console.error('Refresh error:', error);
      isRefreshing = false;
    }
  }, 30000); // Refresh every 30 seconds
}

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Immediately refresh when becoming visible
    if (!isRefreshing) {
      chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
        if (response?.isAuthenticated) {
          checkActiveSession();
          loadSessions();
          loadMeetings(); // Also refresh meetings when becoming visible
        }
      });
    }
  }
});

chrome.runtime.onMessage.addListener((msg)=>{
  if(msg.type==='MEETINGS_UPDATED'){
    loadMeetings();
  }
  if(msg.type==='ACTIVE_SESSION_CLEARED'){ activeSession=null; hideActiveSession(); loadSessions(); }
});

function setupEventListeners() {
  // Login form
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Settings
  document.getElementById('settings-btn').addEventListener('click', handleSettings);
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  // Google sign-in
  document.getElementById('google-signin-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: `${frontendBase}/auth/login` });
  });
  
  // Add meeting
  document.getElementById('add-meeting-btn').addEventListener('click', showMeetingForm);
  document.getElementById('cancel-meeting-btn').addEventListener('click', hideMeetingForm);
  document.getElementById('add-meeting-form').addEventListener('submit', handleAddMeeting);
  
  // End session
  document.getElementById('end-session-btn').addEventListener('click', handleEndSession);
  
  // Event delegation for dynamic content
  document.getElementById('meetings-list').addEventListener('click', handleMeetingsListClick);
  document.getElementById('sessions-list').addEventListener('click', handleSessionsListClick);
}

async function checkAuthStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    if (response?.isAuthenticated) {
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('main-section').classList.remove('hidden');
      document.getElementById('logout-btn').style.display = 'flex';
      
      // Load data
      loadMeetings();
      loadSessions();
      checkActiveSession();
    } else {
      document.getElementById('main-section').classList.add('hidden');
      document.getElementById('auth-section').classList.remove('hidden');
      document.getElementById('logout-btn').style.display = 'none';
    }
  } catch (error) {
    console.error('Auth check error:', error);
    document.getElementById('main-section').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('logout-btn').style.display = 'none';
  }
}

async function checkWebSession() {
  try {
    const response = await fetch(`${frontendBase}/api/auth/check-session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated) {
        // Store the token in extension storage
        await chrome.storage.local.set({ 
          authToken: data.token,
          userId: data.user.id,
          userEmail: data.user.email 
        });
        return { authenticated: true };
      }
    }
  } catch (error) {
    console.log('No web session found');
  }
  return { authenticated: false };
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LOGIN',
      data: { email, password }
    });

    if (response?.success) {
      // Switch to main view
      document.getElementById('auth-section').classList.add('hidden');
      document.getElementById('main-section').classList.remove('hidden');
      document.getElementById('logout-btn').style.display = 'flex';
      
      // Load initial data
      loadMeetings();
      loadSessions();
      checkActiveSession();
    } else {
      console.error('Login failed:', response?.error);
      // TODO: Show error message to user
    }
  } catch (error) {
    console.error('Login error:', error);
    // TODO: Show error message to user
  }
}

async function loadMeetings() {
  try {
    console.log('LivePrompt: Loading meetings...');
    const response = await chrome.runtime.sendMessage({ type: 'GET_MEETINGS' });
    console.log('LivePrompt: Meetings response:', response);
    meetings = response.meetings || [];
    console.log('LivePrompt: Loaded meetings count:', meetings.length);
    if (meetings.length > 0) {
      console.log('LivePrompt: First meeting:', meetings[0]);
    }
    renderMeetings();
  } catch (error) {
    console.error('Load meetings error:', error);
  }
}

let loadSessionsTimeout = null;

async function loadSessions() {
  // Clear any pending load sessions call
  if (loadSessionsTimeout) {
    clearTimeout(loadSessionsTimeout);
  }
  
  // Debounce: wait 200ms before actually loading
  loadSessionsTimeout = setTimeout(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS', limit: 5 });
      if (response?.success) {
        sessions = response.sessions || [];
        renderSessions();
      } else {
        console.error('Failed to load sessions:', response?.error);
        // Show a user-friendly message in the sessions section
        const sessionsList = document.getElementById('sessions-list');
        if (response?.error === 'Not authenticated') {
          sessionsList.innerHTML = '<div class="auth-message">Please log in to view sessions</div>';
        } else {
          sessionsList.innerHTML = '<div class="error-message">Failed to load sessions</div>';
        }
      }
    } catch (error) {
      console.error('Load sessions error:', error);
      const sessionsList = document.getElementById('sessions-list');
      sessionsList.innerHTML = '<div class="error-message">Connection error</div>';
    }
  }, 200);
}

function renderMeetings() {
  const meetingsList = document.getElementById('meetings-list');
  
  if (meetings.length === 0) {
    meetingsList.innerHTML = `
      <div class="empty-state">
        <p>No meetings scheduled</p>
      </div>
    `;
    return;
  }
  
  // Sort meetings by start time
  const sortedMeetings = [...meetings].sort((a, b) => {
    const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
    const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
    return timeA - timeB;
  });
  
  meetingsList.innerHTML = sortedMeetings.map(meeting => {
    const platform = detectPlatform(meeting.url || '');
    const platformLogo = getPlatformLogo(platform);
    const meetingTime = meeting.start_time ? formatMeetingTime(meeting.start_time) : '';
    
    return `
      <div class="meeting-card" data-meeting-id="${meeting.id}">
        <div class="meeting-header">
          <div class="meeting-title-row">
            ${platformLogo}
            <h3 class="meeting-title">${escapeHtml(meeting.title || 'Untitled')}</h3>
          </div>
          ${meeting.start_time ? `
            <div class="meeting-time">
              ${meetingTime}
            </div>
          ` : ''}
        </div>
        <div class="meeting-actions">
          ${meeting.url ? `
            <button class="secondary-btn open-meeting" data-url="${meeting.url}">
              Join Meeting
            </button>
          ` : ''}
          <button class="primary-btn start-session" data-meeting-id="${meeting.id}">
            Start LivePrompt
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderSessions() {
  const sessionsList = document.getElementById('sessions-list');
  if (!sessionsList) return;

  if (sessions.length === 0) {
    sessionsList.innerHTML = `
      <div class="empty-state">
        <p>No sessions yet</p>
      </div>
    `;
    return;
  }

  sessionsList.innerHTML = sessions.map(session => `
    <div class="meeting-card" data-session-id="${session.id}">
      <div class="meeting-header">
        <h3 class="meeting-title">${escapeHtml(session.title || 'Untitled')}</h3>
        <span class="meeting-platform ${session.status}">${session.status}</span>
      </div>
      <div class="meeting-time">${new Date(session.created_at).toLocaleString()}</div>
      <div class="meeting-actions">
        <a href="${frontendBase}/meeting/${session.id}" target="_blank" class="secondary-btn">
          Open
        </a>
      </div>
    </div>
  `).join('');
}

function showMeetingForm() {
  document.getElementById('meeting-form').classList.remove('hidden');
  // blur removed; no body class needed
  document.getElementById('meetings-list').classList.add('hidden');
  document.getElementById('add-meeting-btn').classList.add('hidden');
}

function hideMeetingForm() {
  document.getElementById('meeting-form').classList.add('hidden');
  // blur removed; no body class needed
  document.getElementById('meetings-list').classList.remove('hidden');
  document.getElementById('add-meeting-btn').classList.remove('hidden');
  document.getElementById('add-meeting-form').reset();
}

async function handleAddMeeting(e) {
  e.preventDefault();
  
  const meeting = {
     title: document.getElementById('meeting-title').value,
     url: document.getElementById('meeting-url').value,
     context: document.getElementById('meeting-context').value
   };
  
  showLoading();
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_MEETING',
      data: meeting
    });
    
    if (response.success) {
      meetings.push(response.meeting);
      renderMeetings();
      hideMeetingForm();
    } else {
      showError('Failed to save meeting');
    }
  } catch (error) {
    console.error('Save meeting error:', error);
    showError('Failed to save meeting');
  }
  
  hideLoading();
}

async function startSession(meetingId) {
  const meeting = meetings.find(m => m.id === meetingId);
  if (!meeting) return;
  
  showLoading();
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_SESSION',
      data: {
        title: meeting.title,
        platform: meeting.platform,
        url: meeting.url,
        meetingId: meeting.id
      }
    });
    
    if (response.success) {
      activeSession = response.session;
      showActiveSession();
      
      // Open meeting URL if available
      if (meeting.url) {
        chrome.tabs.create({ url: meeting.url });
      }
    } else {
      showError(response.error || 'Failed to start session');
    }
  } catch (error) {
    console.error('Start session error:', error);
    showError('Failed to start session');
  }
  
  hideLoading();
}

async function handleEndSession() {
  if (!activeSession) return;
  
  const confirmed = confirm('Are you sure you want to end this session?');
  if (!confirmed) return;
  
  showLoading();
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'END_SESSION',
      sessionId: activeSession.id
    });
    
    if (response.success) {
      activeSession = null;
      hideActiveSession();
      loadSessions();
      checkActiveSession();
    } else {
      showError('Failed to end session');
    }
  } catch (error) {
    console.error('End session error:', error);
    showError('Failed to end session');
  }
  
  hideLoading();
}

async function checkActiveSession() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_SESSION' });
    if (response?.session) {
      activeSession = response.session;
      showActiveSession();
    } else {
      console.log('No active session found');
      hideActiveSession();
    }
  } catch (error) {
    console.error('Check active session error:', error);
    hideActiveSession();
  }
}

function showActiveSession() {
  if (!activeSession) return;
  
  document.getElementById('active-session').classList.remove('hidden');
  document.getElementById('session-title').textContent = activeSession.title || 'Untitled Session';
  
  const meetingUrl = `${frontendBase}/meeting/${activeSession.id}`;
  document.getElementById('dashboard-link').href = meetingUrl;
  
  startSessionTimer();
}

function hideActiveSession() {
  document.getElementById('active-session').classList.add('hidden');
  stopSessionTimer();
}

function startSessionTimer() {
  if (!activeSession) return;
  
  const startTime = activeSession.created_at ? new Date(activeSession.created_at) : new Date();
  
  const updateTimer = () => {
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('session-timer').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  updateTimer();
  sessionTimer = setInterval(updateTimer, 1000);
}

function stopSessionTimer() {
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
}

function handleSettings() {
  // TODO: Open settings
  console.log('Settings clicked');
}

async function handleLogout() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    if (response?.success) {
      // Clear local state
      activeSession = null;
      sessions = [];
      
      // Show login section
      document.getElementById('main-section').classList.add('hidden');
      document.getElementById('auth-section').classList.remove('hidden');
      
      console.log('Logout successful');
    } else {
      console.error('Logout failed:', response?.error);
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

function openMeeting(url) {
  chrome.tabs.create({ url });
}

// UI State Management
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('error-message').textContent = message;
}

function hideError() {
  document.getElementById('error').classList.add('hidden');
}

function showAuthSection() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('main-section').classList.add('hidden');
}

function showMainSection() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('main-section').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('main-content').classList.add('hidden');
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('zoom.us') || url.includes('zoom.com')) return 'zoom';
  if (url.includes('meet.google.com')) return 'google_meet';
  if (url.includes('teams.microsoft.com')) return 'teams';
  return null;
}

function getPlatformLogo(platform) {
  if (!platform) return '';
  
  const logos = {
    zoom: 'images/platforms/zoom.png',
    google_meet: 'images/platforms/meet.png',
    teams: 'images/platforms/teams.png'
  };
  
  const names = {
    zoom: 'Zoom',
    google_meet: 'Google Meet',
    teams: 'Microsoft Teams'
  };
  
  return `<img src="${logos[platform]}" alt="${names[platform]}" class="platform-logo" />`;
}

function formatMeetingTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${timeStr}`;
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Make functions available globally for onclick handlers
window.openMeeting = openMeeting;
window.startSession = startSession;

function handleMeetingsListClick(e) {
  const target = e.target.closest('button');
  if (!target) return;
  if (target.classList.contains('open-meeting')) {
    const url = target.dataset.url;
    if (url) openMeeting(url);
  }
  if (target.classList.contains('start-session')) {
    const id = target.dataset.meetingId;
    if (id) startSession(id);
  }
}

function handleSessionsListClick(e) {
  // future actions (e.g., open dashboard already an anchor link)
}