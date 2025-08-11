const fs = require('fs');
const kind = process.argv[2]; // "major" | "minor"
const vpath = 'version.json';
const v = JSON.parse(fs.readFileSync(vpath,'utf8'));
if (kind === 'major') { v.major += 1; v.minor = 0; }
else if (kind === 'minor') { v.minor += 1; }
else { console.error('Usage: node scripts/bump.js [major|minor]'); process.exit(1); }
fs.writeFileSync(vpath, JSON.stringify(v, null, 2));
