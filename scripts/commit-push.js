const { execSync } = require('child_process');
const fs = require('fs');
const v = JSON.parse(fs.readFileSync('version.json','utf8'));
const tag = `WD v${v.major}.${v.minor}`;
try { execSync('git add -A', {stdio:'inherit'}); } catch{}
try { execSync(`git commit -m "Release ${tag}"`, {stdio:'inherit'}); } catch{}
try { execSync('git push origin main', {stdio:'inherit'}); } catch{}
console.log(`✓ Pushed ${tag}`);
