console.log('LivePrompt: Google Meet content script loaded');

let widgetInjected = false;
let activeSession = null;
let widget = null;
let menu = null;
let isMenuOpen = false;

// Wait for Meet to fully load
function waitForMeetReady() {
  const checkInterval = setInterval(() => {
    // Check if we're in an active meeting (not in lobby)
    const meetingContainer = document.querySelector('[data-meeting-title]') || 
                           document.querySelector('[data-participant-id]') ||
                           document.querySelector('[data-self-name]');
    
    if (meetingContainer && !widgetInjected) {
      clearInterval(checkInterval);
      injectWidget();
      extractMeetingInfo();
    }
  }, 1000);
}

function extractMeetingInfo() {
  const meetingInfo = {
    platform: 'meet',
    url: window.location.href,
    meetingId: extractMeetingId(),
    title: extractMeetingTitle()
  };
  
  console.log('LivePrompt: Extracted meeting info:', meetingInfo);
  return meetingInfo;
}

function extractMeetingId() {
  // Extract meeting ID from URL (format: meet.google.com/xxx-xxxx-xxx)
  const match = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
  return match ? match[1] : null;
}

function extractMeetingTitle() {
  // Try to get meeting title from various sources
  const titleElement = document.querySelector('[data-meeting-title]');
  if (titleElement) {
    return titleElement.getAttribute('data-meeting-title');
  }
  
  // Fallback: try to get from page title
  const pageTitle = document.title;
  if (pageTitle && pageTitle !== 'Meet') {
    return pageTitle.replace(' - Google Meet', '');
  }
  
  return 'Google Meet';
}

function injectWidget() {
  if (widgetInjected) return;
  
  // Add platform class to body
  document.body.classList.add('liveprompt-on-meet');
  
  // Create floating widget
  widget = document.createElement('button');
  widget.className = 'liveprompt-fab';

  const iconUrl = chrome.runtime.getURL('assets/icons/icon-48.png');
  widget.innerHTML = `
    <div class="liveprompt-fab-icon">
      <img src="${iconUrl}" alt="LivePrompt" width="24" height="24" />
    </div>
    <div class="liveprompt-tooltip">LivePrompt AI Assistant</div>
  `;
  
  // Create menu
  menu = document.createElement('div');
  menu.className = 'liveprompt-menu';
  menu.innerHTML = `
    <button class="liveprompt-menu-item primary" id="liveprompt-start-session">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M10 8L16 12L10 16V8Z" fill="currentColor"/>
      </svg>
      <span>Start LivePrompt Session</span>
    </button>
    <button class="liveprompt-menu-item danger" id="liveprompt-end-session" style="display: none;">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span>End Session</span>
    </button>
    <a href="#" target="_blank" class="liveprompt-menu-item" id="liveprompt-open-session" style="display:none;">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M14 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 3H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 3V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Go to Session</span>
    </a>
    <div class="liveprompt-menu-divider"></div>
    <a href="https://liveprompt.ai/dashboard" target="_blank" class="liveprompt-menu-item">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M9 3V21" stroke="currentColor" stroke-width="2"/>
        <path d="M3 9H21" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span>Open Dashboard</span>
    </a>
  `;
  
  document.body.appendChild(widget);
  document.body.appendChild(menu);
  
  setupEventListeners();
  makeDraggable(widget);
  checkForActiveSession();
  
  widgetInjected = true;
  console.log('LivePrompt: Widget injected successfully');
}

function setupEventListeners() {
  // Toggle menu on widget click
  widget.addEventListener('click', (e) => {
    if (!e.target.closest('.liveprompt-fab').classList.contains('dragging')) {
      toggleMenu();
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.liveprompt-fab') && !e.target.closest('.liveprompt-menu')) {
      closeMenu();
    }
  });
  
  // Menu actions
  document.getElementById('liveprompt-start-session').addEventListener('click', startSession);
  document.getElementById('liveprompt-end-session').addEventListener('click', endSession);
}

function toggleMenu() {
  isMenuOpen = !isMenuOpen;
  if (isMenuOpen) {
    menu.classList.add('show');
  } else {
    menu.classList.remove('show');
  }
}

function closeMenu() {
  isMenuOpen = false;
  menu.classList.remove('show');
}

async function startSession() {
  closeMenu();
  
  const meetingInfo = extractMeetingInfo();
  
  // Show loading state
  widget.innerHTML = '<div class="liveprompt-loading"></div>';
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_SESSION',
      data: meetingInfo
    });
    
    if (response.success) {
      activeSession = response.session;
      updateWidgetState(true);
      showNotification('LivePrompt session started!');
    } else {
      showNotification('Failed to start session: ' + (response.error || 'Unknown error'), 'error');
      updateWidgetState(false);
    }
  } catch (error) {
    console.error('LivePrompt: Error starting session:', error);
    showNotification('Failed to start session', 'error');
    updateWidgetState(false);
  }
}

async function endSession() {
  if (!activeSession) return;
  
  closeMenu();
  
  // Show loading state
  widget.innerHTML = '<div class="liveprompt-loading"></div>';
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'END_SESSION',
      sessionId: activeSession.id
    });
    
    if (response.success) {
      activeSession = null;
      updateWidgetState(false);
      showNotification('LivePrompt session ended');
    } else {
      showNotification('Failed to end session', 'error');
      updateWidgetState(true);
    }
  } catch (error) {
    console.error('LivePrompt: Error ending session:', error);
    showNotification('Failed to end session', 'error');
    updateWidgetState(true);
  }
}

function updateWidgetState(isActive) {
  const iconUrl = chrome.runtime.getURL('assets/icons/icon-48.png');
  widget.innerHTML = `
    <div class="liveprompt-fab-icon">
      <img src="${iconUrl}" alt="LivePrompt" width="24" height="24" />
    </div>
    <div class="liveprompt-tooltip">LivePrompt AI Assistant</div>
    ${isActive ? '<div class="liveprompt-status"></div>' : ''}
  `;
  
  if (isActive) {
    widget.classList.add('active');
    document.getElementById('liveprompt-start-session').style.display = 'none';
    document.getElementById('liveprompt-end-session').style.display = 'flex';
    document.getElementById('liveprompt-open-session').style.display = 'flex';
    const linkEl = document.getElementById('liveprompt-open-session');
    if (isActive) {
      const base = location.origin.startsWith('http://localhost') ? 'http://localhost:3000' : 'https://liveprompt.ai';
      linkEl.href = `${base}/meeting/${activeSession.id}`;
    }
  } else {
    widget.classList.remove('active');
    document.getElementById('liveprompt-start-session').style.display = 'flex';
    document.getElementById('liveprompt-end-session').style.display = 'none';
    document.getElementById('liveprompt-open-session').style.display = 'none';
  }
}

async function checkForActiveSession() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_SESSION' });
    if (response.session) {
      activeSession = response.session;
      updateWidgetState(true);
    }
  } catch (error) {
    console.error('LivePrompt: Error checking active session:', error);
  }
}

function makeDraggable(element) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  element.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === element || e.target.parentElement === element) {
      isDragging = true;
      element.classList.add('dragging');
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      xOffset = currentX;
      yOffset = currentY;

      element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      element.style.bottom = 'auto';
      element.style.right = 'auto';
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;

    isDragging = false;
    element.classList.remove('dragging');
  }
}

function showNotification(message, type = 'success') {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 100000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'SESSION_STARTED':
      activeSession = request.session;
      updateWidgetState(true);
      break;
    case 'SESSION_ENDED':
      activeSession = null;
      updateWidgetState(false);
      break;
  }
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Start monitoring for Meet UI
waitForMeetReady();