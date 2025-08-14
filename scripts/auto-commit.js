#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  intervalMin: parseInt(process.env.INTERVAL_MIN) || 5,
  significantFiles: parseInt(process.env.SIGNIFICANT_FILES) || 5,
  significantLines: parseInt(process.env.SIGNIFICANT_LINES) || 120,
  wipPrefix: process.env.WIP_PREFIX || 'wip',
  logFile: 'logs/autosave.log',
  pidFile: '.autosave.pid'
};

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  try {
    fs.appendFileSync(config.logFile, logMessage + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
}

// Git helper functions
function gitCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', ...options });
  } catch (err) {
    if (options.ignoreErrors) return '';
    throw err;
  }
}

function getCurrentBranch() {
  return gitCommand('git rev-parse --abbrev-ref HEAD').trim();
}

function getCurrentCommit() {
  return gitCommand('git rev-parse HEAD').trim();
}

function getWipBranch() {
  const today = new Date().toISOString().split('T')[0];
  return `${config.wipPrefix}/${today}`;
}

function ensureWipBranch() {
  const wipBranch = getWipBranch();
  const currentBranch = getCurrentBranch();
  
  try {
    // Check if WIP branch exists
    gitCommand(`git show-ref --verify --quiet refs/remotes/origin/${wipBranch}`, { ignoreErrors: true });
    log(`WIP branch ${wipBranch} exists, checking out`);
    gitCommand(`git checkout ${wipBranch}`);
  } catch (err) {
    log(`Creating new WIP branch ${wipBranch} from ${currentBranch}`);
    gitCommand(`git checkout -b ${wipBranch}`);
    gitCommand(`git push -u origin ${wipBranch}`);
  }
}

function hasChanges() {
  const status = gitCommand('git status --porcelain');
  return status.trim().length > 0;
}

function getChangeStats() {
  try {
    const stats = gitCommand('git diff --shortstat');
    const stagedStats = gitCommand('git diff --cached --shortstat');
    
    // Parse stats
    const parseStats = (statStr) => {
      if (!statStr) return { files: 0, lines: 0 };
      const match = statStr.match(/(\d+) files? changed, (\d+) insertions?\(\+\), (\d+) deletions?\(-\)/);
      if (match) {
        return {
          files: parseInt(match[1]),
          lines: parseInt(match[2]) + parseInt(match[3])
        };
      }
      return { files: 0, lines: 0 };
    };
    
    const unstaged = parseStats(stats);
    const staged = parseStats(stagedStats);
    
    return {
      files: unstaged.files + staged.files,
      lines: unstaged.lines + staged.lines
    };
  } catch (err) {
    return { files: 0, lines: 0 };
  }
}

function isSignificantChange() {
  const stats = getChangeStats();
  const criticalFiles = [
    'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
    'next.config.js', 'next.config.ts', 'vite.config.js', 'vite.config.ts',
    'app/', 'components/', 'pages/', 'src/components/', 'src/workers/'
  ];
  
  // Check file count and line count
  if (stats.files >= config.significantFiles || stats.lines >= config.significantLines) {
    return true;
  }
  
  // Check for critical files
  const status = gitCommand('git status --porcelain');
  for (const file of criticalFiles) {
    if (status.includes(file)) {
      return true;
    }
  }
  
  return false;
}

function createCommit(message) {
  try {
    gitCommand('git add -A');
    gitCommand(`git commit -m "${message}"`);
    gitCommand('git push origin HEAD');
    log(`✅ Committed and pushed: ${message}`);
    return true;
  } catch (err) {
    log(`❌ Failed to commit: ${err.message}`);
    return false;
  }
}

function runSnapshot() {
  try {
    execSync('bash scripts/snapshot.sh', { stdio: 'inherit' });
    log('📸 Snapshot created');
  } catch (err) {
    log(`❌ Snapshot failed: ${err.message}`);
  }
}

// Main autosave loop
function autosaveLoop() {
  const intervalMs = config.intervalMin * 60 * 1000;
  
  log(`🔄 Starting autosave loop (${config.intervalMin} min intervals)`);
  
  setInterval(() => {
    try {
      if (hasChanges()) {
        const timestamp = new Date().toISOString();
        const message = `chore(wip): autosave ${timestamp}`;
        
        if (createCommit(message)) {
          runSnapshot();
        }
      }
    } catch (err) {
      log(`❌ Autosave loop error: ${err.message}`);
    }
  }, intervalMs);
}

// Significant change detector
function significantChangeDetector() {
  let lastCheck = 0;
  const checkInterval = 30000; // 30 seconds
  const debounceTime = 20000; // 20 seconds
  
  log('🔍 Starting significant change detector');
  
  setInterval(() => {
    try {
      const now = Date.now();
      if (now - lastCheck < debounceTime) return;
      
      if (hasChanges() && isSignificantChange()) {
        lastCheck = now;
        const stats = getChangeStats();
        const message = `feat(auto): significant change (${stats.files} files, ${stats.lines} lines)`;
        
        if (createCommit(message)) {
          runSnapshot();
        }
      }
    } catch (err) {
      log(`❌ Significant change detector error: ${err.message}`);
    }
  }, checkInterval);
}

// CLI commands
function start() {
  if (process.env.AUTOSAVE_DISABLED === '1') {
    log('🚫 Autosave disabled by AUTOSAVE_DISABLED=1');
    return;
  }
  
  // Write PID file
  fs.writeFileSync(config.pidFile, process.pid.toString());
  
  log('🚀 Starting autosave system');
  log(`📊 Config: ${config.intervalMin}min intervals, ${config.significantFiles} files, ${config.significantLines} lines`);
  
  // Ensure WIP branch
  ensureWipBranch();
  
  // Run initial snapshot
  runSnapshot();
  
  // Start loops
  autosaveLoop();
  significantChangeDetector();
  
  // Keep process alive
  process.on('SIGINT', () => {
    log('🛑 Received SIGINT, shutting down gracefully');
    stop();
  });
  
  process.on('SIGTERM', () => {
    log('🛑 Received SIGTERM, shutting down gracefully');
    stop();
  });
}

function stop() {
  try {
    if (fs.existsSync(config.pidFile)) {
      const pid = fs.readFileSync(config.pidFile, 'utf8').trim();
      process.kill(parseInt(pid), 'SIGTERM');
      fs.unlinkSync(config.pidFile);
    }
    log('🛑 Autosave stopped');
  } catch (err) {
    log(`❌ Error stopping autosave: ${err.message}`);
  }
  process.exit(0);
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  default:
    console.log('Usage: node scripts/auto-commit.js [start|stop]');
    process.exit(1);
}
