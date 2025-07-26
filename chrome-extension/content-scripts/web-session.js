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

// Also listen for storage changes so if the user logs in/out we update the extension token in real-time.
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.endsWith('-auth-token')) return;
  try {
    if (e.newValue) {
      const parsed = JSON.parse(e.newValue);
      const session = parsed.currentSession || parsed;
      chrome.runtime.sendMessage({
        type: 'WEB_SESSION_TOKEN',
        token: session.access_token,
        user: {
          id: session.user.id,
          email: session.user.email
        }
      });
    } else {
      // Session removed => log out
      chrome.runtime.sendMessage({ type: 'WEB_SESSION_LOGOUT' });
    }
  } catch {}
}); 