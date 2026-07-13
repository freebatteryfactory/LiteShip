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

  // ---------------------------------------------------------------------------
  // F-PROTO-3 (W7): the four miss-classes the old REGEX scanner silently passed.
  // Each executes a Date read at MODULE LOAD, so each must be FLAGGED.
  // ---------------------------------------------------------------------------

  test('F-PROTO-3(a): flags module-scope Date.now() inside a template interpolation', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `const stamp = \`booted-\${Date.now()}\`;
export function handler() { return stamp; }`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('warn');
  });

  test('F-PROTO-3(b): flags an immediately-invoked arrow that reads Date.now() at load', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `const boot = (() => Date.now())();
export function handler() { return boot; }`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('warn');
  });

  test('F-PROTO-3(c): flags a non-exported const Date.now() placed AFTER a function decl', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export const NAME = 'svc';
export function handler() { return NAME; }
const startedAt = Date.now();`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('warn');
  });

  test('F-PROTO-3(d): flags a class STATIC field initializer that reads Date.now() at load', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export const NAME = 'svc';
export class Config {
  static startedAt = Date.now();
}`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('warn');
  });

  test('F-PROTO-3: does NOT flag Date.now() in a deferred instance-method body', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export class Svc {
  boot() { return Date.now(); }
}`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('ok');
  });

  test('F-PROTO-3: does NOT flag Date.now() in a deferred object getter body', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export const clock = {
  get now() { return Date.now(); },
};
export function handler() { return clock.now; }`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('ok');
  });

  test('F-PROTO-3: does NOT flag deterministic new Date(explicitTimestamp) at module scope', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'api.worker.ts'),
      `export const epoch = new Date(0);
export function handler() { return epoch; }`,
    );
    expect(probeWorkersModuleScopeDate(dir).status).toBe('ok');
  });

  test('wrangler.jsonc with comment resolves main without throwing (#115)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-workers-date-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'wrangler.jsonc'),
      `{
  // entry for the worker
  "name": "demo",
  "main": "src/custom.ts"
}`,
    );
    writeFileSync(
      join(dir, 'src', 'custom.ts'),
      `export const bootedAt = Date.now();
export default { fetch() { return new Response(String(bootedAt)); } };`,
    );

    const check = probeWorkersModuleScopeDate(dir);
    expect(check.status).toBe('warn');
    expect(check.detail).toContain('src/custom.ts');
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
