import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { probeWorkersModuleScopeDate } from '../../../../packages/cli/src/commands/doctor/probes-workers-date.js';

describe('doctor workers module-scope Date (#115)', () => {
  test('flags export-bound Date.now() when export is the first statement', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export const startedAt = Date.now();
export function handler() { return startedAt; }`,
    );

    const check = probeWorkersModuleScopeDate(dir);
    expect(check.status).toBe('warn');
    expect(check.detail).toContain('api.worker.ts');
  });

  test('does not flag Date.now inside a string literal', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export const hint = "call Date.now() at runtime";
export function handler() { return hint; }`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('ok');
  });

  test('does not flag deferred () => Date.now() at module scope', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export const clock = () => Date.now();
export function handler() { return clock(); }`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('ok');
  });

  test('flags object-literal and post-boundary export const Date.now()', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export function handler() { return 1; }
export const cfg = { t: Date.now() };`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('warn');
  });

  test('does not flag Date.now inside export default method body', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export default {
  async fetch() { return Date.now(); }
};`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('ok');
  });

  test('wrangler.toml project flags generic src/index.ts without worker path hints (#115)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'wrangler.toml'), 'name = "demo"\nmain = "src/index.ts"\n');
    writeFileSync(
      join(dir, 'src', 'index.ts'),
      `export const bootedAt = Date.now();
export default { fetch() { return new Response(String(bootedAt)); } };`,
    );

    const check = probeWorkersModuleScopeDate(dir);
    expect(check.status).toBe('warn');
    expect(check.detail).toContain('src/index.ts');
  });
});
