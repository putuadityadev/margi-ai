/**
 * Generates `packages/shared/data/embeddings.json`: one embedding per catalogue place, built from
 * its name, category, mood tags and bilingual description. Run from apps/api:
 *   npx tsx scripts/embed-catalog.ts [--force]
 * Idempotent: venues already embedded with the same model and dimensions are skipped.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BATCH_SIZE = 32;
const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DECIMALS = 5;

const catalogPath = resolve(import.meta.dirname, '../../../packages/shared/data/catalog.json');
const outputPath = resolve(import.meta.dirname, '../../../packages/shared/data/embeddings.json');
const envPath = resolve(import.meta.dirname, '../../../.env');

interface Place {
  venue: {
    id: string;
    nameEn: string;
    category: string;
    descriptionEn: string;
    descriptionId: string;
  };
  vibeTags: string[];
}

interface EmbeddingFile {
  model: string;
  dimensions: number;
  createdAt: string;
  vectors: Record<string, number[]>;
}

function readEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(envPath)) return values;
  for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match?.[1]) values[match[1]] = (match[2] ?? '').replace(/^["']|["']$/g, '');
  }
  return values;
}

const env = { ...readEnv(), ...process.env };
const apiKey = env.OPENROUTER_API_KEY;
const model = env.EMBEDDING_MODEL ?? 'google/gemini-embedding-001';
const dimensions = Number(env.EMBEDDING_DIMENSIONS ?? 768);

function categoryInWords(category: string): string {
  return category.toLowerCase().replace(/_/g, ' ');
}

function canonicalText(place: Place): string {
  const { venue, vibeTags } = place;
  return `${venue.nameEn}. ${categoryInWords(venue.category)}. Mood: ${vibeTags.join(', ')}. ${venue.descriptionEn} ${venue.descriptionId}`;
}

async function call(path: string, init: RequestInit): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${OPENROUTER_BASE}${path}`, {
        ...init,
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error: unknown) {
      lastError = error;
    }
  }
  throw new Error(`OpenRouter ${path} failed: ${String(lastError)}`);
}

async function usage(): Promise<number> {
  const body = (await call('/key', { method: 'GET' })) as { data: { usage: number } };
  return body.data.usage;
}

async function embed(inputs: string[]): Promise<number[][]> {
  const body = (await call('/embeddings', {
    method: 'POST',
    body: JSON.stringify({ model, input: inputs, dimensions }),
  })) as { data: { index: number; embedding: number[] }[] };
  const ordered = [...body.data].sort((a, b) => a.index - b.index);
  if (ordered.length !== inputs.length) throw new Error('Embedding count mismatch');
  return ordered.map((row) => {
    if (row.embedding.length !== dimensions) throw new Error('Unexpected embedding dimensions');
    return row.embedding.map((v) => Number(v.toFixed(DECIMALS)));
  });
}

async function main(): Promise<void> {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
  const force = process.argv.includes('--force');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8')) as { places: Place[] };

  const previous: EmbeddingFile | undefined = existsSync(outputPath)
    ? (JSON.parse(readFileSync(outputPath, 'utf-8')) as EmbeddingFile)
    : undefined;
  const reusable = !force && previous?.model === model && previous.dimensions === dimensions;
  const vectors: Record<string, number[]> = reusable && previous ? { ...previous.vectors } : {};

  const pending = catalog.places.filter((place) => !vectors[place.venue.id]);
  console.log(`${catalog.places.length} places, ${pending.length} to embed with ${model}`);
  if (pending.length === 0) return;

  const before = await usage();
  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    const result = await embed(batch.map(canonicalText));
    batch.forEach((place, i) => {
      const vector = result[i];
      if (vector) vectors[place.venue.id] = vector;
    });
    console.log(`embedded ${Math.min(start + BATCH_SIZE, pending.length)}/${pending.length}`);
  }
  const after = await usage();

  const file: EmbeddingFile = { model, dimensions, createdAt: new Date().toISOString(), vectors };
  writeFileSync(outputPath, `${JSON.stringify(file)}\n`);
  console.log(`wrote ${Object.keys(vectors).length} vectors; usage $${before} -> $${after}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
