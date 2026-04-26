const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processCssFile(filePath) {
  if (!filePath.endsWith('.css') || filePath.endsWith('index.css')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix broken padding/margin
  content = content.replace(/padding:\s*0\s+border-radius:\s*var\(--radius-sm\);/g, 'padding: 0 4px;');
  content = content.replace(/padding:\s*border-radius:\s*var\(--radius-sm\)/g, 'padding: 4px');
  content = content.replace(/border-radius:\s*border-radius:\s*var\(--radius-sm\)/g, 'border-radius: var(--radius-sm)');

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + filePath);
  }
}

walkDir(path.join(__dirname, 'client/src'), processCssFile);
