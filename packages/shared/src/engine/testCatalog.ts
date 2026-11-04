import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setCatalog, setEmbeddings, type CatalogData, type CatalogPlace } from './catalog';

/** Test-only: loads `packages/shared/data/catalog.json` and registers it with the engine. */
function loadCatalog(): CatalogData {
  const raw = readFileSync(resolve(import.meta.dirname, '../../data/catalog.json'), 'utf8');
  // The JSON is produced by scripts/export-catalog.mjs from already schema-parsed data.
  return JSON.parse(raw) as CatalogData;
}

export const TEST_CATALOG: CatalogData = loadCatalog();
setCatalog(TEST_CATALOG);

// Real description embeddings (scripts/embed-catalog.ts), so ranking tests exercise cosine similarity.
setEmbeddings(
  (
    JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../data/embeddings.json'), 'utf8'),
    ) as { vectors: Record<string, number[]> }
  ).vectors,
);

/** Test fixture place by slug; throws when the dataset does not have it. */
export function placeBySlug(slug: string): CatalogPlace {
  const place = TEST_CATALOG.places.find((candidate) => candidate.venue.slug === slug);
  if (!place) throw new Error(`Missing fixture place ${slug}`);
  return place;
}
