/**
 * Writes the API's OpenAPI document to packages/api-client/openapi.json
 * (input for the mobile model generator, apps/mobile/tool/gen_api_models.mjs).
 *   pnpm --filter @tirth-now/api openapi:export          # write
 *   node dist/openapi-export.js --check                 # CI: fail if stale (after build)
 * Builds the Nest module graph without initialising it: no DB, Redis or jobs needed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { buildOpenApiDocument, API_PREFIX } from './app.setup';
import { loadConfig, loadDotEnv } from './core/config';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

async function main(): Promise<void> {
  loadDotEnv();
  const config = loadConfig(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    logger: ['error'],
  });
  app.setGlobalPrefix(API_PREFIX, { exclude: ['healthz', 'readyz', 's/:shareToken'] });
  const json = `${JSON.stringify(sortKeys(buildOpenApiDocument(app)), null, 2)}\n`;
  const out = resolve(__dirname, '../../../packages/api-client/openapi.json');
  if (process.argv.includes('--check')) {
    if (readFileSync(out, 'utf8') !== json) {
      process.stderr.write(
        'openapi.json is stale: run pnpm --filter @tirth-now/api openapi:export\n',
      );
      process.exit(1);
    }
    process.exit(0);
  }
  writeFileSync(out, json);
  process.exit(0);
}

void main();
