import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES_DIR = join(process.cwd(), 'apps', 'web', 'src', 'locales');
const EN_DIR = join(LOCALES_DIR, 'en');
const ID_DIR = join(LOCALES_DIR, 'id');

if (!existsSync(EN_DIR) || !existsSync(ID_DIR)) {
  console.error('Error: Locales directory en or id does not exist');
  process.exit(1);
}

function getDeepKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getDeepKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

const enFiles = readdirSync(EN_DIR).filter((f) => f.endsWith('.json'));
const idFiles = readdirSync(ID_DIR).filter((f) => f.endsWith('.json'));

let hasError = false;

// Check file matching
const allNamespaces = Array.from(new Set([...enFiles, ...idFiles]));

for (const nsFile of allNamespaces) {
  const enPath = join(EN_DIR, nsFile);
  const idPath = join(ID_DIR, nsFile);

  if (!existsSync(enPath)) {
    console.error(`❌ Missing namespace in EN: ${nsFile}`);
    hasError = true;
    continue;
  }
  if (!existsSync(idPath)) {
    console.error(`❌ Missing namespace in ID: ${nsFile}`);
    hasError = true;
    continue;
  }

  const enJson = JSON.parse(readFileSync(enPath, 'utf8'));
  const idJson = JSON.parse(readFileSync(idPath, 'utf8'));

  const enKeys = new Set(getDeepKeys(enJson));
  const idKeys = new Set(getDeepKeys(idJson));

  const missingInId = Array.from(enKeys).filter((k) => !idKeys.has(k));
  const missingInEn = Array.from(idKeys).filter((k) => !enKeys.has(k));

  if (missingInId.length > 0) {
    console.error(`❌ Namespace '${nsFile}': missing in ID [${missingInId.join(', ')}]`);
    hasError = true;
  }
  if (missingInEn.length > 0) {
    console.error(`❌ Namespace '${nsFile}': missing in EN [${missingInEn.join(', ')}]`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\n❌ i18n key mismatch found. Both EN and ID must have identical keys.');
  process.exit(1);
} else {
  console.log(
    `✅ i18n check passed: all ${allNamespaces.length} namespaces match between EN and ID.`,
  );
}
