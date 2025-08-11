const fs = require('fs');
const v = JSON.parse(fs.readFileSync('version.json','utf8'));
const str = `${v.major}.${v.minor}`;
if (require.main === module) { console.log(str); }
module.exports = { str };
