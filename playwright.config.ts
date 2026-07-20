import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    navigationTimeout: 45_000,
    actionTimeout: 20_000,
  },
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
