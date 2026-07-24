import { existsSync } from 'fs';
import { defineConfig, env } from 'prisma/config';

// Load .env.local for local dev tools (Studio, migrate dev)
// Falls back to .env which Docker uses
if (existsSync('.env.local')) {
  const { config } = await import('dotenv');
  config({ path: '.env.local', override: true });
} else {
  const { config } = await import('dotenv');
  config({ path: '.env' });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
