// Content script to sync Supabase session with extension background

// Extract Supabase session from localStorage and notify extension background
(function sendSupabaseSession() {
  try {
    // Look for a key like sb-<project>-auth-token
    const tokenKey = Object.keys(localStorage).find(k => k.endsWith('-auth-token') && k.startsWith('sb-'));
    if (!tokenKey) return;

    const raw = localStorage.getItem(tokenKey);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const session = parsed.currentSession || parsed;
    const accessToken = session.access_token;
    const refreshToken = session.refresh_token;
    const user = session.user;

    if (!accessToken || !user) return;

    safeSendMessage({
      type: 'WEB_SESSION_TOKEN',
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    // Silence any JSON parse errors
  }
})();

// Safe wrapper to avoid "Extension context invalidated" errors
function safeSendMessage(message) {
  try {
    chrome.runtime.sendMessage(message, undefined, () => {
      if (chrome.runtime.lastError) {
        // Ignore errors caused by context invalidation or no listeners
      }
    });
  } catch (_) {
    // Silently ignore if extension context is gone
  }
}

// --------------------------------------------------
//  Enhanced real-time Supabase session detection
//  -------------------------------------------------
//  Problem: The standard `storage` event does **not** fire
//  in the same tab where the change occurs, so if the user
//  logs in and stays on the same page the extension never
//  receives the new token. We fix this by polling
//  `localStorage` every 10 s and only sending messages when
//  the access token changes. This keeps the implementation
//  simple and avoids coupling to the page's JavaScript.

let lastAccessToken = null;
let lastRefreshToken = null;

function extractSession() {
  try {
    // Look for a key like sb-<project>-auth-token (works for any project)
    const tokenKey = Object.keys(localStorage).find(
      (k) => k.endsWith('-auth-token') && k.startsWith('sb-')
    );
    if (!tokenKey) return null;

    const raw = localStorage.getItem(tokenKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const session = parsed.currentSession || parsed;
    const accessToken = session.access_token;
    const refreshToken = session.refresh_token;
    const user = session.user;

    if (!accessToken || !user) return null;

    return { accessToken, refreshToken, user };
  } catch {
    return null; // Ignore JSON parse errors or other issues
  }
}

function sendTokenMessage(session) {
  safeSendMessage({
    type: 'WEB_SESSION_TOKEN',
    token: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  });
}

function sendLogoutMessage() {
  safeSendMessage({ type: 'WEB_SESSION_LOGOUT' });
}

// Initial check (covers page refresh / first load)
const initialSession = extractSession();
if (initialSession) {
  sendTokenMessage(initialSession);
  lastAccessToken = initialSession.accessToken;
  lastRefreshToken = initialSession.refreshToken;
}

// Poll every 10 seconds for changes created in the same tab
setInterval(() => {
  const current = extractSession();

  if (
    current &&
    (current.accessToken !== lastAccessToken || current.refreshToken !== lastRefreshToken)
  ) {
    // New login or token refresh
    sendTokenMessage(current);
    lastAccessToken = current.accessToken;
    lastRefreshToken = current.refreshToken;
  } else if (!current && lastAccessToken) {
    // User logged out in this tab – notify background
    sendLogoutMessage();
    lastAccessToken = null;
    lastRefreshToken = null;
  }
}, 10000); 