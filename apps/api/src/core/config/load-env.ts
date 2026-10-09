import path from 'node:path';
import { config } from 'dotenv';

/** Load the monorepo root .env (no-op when absent, e.g. in containers). Real env vars win. */
export function loadDotEnv(): void {
  config({ path: path.resolve(__dirname, '../../../../../.env'), quiet: true });
}
