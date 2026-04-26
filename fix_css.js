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

  // Colors
  content = content.replace(/#fff(?:fff)?/gi, 'var(--color-bg-surface)');
  content = content.replace(/#f5f7f9|#f4f5f7|#f9fafb|#f7f7f7/gi, 'var(--color-bg-subtle)');
  content = content.replace(/#111827|#1f2937|#0f172a|#222/gi, 'var(--color-text-primary)');
  content = content.replace(/#6b7280|#4b5563|#546173|#667085|#666|#777|#888/gi, 'var(--color-text-secondary)');
  content = content.replace(/#94a3b8|#aaa|#bbb/gi, 'var(--color-text-tertiary)');
  content = content.replace(/#e5e7eb|#d1d5db|#ececec|#e6eef6|#d4dbe6|#ddd|#ccc|rgba\(0,\s*0,\s*0,\s*0.1\)|rgba\(0,0,0,0.1\)/gi, 'var(--color-border)');
  content = content.replace(/#0ea5e9|#3b82f6|#2563eb|#0056b3|#007bff/gi, 'var(--color-primary)');
  content = content.replace(/#1d4ed8|#0284c7|#1e40af|#0056b3/gi, 'var(--color-primary-hover)');
  content = content.replace(/#eef4ff|#f1f8fb/gi, 'var(--color-primary-subtle)');
  
  // Font sizes
  content = content.replace(/font-size:\s*12px/g, 'font-size: var(--text-xs)');
  content = content.replace(/font-size:\s*0\.75rem/g, 'font-size: var(--text-xs)');
  content = content.replace(/font-size:\s*14px/g, 'font-size: var(--text-sm)');
  content = content.replace(/font-size:\s*0\.85rem/g, 'font-size: var(--text-sm)');
  content = content.replace(/font-size:\s*16px/g, 'font-size: var(--text-base)');
  content = content.replace(/font-size:\s*1rem/g, 'font-size: var(--text-base)');
  content = content.replace(/font-size:\s*18px/g, 'font-size: var(--text-lg)');
  content = content.replace(/font-size:\s*0\.95rem/g, 'font-size: var(--text-sm)');
  content = content.replace(/font-size:\s*1\.1rem/g, 'font-size: var(--text-lg)');
  content = content.replace(/font-size:\s*20px|24px/g, 'font-size: var(--text-xl)');
  content = content.replace(/font-size:\s*1\.5rem/g, 'font-size: var(--text-xl)');
  content = content.replace(/font-size:\s*1\.17em/g, 'font-size: var(--text-lg)');
  content = content.replace(/font-size:\s*2rem|32px/g, 'font-size: var(--text-2xl)');

  // Border radius
  content = content.replace(/border-radius:\s*3px/g, 'border-radius: var(--radius-sm)');
  content = content.replace(/border-radius:\s*4px/g, 'border-radius: var(--radius-sm)');
  content = content.replace(/border-radius:\s*5px|6px/g, 'border-radius: var(--radius-sm)');
  content = content.replace(/border-radius:\s*8px/g, 'border-radius: var(--radius-md)');
  content = content.replace(/border-radius:\s*10px/g, 'border-radius: var(--radius-md)');
  content = content.replace(/border-radius:\s*12px/g, 'border-radius: var(--radius-md)');
  content = content.replace(/border-radius:\s*15px/g, 'border-radius: var(--radius-lg)');
  content = content.replace(/border-radius:\s*50%/g, 'border-radius: var(--radius-full)');

  // Box shadow mappings
  content = content.replace(/box-shadow:\s*0\s+1px\s+3px\s+rgba\(0,\s*0,\s*0,\s*0\.1[^\)]*\)/g, 'box-shadow: var(--shadow-md)');
  content = content.replace(/box-shadow:\s*0\s+2px\s+4px\s+rgba\(0,\s*0,\s*0,\s*0\.1\)/g, 'box-shadow: var(--shadow-md)');
  content = content.replace(/box-shadow:\s*0\s+4px\s+10px\s+rgba\(0,\s*0,\s*0,\s*0\.1\)/g, 'box-shadow: var(--shadow-lg)');
  content = content.replace(/box-shadow:\s*0\s+4px\s+6px\s+rgba\(0,\s*0,\s*0,\s*0\.1[^\)]*\)/g, 'box-shadow: var(--shadow-lg)');

  if (original !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

walkDir(path.join(__dirname, 'client/src'), processCssFile);
