// Configuration file for environment-specific settings
const CONFIG = {
  development: {
    API_BASE_URL: 'http://localhost:3000/api',
    WEB_BASE_URL: 'http://localhost:3000',
    SUPABASE_URL: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co'
  },
  production: {
    API_BASE_URL: 'https://liveprompt.ai/api',
    WEB_BASE_URL: 'https://liveprompt.ai',
    SUPABASE_URL: 'https://xkxjycccifwyxgtvflxz.supabase.co'
  }
};

// Set this to 'production' for production builds
const ENVIRONMENT = 'production'; // Change this for production build

const currentConfig = CONFIG[ENVIRONMENT];

// Export for use in service worker and content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = currentConfig;
} else {
  window.APP_CONFIG = currentConfig;
}