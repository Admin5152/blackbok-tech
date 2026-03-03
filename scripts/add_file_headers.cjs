const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', 'public']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isDirectory()) {
      if (ignoredDirs.has(ent.name)) continue;
      walk(path.join(dir, ent.name));
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name);
      if (!exts.has(ext)) continue;
      const full = path.join(dir, ent.name);
      processFile(full);
    }
  }
}

function hasLeadingComment(contents) {
  const head = contents.slice(0, 200).trimStart();
  return head.startsWith('/**') || head.startsWith('/*') || head.startsWith('//');
}

function processFile(fullPath) {
  try {
    const contents = fs.readFileSync(fullPath, 'utf8');
    if (hasLeadingComment(contents)) {
      console.log('SKIP (has comment):', path.relative(root, fullPath));
      return;
    }
    const rel = path.relative(root, fullPath).replace(/\\/g, '/');
    const header = `/**\n * File: ${rel}\n * Purpose: Briefly describes the file's responsibility and exported symbols.\n * Notes: Added concise JSDoc-style header by automation. Expand as needed.\n */\n\n`;
    // Backup original
    fs.writeFileSync(fullPath + '.bak_comment', contents, 'utf8');
    fs.writeFileSync(fullPath, header + contents, 'utf8');
    console.log('UPDATED:', rel);
  } catch (err) {
    console.error('ERR', fullPath, err.message);
  }
}

console.log('Scanning from', root);
walk(root);
console.log('Done');
