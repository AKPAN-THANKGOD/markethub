const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  workers: 1,                       // the tests form one shopping journey, so they run in order
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.E2E_BASE || 'http://localhost:5500', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: process.env.API_ONLY ? undefined : {   // API_ONLY=1 skips the web server (used when only the backend is tested)
    command: 'npx http-server . -p 5500 -c-1 --silent', url: 'http://localhost:5500', reuseExistingServer: true, timeout: 120_000
  },
  // By default Playwright uses its own downloaded Chromium. To use a browser you already have instead (no download):
//   Edge or Chrome:  set PW_CHANNEL=msedge   (or chrome)
//   Brave / any Chromium-based browser:  set "PW_BROWSER_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
  projects: [{ name: 'chromium', use: {
    ...devices['Desktop Chrome'],
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: { executablePath: process.env.PW_BROWSER_PATH || undefined }
  } }]
});