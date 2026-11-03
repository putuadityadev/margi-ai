// Retired (D-031): packages/shared/data/catalog.json is now maintained directly. Its places are
// curated destinations verified against OpenStreetMap plus OSM businesses imported by
// scripts/ingest-osm-msme.mjs; regenerating it from the web mock dataset would reintroduce
// invented data, so this script refuses to run.
console.error(
  'export-catalog is retired: catalog.json is maintained directly (see docs/DECISIONS.md D-031). ' +
    'Use scripts/ingest-osm-msme.mjs and scripts/verify-dtw-osm.mjs instead.',
);
process.exit(1);
