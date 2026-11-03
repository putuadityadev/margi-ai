import fs from 'fs';
import path from 'path';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (/\.(tsx|ts|json)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('apps/web/src');
let violations = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Exclude copyright symbol or common safe glyphs if needed, but let's see what matches
    if (EMOJI_REGEX.test(line)) {
      // Ignore © or similar if flagged
      const cleanLine = line.replace(/©/g, '');
      if (EMOJI_REGEX.test(cleanLine)) {
        console.error(`${file}:${index + 1}: Found emoji: ${line.trim()}`);
        violations++;
      }
    }
  });
}

if (violations > 0) {
  console.error(`Total emoji violations: ${violations}`);
  process.exit(1);
} else {
  console.log('Zero emoji violations found across apps/web/src!');
  process.exit(0);
}

