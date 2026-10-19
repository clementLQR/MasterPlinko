import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLINKO_TEST_PORT ?? 5173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PLINKO_TEST_PORT doit être un port entre 1024 et 65535.');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.pw.ts',
  timeout: 45000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    launchOptions: {
      channel: 'chrome',
      args: process.env.PLINKO_GPU === '1' ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
