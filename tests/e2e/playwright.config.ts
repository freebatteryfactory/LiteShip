import { defineConfig, type ReporterDescription } from '@playwright/test';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');
const browserName = (process.env['LITESHIP_PLAYWRIGHT_BROWSER'] ?? 'chromium') as 'chromium' | 'firefox' | 'webkit';

/** Project evidence reporters, owned beside the Playwright authority itself. */
export function reportersFor(junitOutputFile: string | undefined): ReporterDescription[] {
  const outputFile = junitOutputFile?.trim();
  return outputFile === undefined || outputFile.length === 0 ? [['line']] : [['line'], ['junit', { outputFile }]];
}

/** Reuse is a manual-debugging capability, never the default proof path. */
export function shouldReuseE2EServer(value: string | undefined): boolean {
  return value?.trim() === '1';
}

export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.ts',
  timeout: 60_000,
  retries: 0,
  reporter: reportersFor(process.env['PLAYWRIGHT_JUNIT_OUTPUT_FILE']),
  use: {
    browserName,
    headless: true,
    baseURL: 'http://localhost:3456',
  },
  webServer: {
    command: `tsx ${resolve(import.meta.dirname, 'server.ts').replace(/\\/g, '/')}`,
    cwd: ROOT,
    port: 3456,
    reuseExistingServer: shouldReuseE2EServer(process.env['LITESHIP_E2E_REUSE_SERVER']),
    timeout: 30_000,
  },
});
