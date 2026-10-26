const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  workers: 1,                       // the tests form one shopping journey, so they run in order
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5500', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npx http-server . -p 5500 -c-1 --silent', url: 'http://localhost:5500', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
