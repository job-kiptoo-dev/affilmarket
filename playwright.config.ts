import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  // 🔥 Increase workers on CI (1 is too slow unless debugging)
  workers: process.env.CI ? 2 : undefined,

  reporter: 'html',

  use: {
    // ✅ REQUIRED for Next.js
    baseURL: 'http://localhost:3000',

    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 👉 Optional: keep only chromium in CI for speed
    // Add others later if needed
  ],

  // 🔥 THIS is the most important part
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    timeout: 60 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
