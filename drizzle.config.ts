import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/api/src/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
