// Debug logging utility with conditional output
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_DEBUG === 'true';
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = DEBUG_ENABLED ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

export const debug = {
  log: (...args: any[]) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};