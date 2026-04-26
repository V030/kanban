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

  content = content.replace(/padding:\s*1border-radius:\s*var\(--radius-sm\)/g, 'padding: 14px');
  content = content.replace(/margin:\s*border-radius:\s*var\(--radius-sm\)\s*0\s*0/g, 'margin: 4px 0 0');
  content = content.replace(/border-radius:\s*14px/g, 'border-radius: var(--radius-lg)');
  content = content.replace(/box-shadow:\s*0\s*20px\s*45px\s*rgba\(15,\s*23,\s*42,\s*0\.18\)/g, 'box-shadow: var(--shadow-lg)');
  content = content.replace(/padding:\s*font-size:\s*var\(--text-xl\)/g, 'padding: 24px');
  content = content.replace(/font-size:\s*1\.3rem/g, 'font-size: var(--text-xl)');
  content = content.replace(/font-size:\s*0\.92rem/g, 'font-size: var(--text-sm)');
  content = content.replace(/font-size:\s*0\.9rem/g, 'font-size: var(--text-sm)');

  // Fix other random leftovers from regex bugs:
  content = content.replace(/1border-radius/g, '14px');
  content = content.replace(/border-radius:\s*var\(--radius-sm\)\s+0\s+0/g, '4px 0 0');
  content = content.replace(/\[border-radius/g, '['); // just in case

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Cleaned up modal css in ' + filePath);
  }
}

walkDir(path.join(__dirname, 'client/src'), processCssFile);
