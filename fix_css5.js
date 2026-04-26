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

  // Fix 3border-radius -> 36px
  content = content.replace(/3border-radius:\s*var\(--radius-[a-z]+\)/g, '36px');
  // Fix box-shadow
  content = content.replace(/0\s+4px\s+border-radius:\s*var\(--radius-[a-z]+\)\s+-2px/g, '0 4px 6px -2px');
  // Fix random padding like padding: 10px 14px: var(--radius-sm); -> padding: 10px 16px;
  content = content.replace(/14px:\s*var\(--radius-sm\)/g, '16px');
  // 1border-radius -> 16px
  content = content.replace(/1border-radius:\s*var\(--radius-sm\)/g, '16px');
  // 14px: var(--radius-sm)
  content = content.replace(/14px:\s*var\(--radius-sm\)/g, '16px');
  // Another general check for any inline border-radius replacing 6px
  content = content.replace(/([0-9]+px\s+)border-radius:\s*var\(--radius-sm\)/g, '\ 6px');
  content = content.replace(/padding:\s*([^;]+)border-radius:\s*var\(--radius-[a-z]+\)/g, 'padding: \ 6px');
  content = content.replace(/margin:\s*([^;]+)border-radius:\s*var\(--radius-[a-z]+\)/g, 'margin: \ 6px');
  content = content.replace(/gap:\s*border-radius:\s*var\(--radius-sm\)/g, 'gap: 6px');
  content = content.replace(/width:\s*border-radius:\s*var\(--radius-[a-z]+\)/g, 'width: 6px');
  content = content.replace(/height:\s*border-radius:\s*var\(--radius-[a-z]+\)/g, 'height: 6px');

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Repaired ' + filePath);
  }
}

walkDir(path.join(__dirname, 'client/src'), processCssFile);
