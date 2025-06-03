// Custom logger to control verbosity
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment && logLevel === 'debug') {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (['debug', 'info'].includes(logLevel)) {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (['debug', 'info', 'warn'].includes(logLevel)) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  }
};

// Suppress fetch logging in development
if (isDevelopment && process.env.SUPPRESS_FETCH_LOGS === 'true') {
  const originalFetch = global.fetch;
  global.fetch = async (...args) => {
    return originalFetch(...args);
  };
}