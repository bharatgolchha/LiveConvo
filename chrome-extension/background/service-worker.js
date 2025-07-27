// Import config - for Chrome extensions, we'll inline this
const API_BASE_URL = 'https://liveprompt.ai/api';
const WEB_BASE_URL = 'https://liveprompt.ai';

// Supabase configuration - will be fetched dynamically
let SUPABASE_URL = null;
let SUPABASE_ANON_KEY = null;

let authToken = null;
let refreshToken = null;
let tokenExpiresAt = null;
let activeSession = null;
let isRefreshing = false; // Prevent concurrent refresh attempts

// Helper to guarantee auth token is loaded before actions
async function ensureAuthToken() {
  if (authToken) return true;
  await loadAuthToken();
  return !!authToken;
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('LivePrompt Extension installed');
  // Fetch Supabase config first (no auth required)
  await fetchSupabaseConfig();
  loadAuthToken();
  setupAuthRefreshAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  // Fetch Supabase config first (no auth required)
  await fetchSupabaseConfig();
  loadAuthToken();
  setupAuthRefreshAlarm();
});

// Set up Chrome alarms to keep service worker alive and refresh tokens
function setupAuthRefreshAlarm() {
  // Check auth status every 4 minutes
  chrome.alarms.create('auth-refresh', { periodInMinutes: 4 });
  // Keep service worker alive every 30 seconds
  chrome.alarms.create('keep-alive', { periodInMinutes: 0.5 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'auth-refresh') {
    console.log('LivePrompt: Auth refresh alarm triggered');
    await checkAndRefreshToken();
  } else if (alarm.name === 'keep-alive') {
    // Just keeping service worker alive
    console.log('LivePrompt: Keep-alive ping');
  }
});

async function loadAuthToken() {
  const result = await chrome.storage.local.get(['authToken', 'refreshToken', 'tokenExpiresAt', 'supabaseUrl', 'supabaseAnonKey']);
  authToken = result.authToken;
  refreshToken = result.refreshToken;
  tokenExpiresAt = result.tokenExpiresAt;
  SUPABASE_URL = result.supabaseUrl;
  SUPABASE_ANON_KEY = result.supabaseAnonKey;
  console.log('LivePrompt: Loaded auth token from storage:', authToken ? authToken.substring(0, 20) + '...' : 'null');
  console.log('LivePrompt: Loaded refresh token from storage:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'null');
  console.log('LivePrompt: Loaded Supabase URL:', SUPABASE_URL);
  
  // If no stored token, check if user is logged in via web
  if (!authToken) {
    console.log('LivePrompt: No stored token, checking web session...');
    await checkWebSession();
  } else {
    console.log('LivePrompt: Using stored auth token');
    // Fetch Supabase config if we don't have it
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      await fetchSupabaseConfig();
    }
    // Check if token needs refresh
    await checkAndRefreshToken();
  }
}

// Fetch Supabase configuration from API
async function fetchSupabaseConfig() {
  try {
    // No auth required - endpoint returns public keys
    const response = await fetch(`${API_BASE_URL}/auth/extension-config`);
    
    if (response.ok) {
      const config = await response.json();
      SUPABASE_URL = config.supabaseUrl;
      SUPABASE_ANON_KEY = config.supabaseAnonKey;
      
      // Store config for future use
      await chrome.storage.local.set({
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY
      });
      
      console.log('LivePrompt: Fetched Supabase configuration');
      return true;
    }
  } catch (error) {
    console.error('LivePrompt: Failed to fetch Supabase config:', error);
  }
  return false;
}

