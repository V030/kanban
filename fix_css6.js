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

  // AddTaskModal.css
  content = content.replace(/background-size:\s*(border-radius:\s*var\(--radius-sm\)[,\s]*)+;/g, 'background-size: 5px 5px, 5px 5px;');
  
  // ColumnsReorderModal.css shadow
  content = content.replace(/box-shadow:\s*0\s*border-radius:\s*var\(--radius-sm\)\s*font-size:\s*var\(--text-[^\)]+\)\s*rgba/g, 'box-shadow: 0 6px 24px rgba');
  
  // ColumnsReorderModal.css margin-left
  content = content.replace(/margin-left:\s*border-radius:\s*var\(--radius-[a-z]+\)/g, 'margin-left: 6px');

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Final wipe of ' + filePath);
  }
}

walkDir(path.join(__dirname, 'client/src'), processCssFile);
