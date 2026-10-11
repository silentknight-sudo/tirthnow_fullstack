/**
 * Prisma migration helper (ADR-0008).
 *
 *   pnpm db:migrate:new <name>   create a migration, strip statements that would drop
 *                                raw-SQL `rx_*` objects, then apply it
 *   pnpm db:migrate:new --check  CI: fail if schema.prisma has changes with no migration
 *
 * Prisma cannot model some indexes (HNSW, expression, partial). We create those in raw SQL
 * with an `rx_` prefix; Prisma's differ then wants to drop them in every new migration.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const apiRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(apiRoot, 'prisma', 'migrations');
const RX_PATTERN = /"rx_[a-z0-9_]+"/i;

function prisma(args: string[]): string {
  return execFileSync('pnpm', ['exec', 'prisma', ...args], {
    cwd: apiRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

/** Split generated SQL into `-- Comment\nSTATEMENT;` blocks and drop the ones touching rx_ objects. */
export function stripRawObjectDrops(sql: string): { kept: string; removed: string[] } {
  const blocks = sql.split(/\n(?=-- [A-Z])/);
  const removed: string[] = [];
  const kept = blocks.filter((block) => {
    if (RX_PATTERN.test(block) && /\bDROP\s+INDEX\b/i.test(block)) {
      removed.push(block.trim());
      return false;
    }
    return true;
  });
  return { kept: kept.join('\n').trim(), removed };
}

function shadowUrl(): string {
  if (process.env.SHADOW_DATABASE_URL) return process.env.SHADOW_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL ?? '');
  url.pathname = `${url.pathname}_shadow`;
  return url.toString();
}

/** SQL that brings the migration history up to schema.prisma (rx_ drops removed). */
function pendingSql(): { kept: string; removed: string[]; hasStatements: boolean } {
  const sql = prisma([
    'migrate',
    'diff',
    '--from-migrations',
    migrationsDir,
    '--to-schema-datamodel',
    path.join(apiRoot, 'prisma', 'schema.prisma'),
    '--shadow-database-url',
    shadowUrl(),
    '--script',
  ]);
  const { kept, removed } = stripRawObjectDrops(sql);
  const hasStatements = kept.split('\n').some((l) => l.trim() !== '' && !l.startsWith('--'));
  return { kept, removed, hasStatements };
}

function check(): void {
  const { kept, hasStatements } = pendingSql();
  if (hasStatements) {
    process.stderr.write(`schema.prisma has changes without a migration:\n${kept}\n`);
    process.exit(1);
  }
  process.stdout.write('Migrations are in sync with schema.prisma\n');
}

/** Prisma's folder naming: UTC YYYYMMDDHHMMSS_name. */
function folderName(name: string, now = new Date()): string {
  return `${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}_${name}`;
}

// Uses `migrate diff` rather than `migrate dev --create-only`: no interactive prompts
// (warnings about new unique constraints block non-interactive runs) and no rx_ drop offers.
function create(name: string): void {
  const { kept, removed, hasStatements } = pendingSql();
  for (const r of removed) process.stdout.write(`Stripped raw-object statement:\n${r}\n`);
  if (!hasStatements) {
    process.stdout.write('No schema changes; nothing created.\n');
    return;
  }
  const dir = folderName(name);
  fs.mkdirSync(path.join(migrationsDir, dir));
  fs.writeFileSync(path.join(migrationsDir, dir, 'migration.sql'), `${kept}\n`);
  prisma(['migrate', 'deploy']);
  prisma(['generate']);
  process.stdout.write(`Created and applied ${dir}; Prisma client regenerated\n`);
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--check') check();
  else if (arg && /^[a-z0-9_]+$/.test(arg)) create(arg);
  else {
    process.stderr.write('Usage: db:migrate:new <snake_case_name> | --check\n');
    process.exit(2);
  }
}
