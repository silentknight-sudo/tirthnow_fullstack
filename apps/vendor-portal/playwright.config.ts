import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the built portal (`out/`, served on :3001) against a live API with mock
 * providers and seed data. CI starts both before `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PORTAL_URL ?? 'http://localhost:3001',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
