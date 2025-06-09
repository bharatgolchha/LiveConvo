export function getBrowserInfo() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Detect browser type
  let browser = 'unknown';
  let version = '0';
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    browser = 'chrome';
    const match = userAgent.match(/chrome\/(\d+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('firefox')) {
    browser = 'firefox';
    const match = userAgent.match(/firefox\/(\d+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    browser = 'safari';
    const match = userAgent.match(/version\/(\d+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('edg')) {
    browser = 'edge';
    const match = userAgent.match(/edg\/(\d+)/);
    if (match) version = match[1];
  }
  
  return { browser, version: parseInt(version) };
}

export function isFullySupported() {
  const { browser, version } = getBrowserInfo();
  
  // Check for WebRTC support
  const hasWebRTC = !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    window.RTCPeerConnection
  );
  
  if (!hasWebRTC) return false;
  
  // Chrome 90+ and Edge 90+ are fully supported
  if (browser === 'chrome' && version >= 90) return true;
  if (browser === 'edge' && version >= 90) return true;
  
  return false;
}

export function getBrowserRecommendation() {
  const { browser, version } = getBrowserInfo();
  const hasWebRTC = !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    window.RTCPeerConnection
  );
  
  if (!hasWebRTC) {
    return 'Your browser doesn\'t support required audio features. Please use Google Chrome for the best experience.';
  }
  
  if (browser === 'firefox') {
    return 'Firefox has limited support for some audio features. For the best experience, we recommend using Google Chrome.';
  }
  
  if (browser === 'safari') {
    return 'Safari may have compatibility issues with real-time audio. For the best experience, we recommend using Google Chrome.';
  }
  
  if (browser === 'edge' && version < 90) {
    return 'Please update Microsoft Edge or switch to Google Chrome for the best experience.';
  }
  
  if (browser === 'chrome' && version < 90) {
    return 'Please update Google Chrome to the latest version for the best experience.';
  }
  
  return 'For the best experience with real-time audio features, we recommend using Google Chrome.';
}