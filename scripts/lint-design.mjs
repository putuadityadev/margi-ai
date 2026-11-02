import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Enforces MARGI AI design-system constraints from DESIGN.md, PRD §10, and TDD §13.5:
 * - No drop/box shadow utilities (`shadow-*`, `drop-shadow-*`) anywhere in `apps/web/src`.
 * - No bold font-weight utilities (`font-semibold`, `font-bold`, `font-extrabold`, `font-black`).
 * - No `dangerouslySetInnerHTML`.
 * - Semantic `crowd-*` color tokens may only be referenced inside `features/results/` or `components/data/`
 *   (excluding CSS custom property declarations `--color-crowd-*` in `styles/`).
 */

const WEB_SRC = join(process.cwd(), 'apps', 'web', 'src');
const CHECKED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);

const GLOBAL_RULES = [
  {
    id: 'no-shadow-utility',
    // Negative lookbehind avoids matching `--shadow-*` CSS variable resets in `@theme`.
    pattern: /(?<![-\w])(?:drop-)?shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|none|\[)/g,
    message:
      'Shadow utilities are forbidden by DESIGN.md (rely on surface tonal contrast instead).',
  },
  {
    id: 'no-bold-weight',
    pattern: /(?<![-\w])font-(?:semibold|bold|extrabold|black)\b/g,
    message: 'Weights above 500 (semibold/bold) are forbidden by DESIGN.md (use 400 or 500 only).',
  },
  {
    id: 'no-dangerously-set-inner-html',
    pattern: /\bdangerouslySetInnerHTML\b/g,
    message: 'dangerouslySetInnerHTML is forbidden by TDD §14 XSS controls.',
  },
];

// Matches utility classes such as `bg-crowd-high`, `text-crowd-low`, `crowd-surge`,
// while ignoring `--color-crowd-*` variable declarations inside `@theme`.
const CROWD_UTILITY_PATTERN = /(?<!color-)crowd-(?:low|below|avg|above|high|surge)\b/g;

function collectFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath, out);
      continue;
    }
    const dotIndex = entry.lastIndexOf('.');
    if (dotIndex !== -1 && CHECKED_EXTENSIONS.has(entry.slice(dotIndex))) {
      out.push(fullPath);
    }
  }
  return out;
}

function isAllowedCrowdPath(relPosixPath) {
  return (
    relPosixPath.startsWith('features/results/') || relPosixPath.startsWith('components/data/')
  );
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

if (!existsSync(WEB_SRC)) {
  process.exit(0);
}

const violations = [];

for (const filePath of collectFiles(WEB_SRC)) {
  const relFromSrc = relative(WEB_SRC, filePath).split(sep).join('/');
  const relFromRepo = relative(process.cwd(), filePath).split(sep).join('/');
  const content = readFileSync(filePath, 'utf8');

  for (const rule of GLOBAL_RULES) {
    rule.pattern.lastIndex = 0;
    let match = rule.pattern.exec(content);
    while (match !== null) {
      violations.push({
        file: relFromRepo,
        line: lineNumberAt(content, match.index),
        token: match[0],
        rule: rule.id,
        message: rule.message,
      });
      match = rule.pattern.exec(content);
    }
  }

  if (!isAllowedCrowdPath(relFromSrc)) {
    CROWD_UTILITY_PATTERN.lastIndex = 0;
    let match = CROWD_UTILITY_PATTERN.exec(content);
    while (match !== null) {
      violations.push({
        file: relFromRepo,
        line: lineNumberAt(content, match.index),
        token: match[0],
        rule: 'restricted-crowd-color',
        message:
          'crowd-* colors are restricted to features/results/ and components/data/ (TDD §13.5).',
      });
      match = CROWD_UTILITY_PATTERN.exec(content);
    }
  }
}

if (violations.length > 0) {
  for (const v of violations) {
    process.stderr.write(`${v.file}:${v.line} [${v.rule}] "${v.token}" — ${v.message}\n`);
  }
  process.exit(1);
}
