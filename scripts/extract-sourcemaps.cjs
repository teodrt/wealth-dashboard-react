#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function extractSourcemaps(dir, outputDir) {
  let totalFiles = 0;
  let extractedFiles = [];
  const keywords = ['GlassCard', 'glass', 'ticker', 'news', 'worker', 'nudger', 'chunked', 'reset filter', 'FiltersBar'];
  
  function processDirectory(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            processDirectory(fullPath);
          }
        } else if (entry.name.endsWith('.map')) {
          try {
            const mapContent = fs.readFileSync(fullPath, 'utf8');
            const map = JSON.parse(mapContent);
            
            if (map.sourcesContent && Array.isArray(map.sourcesContent)) {
              for (let i = 0; i < map.sources.length; i++) {
                const sourcePath = map.sources[i];
                const sourceContent = map.sourcesContent[i];
                
                if (sourcePath && sourceContent && !sourcePath.includes('node_modules')) {
                  const outputPath = path.join(outputDir, sourcePath);
                  const outputDirPath = path.dirname(outputPath);
                  
                  if (!fs.existsSync(outputDirPath)) {
                    fs.mkdirSync(outputDirPath, { recursive: true });
                  }
                  
                  fs.writeFileSync(outputPath, sourceContent);
                  totalFiles++;
                  
                  // Check for keywords
                  const hasKeywords = keywords.some(keyword => 
                    sourceContent.includes(keyword)
                  );
                  
                  if (hasKeywords) {
                    extractedFiles.push({
                      path: sourcePath,
                      hasKeywords: true,
                      keywords: keywords.filter(k => sourceContent.includes(k))
                    });
                  } else {
                    extractedFiles.push({
                      path: sourcePath,
                      hasKeywords: false
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`Failed to process map file ${fullPath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to read directory ${currentDir}:`, err.message);
    }
  }
  
  processDirectory(dir);
  
  return { totalFiles, extractedFiles };
}

// Main execution
const outputDir = path.join(__dirname, '..', 'recovery', 'sourcemaps');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Extracting sourcemaps...');
const result = extractSourcemaps('.', outputDir);

console.log(`\nExtraction complete!`);
console.log(`Total files extracted: ${result.totalFiles}`);
console.log(`Files with keywords: ${result.extractedFiles.filter(f => f.hasKeywords).length}`);

if (result.extractedFiles.filter(f => f.hasKeywords).length > 0) {
  console.log('\nFiles with GlassCard/ticker/news keywords:');
  result.extractedFiles
    .filter(f => f.hasKeywords)
    .forEach(f => {
      console.log(`  ${f.path} - Keywords: ${f.keywords.join(', ')}`);
    });
}

// Save summary
const summaryPath = path.join(__dirname, '..', 'recovery', 'sourcemaps_summary.txt');
const summary = `Sourcemaps Extraction Summary
Generated: ${new Date().toISOString()}
Total files extracted: ${result.totalFiles}
Files with keywords: ${result.extractedFiles.filter(f => f.hasKeywords).length}

Files with GlassCard/ticker/news keywords:
${result.extractedFiles
  .filter(f => f.hasKeywords)
  .map(f => `  ${f.path} - Keywords: ${f.keywords.join(', ')}`)
  .join('\n')}

All extracted files:
${result.extractedFiles.map(f => `  ${f.path}`).join('\n')}
`;

fs.writeFileSync(summaryPath, summary);
console.log(`\nSummary saved to: ${summaryPath}`);
