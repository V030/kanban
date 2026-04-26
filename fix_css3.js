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

  content = content.replace(/padding:\s*(\d+)px\s+font-size:\s*var\(--text-xl\);/g, 'padding:  24px;');
  content = content.replace(/margin:\s*(\d+)px\s+0\s+font-size:\s*var\(--text-xl\);/g, 'margin:  0 24px;');
  content = content.replace(/margin-top:\s*font-size:\s*var\(--text-xl\);/g, 'margin-top: 24px;');
  content = content.replace(/padding:\s*1border-radius:\s*var\(--radius-sm\)\s+font-size:\s*var\(--text-xl\);/g, 'padding: 12px 24px;');
  content = content.replace(/padding:\s*font-size:\s*var\(--text-2xl\);/g, 'padding: 32px;');

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed spacing in ' + filePath);
  }
}

walkDir(path.join(__dirname, 'client/src'), processCssFile);
