import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    reducedMotion: 'reduce',
    channel: process.env.RENUE_BROWSER_CHANNEL || (process.platform === 'darwin' ? 'chrome' : undefined),
    trace: 'retain-on-failure'
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
  webServer: {
    command: 'python3 scripts/build.py && python3 tests/browser/serve.py',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: false
  }
});
