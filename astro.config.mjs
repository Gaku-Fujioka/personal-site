// @ts-check
import { defineConfig } from 'astro/config';
import journalIntegration from './scripts/journal-integration.mjs';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync(new URL('.env', import.meta.url))) loadEnvFile(new URL('.env', import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  integrations: [journalIntegration()],
});
