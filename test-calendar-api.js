// Test script to monitor calendar API calls
const http = require('http');

let connectionsCalls = 0;
let eventsCalls = 0;

console.log('Monitoring calendar API calls...');
console.log('Press Ctrl+C to stop\n');

// Monitor API calls by intercepting console logs
const originalLog = console.log;
console.log = function(...args) {
  const logStr = args.join(' ');
  
  if (logStr.includes('GET /api/calendar/connections')) {
    connectionsCalls++;
    originalLog(`[${new Date().toISOString()}] Calendar connections API called (Total: ${connectionsCalls})`);
  } else if (logStr.includes('GET /api/calendar/events')) {
    eventsCalls++;
    originalLog(`[${new Date().toISOString()}] Calendar events API called (Total: ${eventsCalls})`);
  } else {
    originalLog.apply(console, args);
  }
};

// Print summary every 5 seconds
setInterval(() => {
  originalLog('\n--- API Call Summary ---');
  originalLog(`Calendar Connections: ${connectionsCalls} calls`);
  originalLog(`Calendar Events: ${eventsCalls} calls`);
  originalLog(`Average rate: ${(connectionsCalls + eventsCalls) / 5} calls/sec`);
  originalLog('------------------------\n');
  
  // Reset counters
  connectionsCalls = 0;
  eventsCalls = 0;
}, 5000);

// Keep the script running
process.stdin.resume();