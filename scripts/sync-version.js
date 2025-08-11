const fs = require('fs');
const { str } = require('./print-version');
const ts = `export const VERSION = '${str}';\n`;
fs.writeFileSync('src/version.ts', ts);

// Assicura import styles + set document.title in main.tsx
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
    // se non ha trovato il blocco, mettiamo il title in testa
    if (!s.includes('WD v')) {
      s = `document.title = \`WD v\${VERSION}\`;\n` + s;
    }
  }
  fs.writeFileSync(mainPath, s);
} else {
  // se manca main.tsx, creiamo un fallback minimo per il title
  fs.writeFileSync(mainPath, `import './styles.css'\nimport { VERSION } from './version'\ndocument.title = \`WD v\${VERSION}\`\n`);
}
