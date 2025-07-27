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
    const user = session.user;

    if (!accessToken || !user) return;

    chrome.runtime.sendMessage({
      type: 'WEB_SESSION_TOKEN',
      token: accessToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    // Silence any JSON parse errors
  }
})();

// --------------------------------------------------
//  Enhanced real-time Supabase session detection
//  -------------------------------------------------
//  Problem: The standard `storage` event does **not** fire
//  in the same tab where the change occurs, so if the user
//  logs in and stays on the same page the extension never
//  receives the new token. We fix this by polling
//  `localStorage` every 1.5 s and only sending messages when
//  the access token changes. This keeps the implementation
//  simple and avoids coupling to the page's JavaScript.

let lastAccessToken = null;

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
    const user = session.user;

    if (!accessToken || !user) return null;

    return { accessToken, user };
  } catch {
    return null; // Ignore JSON parse errors or other issues
  }
}

function sendTokenMessage(session) {
  chrome.runtime.sendMessage({
    type: 'WEB_SESSION_TOKEN',
    token: session.accessToken,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  });
}

function sendLogoutMessage() {
  chrome.runtime.sendMessage({ type: 'WEB_SESSION_LOGOUT' });
}

// Initial check (covers page refresh / first load)
const initialSession = extractSession();
if (initialSession) {
  sendTokenMessage(initialSession);
  lastAccessToken = initialSession.accessToken;
}

// Poll every 1.5 seconds for changes created in the same tab
setInterval(() => {
  const current = extractSession();

  if (current && current.accessToken !== lastAccessToken) {
    // New login or token refresh
    sendTokenMessage(current);
    lastAccessToken = current.accessToken;
  } else if (!current && lastAccessToken) {
    // User logged out in this tab – notify background
    sendLogoutMessage();
    lastAccessToken = null;
  }
}, 1500); 