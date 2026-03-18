// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  outputDir: './results',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'node server/app.js',
    cwd: '..',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 15000,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});
