const fs = require('fs');
const { str } = require('./print-version.cjs');
const ts = `export const VERSION = '${str}';\n`;
fs.writeFileSync('src/version.ts', ts);

const mainPath = 'src/main.tsx';
if (fs.existsSync(mainPath)) {
  let s = fs.readFileSync(mainPath, 'utf8');
  if (!s.includes("import './styles.css'")) {
    s = `import './styles.css'\n` + s;
  }
  if (!s.includes("from './version'")) {
    s = `import { VERSION } from './version'\n` + s;
  }
  if (!s.includes("document.title = `WD v`")) {
    s = s.replace(/(createRoot\(.*?\)\.render\([\s\S]*?\);\s*)$/m, (m) => {
      return `document.title = \`WD v\${VERSION}\`;\n` + m;
    });
  }
  fs.writeFileSync(mainPath, s);
} else {
  fs.writeFileSync(mainPath, `import './styles.css'\nimport { VERSION } from './version'\ndocument.title = \`WD v\${VERSION}\`\n`);
}
