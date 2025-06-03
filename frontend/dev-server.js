const { spawn } = require('child_process');
const path = require('path');

let serverProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 5;

function startServer() {
  console.log('🚀 Starting Next.js development server...');
  
  serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`\n⚠️  Server exited with code ${code} and signal ${signal}`);
    
    if (restartCount < MAX_RESTARTS) {
      restartCount++;
      console.log(`🔄 Restarting server (attempt ${restartCount}/${MAX_RESTARTS})...`);
      setTimeout(startServer, 2000); // Wait 2 seconds before restart
    } else {
      console.error('❌ Max restart attempts reached. Please check for errors.');
      process.exit(1);
    }
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

// Start the server
startServer();