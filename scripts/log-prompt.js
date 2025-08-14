#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}

function logPrompt(text) {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  const logFile = `logs/cursor-session-${today}.md`;
  
  // Get git info
  let gitInfo = '';
  try {
    const { execSync } = require('child_process');
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    gitInfo = ` (${branch}@${commit})`;
  } catch (err) {
    gitInfo = ' (git info unavailable)';
  }
  
  const logEntry = `- [${timestamp}]${gitInfo} ${text}\n`;
  
  // Create file with header if it doesn't exist
  if (!fs.existsSync(logFile)) {
    const header = `# Cursor Session Log - ${today}\n\n`;
    fs.writeFileSync(logFile, header);
  }
  
  // Append the log entry
  fs.appendFileSync(logFile, logEntry);
  
  console.log(`📝 Logged: ${text}`);
}

// Get text from command line arguments
const text = process.argv.slice(2).join(' ');

if (!text) {
  console.log('Usage: node scripts/log-prompt.js "your log message here"');
  process.exit(1);
}

logPrompt(text);
