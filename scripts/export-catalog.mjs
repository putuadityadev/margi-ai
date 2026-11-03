// One-off export of the web mock dataset to packages/shared/data/catalog.json, the seed source
// for the API. Run from the repo root: npx tsx scripts/export-catalog.mjs
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPLORE_PLACES } from '../apps/web/src/mocks/data/places.ts';
import { MOCK_CORRIDORS } from '../apps/web/src/mocks/data/corridors.ts';
import { MOCK_REGENCIES } from '../apps/web/src/mocks/data/regencies.ts';
import { MOCK_AREAS } from '../apps/web/src/mocks/data/areas.ts';

const out = resolve(import.meta.dirname, '../packages/shared/data/catalog.json');
const catalog = {
  places: EXPLORE_PLACES,
  corridors: MOCK_CORRIDORS,
  regencies: MOCK_REGENCIES,
  areas: MOCK_AREAS,
};
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `places=${EXPLORE_PLACES.length} corridors=${MOCK_CORRIDORS.length} regencies=${MOCK_REGENCIES.length} areas=${MOCK_AREAS.length}`,
);
