import browser from 'webextension-polyfill';

// This content script is injected into meeting platforms
console.log('LivePrompt AI content script loaded');

// Listen for messages from the background script
browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'START_AUDIO_PROCESSING') {
    console.log('Starting audio processing with stream:', message.streamId);
    // In a real implementation, this would set up audio processing
    // For now, we'll just acknowledge the message
    return { success: true };
  }
});

// Detect meeting state changes
function detectMeetingState() {
  const url = window.location.href;
  
  // Google Meet detection
  if (url.includes('meet.google.com')) {
    const meetingCode = url.match(/meet\.google\.com\/([a-z-]+)/)?.[1];
    if (meetingCode) {
      browser.runtime.sendMessage({
        type: 'MEETING_DETECTED',
        platform: 'google-meet',
        meetingId: meetingCode,
      });
    }
  }
  
  // Zoom detection
  if (url.includes('zoom.us')) {
    const meetingId = url.match(/j\/(\d+)/)?.[1];
    if (meetingId) {
      browser.runtime.sendMessage({
        type: 'MEETING_DETECTED',
        platform: 'zoom',
        meetingId: meetingId,
      });
    }
  }
  
  // Teams detection
  if (url.includes('teams.microsoft.com')) {
    // Teams URLs are more complex, this is a simplified version
    browser.runtime.sendMessage({
      type: 'MEETING_DETECTED',
      platform: 'teams',
      meetingId: 'teams-meeting',
    });
  }
}

// Run detection on load and URL changes
detectMeetingState();

// Monitor for URL changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    detectMeetingState();
  }
}).observe(document, { subtree: true, childList: true });

// Optional: Add floating UI indicator
function addFloatingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'liveprompt-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
  `;
  
  indicator.innerHTML = `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18A2.5 2.5 0 0 0 10 15.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5"/>
    </svg>
  `;
  
  indicator.addEventListener('click', () => {
    browser.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
  });
  
  indicator.addEventListener('mouseenter', () => {
    indicator.style.transform = 'scale(1.1)';
  });
  
  indicator.addEventListener('mouseleave', () => {
    indicator.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(indicator);
}

// Add indicator after a delay to avoid conflicts
setTimeout(() => {
  if (!document.getElementById('liveprompt-indicator')) {
    addFloatingIndicator();
  }
}, 2000);

// Export for TypeScript
export {};