#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getGitInfo() {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const tag = execSync('git describe --tags --exact-match 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
    const timestamp = new Date().toISOString();
    
    return {
      commit,
      shortCommit,
      branch,
      tag: tag || null,
      timestamp,
      version: '2.52'
    };
  } catch (error) {
    console.warn('Warning: Could not get git info:', error.message);
    return {
      commit: 'unknown',
      shortCommit: 'unknown',
      branch: 'unknown',
      tag: null,
      timestamp: new Date().toISOString(),
      version: '2.52'
    };
  }
}

function injectVersion() {
  const gitInfo = getGitInfo();
  const versionData = {
    ...gitInfo,
    buildTime: gitInfo.timestamp,
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Write version.json
  const versionPath = path.join(__dirname, '..', 'version.json');
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
  
  // Write environment variables for Vite
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = `VITE_GIT_COMMIT=${gitInfo.shortCommit}
VITE_GIT_BRANCH=${gitInfo.branch}
VITE_GIT_TAG=${gitInfo.tag || ''}
VITE_BUILD_TIME=${gitInfo.timestamp}
VITE_APP_VERSION=${gitInfo.version}`;
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Version information injected:');
  console.log(`   Version: ${gitInfo.version}`);
  console.log(`   Commit: ${gitInfo.shortCommit}`);
  console.log(`   Branch: ${gitInfo.branch}`);
  console.log(`   Tag: ${gitInfo.tag || 'none'}`);
  console.log(`   Build Time: ${gitInfo.timestamp}`);
  console.log(`   Files created: version.json, .env.local`);
}

// Run if called directly
if (require.main === module) {
  injectVersion();
}

module.exports = { injectVersion, getGitInfo };
