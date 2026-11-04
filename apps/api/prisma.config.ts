import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

loadDotenv({ path: resolve(__dirname, '.env') });
loadDotenv({ path: resolve(__dirname, '..', '..', '.env') });

// Allow `prisma generate` to succeed in CI / fresh clones before DATABASE_URL is provisioned;
// runtime boot validates DATABASE_URL strictly via EnvSchema.
const datasourceUrl =
  process.env['DATABASE_URL'] ?? 'postgresql://margi:margi_dev_only@127.0.0.1:5432/margi_dev';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/scripts/seed-catalog.ts',
  },
  datasource: {
    url: datasourceUrl,
  },
});
