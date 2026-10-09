import './env';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Apply migrations to the test database once per e2e run. */
export default function globalSetup(): void {
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