// Check if token is expired or about to expire and refresh it
async function checkAndRefreshToken() {
  if (!authToken) return false;

  // If we lack a refresh token, try synchronizing with the web session instead of failing immediately
  if (!refreshToken) {
    console.log('LivePrompt: No refresh token available, attempting to sync with web session...');
    return (await refreshWebSession()) || (await checkWebSession());
  }

  // Check if token expires in next 5 minutes
  const now = Date.now();
  const expiresIn5Min = tokenExpiresAt ? tokenExpiresAt - 5 * 60 * 1000 : 0;
  
  if (!tokenExpiresAt || now >= expiresIn5Min) {
    console.log('LivePrompt: Token expired or expiring soon, attempting web-session sync before refresh...');
    if (await refreshWebSession()) {
      console.log('LivePrompt: Token refreshed via web-session sync');
      return true;
    }
    // If that didn't work fall back to refresh token flow
    return await refreshAccessToken();
  }

  return true;
}

async function checkWebSession() {
  try {
    console.log('LivePrompt: Checking web session...');
    const response = await fetch(`${API_BASE_URL}/auth/check-session`, {
      method: 'GET',
      credentials: 'include', // Important: include cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('LivePrompt: Web session check response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('LivePrompt: Web session check data:', data);
      if (data.authenticated && data.token) {
        authToken = data.token;
        refreshToken = data.refresh_token;
        tokenExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
        
        await chrome.storage.local.set({ 
          authToken: data.token,
          refreshToken: data.refresh_token,
          tokenExpiresAt,
          userId: data.user.id,
          userEmail: data.user.email 
        });
        
        console.log('LivePrompt: Detected existing web session');
        console.log('LivePrompt: Stored refresh token:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'null');
        
        // Fetch Supabase config after detecting web session
        await fetchSupabaseConfig();
        
        return true;
      }
    }
  } catch (error) {
    console.log('LivePrompt: No existing web session found:', error.message);
  }
  return false;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Background received message:', request.type);
  
  switch (request.type) {
    case 'LOGIN':
      handleLogin(request.data).then(sendResponse);
      return true;
      
    case 'LOGOUT':
      handleLogout().then(sendResponse);
      return true;
      
    case 'GET_AUTH_STATUS':
      ensureAuthToken().then(() => {
        sendResponse({ isAuthenticated: !!authToken, token: authToken });
      });
      return true;
      
    case 'CREATE_SESSION':
      createSession(request.data).then(sendResponse);
      return true;
      
    case 'END_SESSION':
      endSession(request.sessionId).then(sendResponse);
      return true;
      
    case 'GET_ACTIVE_SESSION':
      // If we already have a cached session, return it. Otherwise try to fetch any active session from the API.
      fetchActiveSession().then(sendResponse);
      return true;

    case 'GET_SESSIONS':
      fetchSessions(request.limit || 10).then(sendResponse);
      return true;
      
    case 'GET_MEETINGS':
      getMeetings().then(sendResponse);
      return true;
      
    case 'SAVE_MEETING':
      saveMeeting(request.data).then(sendResponse);
      return true;
      
    case 'DELETE_MEETING':
      deleteMeeting(request.id).then(sendResponse);
      return true;

    case 'GET_BASE_URL':
      sendResponse({ baseUrl: API_BASE_URL.replace(/\/api$/, '') });
      return true;

    // Receive session token from LivePrompt web app via content script
    case 'WEB_SESSION_TOKEN':
      handleWebSessionToken(request).then(sendResponse);
      return true;

    case 'WEB_SESSION_LOGOUT':
      handleLogout().then(sendResponse);
      return true;
  }
});

async function handleLogin(credentials) {
  try {
    console.log('Attempting login to:', `${API_BASE_URL}/auth/extension-login`);
    
    const response = await fetch(`${API_BASE_URL}/auth/extension-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Unexpected response type:', contentType);
      console.error('Response status:', response.status);
      const text = await response.text();
      console.error('Response body:', text.substring(0, 200));
      throw new Error('Server returned non-JSON response. Is the API running?');
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    authToken = data.token;
    refreshToken = data.refresh_token;
    
    console.log('LivePrompt: Login response - has refresh token:', !!data.refresh_token);
    
    // Set token expiration (1 hour from now)
    tokenExpiresAt = Date.now() + (60 * 60 * 1000);
    
    await chrome.storage.local.set({ 
      authToken: data.token,
      refreshToken: data.refresh_token,
      tokenExpiresAt,
      userId: data.user.id,
      userEmail: data.user.email 
    });
    
    // Fetch Supabase config after successful login
    await fetchSupabaseConfig();
    
    console.log('Login successful for user:', data.user.email);
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

async function handleLogout() {
  authToken = null;
  refreshToken = null;
  tokenExpiresAt = null;
  activeSession = null;
  SUPABASE_URL = null;
  SUPABASE_ANON_KEY = null;
  await chrome.storage.local.clear();
  // Clear alarms
  chrome.alarms.clear('auth-refresh');
  chrome.alarms.clear('keep-alive');
  return { success: true };
}

async function createSession(meetingData) {
  if (!(await ensureAuthToken())) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const response = await apiFetch(`/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: meetingData.title,
        meeting_url: meetingData.url,
        meeting_id: meetingData.meetingId,
        context: meetingData.context
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    
    const sessionData = await response.json();
    const session = sessionData.session || sessionData; // fallback
    activeSession = session;

    await chrome.storage.local.set({ activeSession: session });

    // Remove the meeting draft from meetings list if exists
    if (meetingData.meetingId) {
      const result = await chrome.storage.sync.get(['meetings']);
      const meetingsArr = result.meetings || [];
      const updated = meetingsArr.filter(m => m.id !== meetingData.meetingId);
      await chrome.storage.sync.set({ meetings: updated });
      // Notify popup to refresh meetings list
      safeSendMessage({ type: 'MEETINGS_UPDATED' });
    }

    // Automatically start Recall.ai bot
    try {
      const startBotResp = await apiFetch(`/meeting/${session.id}/start-bot`, { method: 'POST' });
      if (!startBotResp.ok) {
        console.error('Failed to start bot:', await startBotResp.text());
      } else {
        console.log('Bot started for session', session.id);
        // Update session status to active so UI shows timer
        session.status = 'active';
        activeSession = session;
        await chrome.storage.local.set({ activeSession: session });
      }
    } catch (err) {
      console.error('Start bot request error:', err);
    }
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (
          tab.url.includes('meet.google.com') ||
          tab.url.includes('teams.microsoft.com') ||
          tab.url.includes('zoom.us')
        )) {
          safeSendTabsMessage(tab.id, { type: 'SESSION_STARTED', session });
        }
      });
    });
    
    return { success: true, session };
  } catch (error) {
    console.error('Create session error:', error);
    return { success: false, error: error.message };
  }
}

