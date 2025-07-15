#!/usr/bin/env node

/**
 * Deep Research Agent Startup Script
 * This script starts both the backend and frontend servers
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printBanner() {
  colorLog('cyan', '╔═══════════════════════════════════════════════════════════════╗');
  colorLog('cyan', '║                    Deep Research Agent                        ║');
  colorLog('cyan', '║                   Starting Application...                     ║');
  colorLog('cyan', '╚═══════════════════════════════════════════════════════════════╝');
  console.log();
}

function printSuccess() {
  colorLog('green', '🎉 Application started successfully!');
  colorLog('green', '');
  colorLog('green', '📱 Frontend: http://localhost:5173');
  colorLog('green', '🔧 Backend API: http://localhost:8000');
  colorLog('green', '📚 API Documentation: http://localhost:8000/docs');
  colorLog('green', '');
  colorLog('yellow', '💡 Press Ctrl+C to stop all servers');
  console.log();
}

function printQuickStartGuide() {
  colorLog('yellow', '🚀 Quick Start Guide:');
  colorLog('yellow', '1. Wait for both servers to start (you\'ll see "ready" messages)');
  colorLog('yellow', '2. Open http://localhost:5173 in your browser');
  colorLog('yellow', '3. Enter a research question to test the system');
  colorLog('yellow', '4. If you see "Backend Offline", check the terminal for errors');
  console.log();
}

let processes = [];

function cleanup() {
  colorLog('yellow', '\n🛑 Shutting down servers...');
  
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
      setTimeout(() => {
        if (proc && !proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 3000);
    }
  });
  
  setTimeout(() => {
    colorLog('green', '✅ Shutdown complete');
    process.exit(0);
  }, 4000);
}

function startBackend() {
  return new Promise((resolve, reject) => {
    colorLog('blue', '🔧 Starting backend server...');
    
    // Check if backend directory exists
    const backendDir = path.join(process.cwd(), 'backend');
    if (!fs.existsSync(backendDir)) {
      reject(new Error('Backend directory not found'));
      return;
    }
    
    // Check if .env file exists
    const envFile = path.join(backendDir, '.env');
    if (!fs.existsSync(envFile)) {
      colorLog('yellow', '⚠️  .env file not found in backend directory');
      colorLog('yellow', '   Creating .env file with Gemini API key...');
      
      // Create .env file with the provided API key
      const envContent = `# Google AI API Configuration
GEMINI_API_KEY=AIzaSyBuShUosDe7MiP2ALBg88CL6_RoQSgwiM8

# Google Search API Configuration (optional but recommended)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_custom_search_engine_id_here

# Research Parameters
INITIAL_QUERIES_COUNT=3
MAX_RESEARCH_LOOPS=2
MAX_SOURCES_PER_QUERY=10
SEARCH_TIMEOUT_SECONDS=30

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
`;
      
      fs.writeFileSync(envFile, envContent);
      colorLog('green', '✅ .env file created');
    }
    
    const backendProcess = spawn('python', ['-m', 'main', 'server', '--reload'], {
      cwd: backendDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        PYTHONPATH: process.cwd(),
        PYTHONUNBUFFERED: '1'
      }
    });
    
    processes.push(backendProcess);
    let backendReady = false;
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Filter out verbose logs but show important ones
      if (output.includes('Uvicorn running') || 
          output.includes('Application startup complete') ||
          output.includes('Started server process') ||
          output.includes('ERROR') ||
          output.includes('WARNING')) {
        process.stdout.write(`${colors.blue}[BACKEND]${colors.reset} ${output}`);
      }
      
      if (output.includes('Uvicorn running') && !backendReady) {
        backendReady = true;
        colorLog('green', '✅ Backend server ready');
        resolve();
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      process.stderr.write(`${colors.red}[BACKEND ERROR]${colors.reset} ${error}`);
      
      if (error.includes('Address already in use')) {
        colorLog('yellow', '⚠️  Backend port 8000 is already in use');
        colorLog('yellow', '   Another instance might be running');
        // Still resolve since there might be a working backend
        if (!backendReady) {
          backendReady = true;
          resolve();
        }
      }
    });
    
    backendProcess.on('error', (error) => {
      if (error.code === 'ENOENT') {
        colorLog('red', '❌ Python not found. Please install Python 3.8+');
        colorLog('yellow', '   Download from: https://python.org/downloads/');
        reject(error);
      } else {
        colorLog('red', '❌ Backend startup error:', error.message);
        reject(error);
      }
    });
    
    backendProcess.on('close', (code) => {
      if (code !== 0 && !backendReady) {
        colorLog('red', `❌ Backend exited with code ${code}`);
        
        // Check for common issues
        if (code === 1) {
          colorLog('yellow', '💡 Common solutions:');
          colorLog('yellow', '   - Install dependencies: pip install -r backend/requirements.txt');
          colorLog('yellow', '   - Check Python version: python --version (need 3.8+)');
          colorLog('yellow', '   - Verify API keys in backend/.env file');
        }
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!backendReady) {
        colorLog('red', '❌ Backend startup timed out');
        reject(new Error('Backend startup timeout'));
      }
    }, 30000);
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    colorLog('blue', '🌐 Starting frontend server...');
    
    const frontendProcess = spawn('npx', ['vite'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true
    });
    
    processes.push(frontendProcess);
    let frontendReady = false;
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Show important frontend logs
      if (output.includes('Local:') || 
          output.includes('ready') ||
          output.includes('error') ||
          output.includes('warning')) {
        process.stdout.write(`${colors.magenta}[FRONTEND]${colors.reset} ${output}`);
      }
      
      if (output.includes('Local:') && !frontendReady) {
        frontendReady = true;
        colorLog('green', '✅ Frontend server ready');
        resolve();
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('ExperimentalWarning')) {
        process.stderr.write(`${colors.red}[FRONTEND ERROR]${colors.reset} ${error}`);
      }
    });
    
    frontendProcess.on('error', (error) => {
      colorLog('red', '❌ Frontend startup error:', error.message);
      reject(error);
    });
    
    frontendProcess.on('close', (code) => {
      if (code !== 0 && !frontendReady) {
        colorLog('red', `❌ Frontend exited with code ${code}`);
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!frontendReady) {
        colorLog('red', '❌ Frontend startup timed out');
        reject(new Error('Frontend startup timeout'));
      }
    }, 30000);
  });
}

async function main() {
  printBanner();
  
  try {
    // Check if node_modules exists
    if (!fs.existsSync('node_modules')) {
      colorLog('yellow', '📦 Installing frontend dependencies...');
      await new Promise((resolve, reject) => {
        exec('npm install', (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            colorLog('green', '✅ Frontend dependencies installed');
            resolve();
          }
        });
      });
    }
    
    // Start both servers
    await Promise.all([
      startBackend().catch(error => {
        colorLog('yellow', '⚠️  Backend failed to start, but continuing...');
        colorLog('yellow', '   Frontend will show "Demo Mode" when backend is unavailable');
        console.error('Backend error:', error.message);
      }),
      startFrontend()
    ]);
    
    printSuccess();
    printQuickStartGuide();
    
  } catch (error) {
    colorLog('red', '❌ Failed to start application:');
    console.error(error.message);
    
    colorLog('yellow', '\n💡 Troubleshooting:');
    colorLog('yellow', '1. Make sure Node.js and Python are installed');
    colorLog('yellow', '2. Run: npm install && pip install -r backend/requirements.txt');
    colorLog('yellow', '3. Check that ports 3000 and 8000 are available');
    colorLog('yellow', '4. Look at the error messages above for specific issues');
    
    cleanup();
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the application
main();