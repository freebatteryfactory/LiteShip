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
});