async function endSession(sessionId) {
  if (!(await ensureAuthToken()) || !sessionId) {
    return { success: false, error: 'Invalid request' };
  }
  
  try {
    const response = await apiFetch(`/sessions/${sessionId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error('Failed to end session');
    }

    // Call stop-bot to make bot leave
    try {
      await apiFetch(`/sessions/${sessionId}/stop-bot`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Stop bot error:', err);
    }
    
    activeSession = null;
    await chrome.storage.local.remove('activeSession');
    safeSendMessage({ type: 'ACTIVE_SESSION_CLEARED' });
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (
          tab.url.includes('meet.google.com') ||
          tab.url.includes('teams.microsoft.com') ||
          tab.url.includes('zoom.us')
        )) {
          safeSendTabsMessage(tab.id, { type: 'SESSION_ENDED' });
        }
      });
    });
    
    return { success: true };
  } catch (error) {
    console.error('End session error:', error);
    return { success: false, error: error.message };
  }
}

async function getMeetings() {
  if (!(await ensureAuthToken())) {
    return { meetings: [] };
  }

  // 1. Try to fetch upcoming meetings from the backend (calendar events)
  if (authToken) {
    try {
      const response = await apiFetch(`/calendar/events?filter=week`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        const backendMeetings = (data.meetings || []).map((m) => ({
          id: m.event_id || m.id || `evt-${Date.now()}`,
          title: m.title || 'Untitled',
          url: m.meeting_url || '',
          start_time: m.start_time,
          platform: m.calendar_provider || null,
          from_calendar: true
        }));

        // Merge with locally-saved drafts (if any)
        const local = await chrome.storage.sync.get(['meetings']);
        const localMeetings = local.meetings || [];

        return { meetings: [...backendMeetings, ...localMeetings] };
      }
    } catch (err) {
      console.error('Failed fetching calendar events:', err);
      // Continue to fallback
    }
  }

  // Fallback to locally saved meetings only
  const result = await chrome.storage.sync.get(['meetings']);
  return { meetings: result.meetings || [] };
}

async function saveMeeting(meeting) {
  const result = await chrome.storage.sync.get(['meetings']);
  const meetings = result.meetings || [];
  
  if (meeting.id) {
    const index = meetings.findIndex(m => m.id === meeting.id);
    if (index !== -1) {
      meetings[index] = meeting;
    }
  } else {
    meeting.id = `meeting-${Date.now()}`;
    meetings.push(meeting);
  }
  
  await chrome.storage.sync.set({ meetings });
  return { success: true, meeting };
}

async function deleteMeeting(id) {
  const result = await chrome.storage.sync.get(['meetings']);
  const meetings = result.meetings || [];
  const filtered = meetings.filter(m => m.id !== id);
  
  await chrome.storage.sync.set({ meetings: filtered });
  return { success: true };
}

async function handleWebSessionToken(msg) {
  const { token, refreshToken: newRefreshToken, user } = msg;
  console.log('LivePrompt: Received web session token:', token ? token.substring(0, 20) + '...' : 'null', 'for user:', user?.email);
  console.log('LivePrompt: Received refresh token:', newRefreshToken ? newRefreshToken.substring(0, 20) + '...' : 'null');
  
  if (!token || !user) return { success: false };

  // If the extension already has a refresh token of its own (user logged in via extension),
  // we keep using it to avoid sharing a single-use refresh token with the website. We still
  // update the access token so API requests remain valid, but we ignore the incoming refresh
  // token to prevent accidental session revocation.
  authToken = token;
  if (!refreshToken && newRefreshToken) {
    refreshToken = newRefreshToken;
  }
  tokenExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
  
  await chrome.storage.local.set({ 
    authToken: token, 
    refreshToken: refreshToken, 
    tokenExpiresAt,
    userId: user.id, 
    userEmail: user.email 
  });

  console.log('LivePrompt: Synced session from web login');

  // Fetch Supabase config after syncing web session
  await fetchSupabaseConfig();
  
  // Set up refresh alarm if not already set
  setupAuthRefreshAlarm();
  
  // Fetch latest sessions / active session right away
  fetchActiveSession();
  return { success: true };
}

chrome.storage.local.get(['activeSession'], (result) => {
  if (result.activeSession && result.activeSession.status === 'active') {
    activeSession = result.activeSession;
  } else {
    activeSession = null;
    chrome.storage.local.remove('activeSession');
  }
});

// -----------------------------
//  Helper: Fetch sessions list
// -----------------------------
async function fetchSessions(limit = 10) {
  if (!(await ensureAuthToken())) {
    console.log('LivePrompt: No auth token available for fetchSessions');
    return { success: false, error: 'Not authenticated', sessions: [] };
  }

  console.log('LivePrompt: Fetching sessions with token:', authToken.substring(0, 20) + '...');

  try {
    const response = await apiFetch(`/sessions?limit=${limit}`, {
      method: 'GET'
    });

    console.log('LivePrompt: Sessions API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LivePrompt: Sessions API error response:', errorText);
      throw new Error('Failed to fetch sessions');
    }

    const data = await response.json();
    console.log('LivePrompt: Sessions data received:', data);
    return { success: true, sessions: data.sessions || [] };
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return { success: false, error: error.message, sessions: [] };
  }
}

// -----------------------------
//  Helper: Fetch active session
// -----------------------------
async function fetchActiveSession() {
  if (!(await ensureAuthToken())) {
    console.log('LivePrompt: No auth token available for fetchActiveSession');
    return { session: null };
  }

  console.log('LivePrompt: Fetching active session with token:', authToken.substring(0, 20) + '...');

  try {
    const response = await apiFetch(`/sessions?status=active&limit=1`, {
      method: 'GET'
    });

    console.log('LivePrompt: Active session API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LivePrompt: Active session API error response:', errorText);
      throw new Error('Failed to fetch active sessions');
    }

    const data = await response.json();
    console.log('LivePrompt: Active session data received:', data);
    const sessions = data.sessions || [];

    if (sessions.length > 0) {
      activeSession = sessions[0];
      await chrome.storage.local.set({ activeSession });
      return { session: activeSession };
    }

    // No active sessions: clear cache
    activeSession = null;
    await chrome.storage.local.remove('activeSession');
    return { session: null };
  } catch (error) {
    console.error('Fetch active session error:', error);
    return { session: null };
  }
}

// -----------------------------
//  Helper: Unified fetch with token and auto-refresh
// -----------------------------
async function apiFetch(path, init = {}, { retry = true } = {}) {
  const headers = new Headers(init.headers || {});
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  // Build full URL and always append token as query param (fallback for CORS stripping)
  const url = new URL(`${API_BASE_URL}${path}`);
  if (authToken) {
    url.searchParams.set('token', authToken);
  }

  const response = await fetch(url.toString(), { ...init, headers });

  if (response.status === 401 && retry) {
    console.log('LivePrompt: Got 401, attempting token refresh...');
    // Try multiple recovery methods in sequence
    let refreshed = false;
    
    // Method 1: Try web session sync first (this avoids issues with single-use refresh tokens)
    if (await refreshWebSession()) {
      console.log('LivePrompt: Token refreshed via web session');
      refreshed = true;
    }
    
    // Method 2: Try refresh token only if we still have one and previous step failed
    if (!refreshed && refreshToken && await refreshAccessToken()) {
      console.log('LivePrompt: Token refreshed via refresh token');
      refreshed = true;
    }
    
    // Method 3: Check web session one more time as a fallback
    if (!refreshed && await checkWebSession()) {
      console.log('LivePrompt: Token refreshed via web session check');
      refreshed = true;
    }
    
    if (refreshed) {
      // Retry the request with new token
      return apiFetch(path, init, { retry: false });
    } else {
      console.error('LivePrompt: All auth recovery methods failed');
      await handleLogout();
    }
  }
  return response;
}

// Reusable web-session check (shares logic with foreground)
async function refreshWebSession() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/check-session`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.authenticated && data.token) {
      authToken = data.token;
      refreshToken = data.refresh_token;
      tokenExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
      
      await chrome.storage.local.set({ 
        authToken: data.token, 
        refreshToken: data.refresh_token, 
        tokenExpiresAt,
        userId: data.user.id, 
        userEmail: data.user.email 
      });
      console.log('LivePrompt: Refreshed auth token from web session');
      console.log('LivePrompt: Got new refresh token:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'null');
      return true;
    }
  } catch (_) {}
  return false;
}

function safeSendMessage(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        // No receiver (popup closed) – silently ignore
      }
    });
  } catch (_) {}
}

// Safe message sender to tabs – avoids "could not establish connection" errors when no content script is loaded in the tab
function safeSendTabsMessage(tabId, message) {
  try {
    chrome.tabs.sendMessage(tabId, message, undefined, () => {
      // Swallow errors when there is no receiving end
      if (chrome.runtime.lastError) {
        // Intentionally ignored – means the tab had no listener
      }
    });
  } catch (_) {}
}

// Refresh token via Supabase
async function refreshAccessToken() {
  // Prevent concurrent refresh attempts
  if (isRefreshing) {
    return !!authToken;
  }
  isRefreshing = true;

  // Preferred: leverage existing logged-in cookies via /auth/check-session
  const ok = await refreshWebSession() || await checkWebSession();
  isRefreshing = false;
  return ok;
}