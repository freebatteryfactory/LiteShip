/**
 * Unit tests for the P10 standard verbs `info` and `dev`.
 *
 * `info` is a pure projection over the roster / catalog / doctor probes — fully
 * exercised here (JSON receipt + the pretty stderr digest). `dev` spawns an
 * example app's interactive dev server on its happy path (not unit-testable), so
 * these cover the testable surface: example-name resolution (default / --tutorial
 * / --example) and the missing-app guard that fails 1 with a structured error
 * before any spawn.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { info } from '../../../packages/cli/src/commands/info.js';
import { dev } from '../../../packages/cli/src/commands/dev.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');

interface CaptureResult {
  exit: number;
  stdout: string;
  stderr: string;
}

async function capture(fn: () => Promise<number>): Promise<CaptureResult> {
  let stdout = '';
  let stderr = '';
  const origO = process.stdout.write.bind(process.stdout);
  const origE = process.stderr.write.bind(process.stderr);
  (process.stdout as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stdout += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  (process.stderr as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  try {
    const exit = await fn();
    return { exit, stdout, stderr };
  } finally {
    (process.stdout as unknown as { write: typeof origO }).write = origO;
    (process.stderr as unknown as { write: typeof origE }).write = origE;
  }
}

describe('liteship info', () => {
  it('emits a projected InfoReceipt (roster + publishable + commands + doctor)', async () => {
    const r = await capture(() => info({ json: true, cwd: REPO_ROOT }));
    expect(r.exit).toBe(0);
    const receipt = JSON.parse(r.stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.command).toBe('info');
    // Facts are projected from real single sources — never zero.
    expect(receipt.roster.count).toBeGreaterThan(0);
    expect(receipt.roster.packages).toContain('@liteship/core');
    expect(receipt.publishable.count).toBeGreaterThan(0);
    expect(receipt.commands.total).toBeGreaterThan(0);
    expect(receipt.env.node).toBe(process.versions.node);
    expect(['ready', 'caution', 'blocked']).toContain(receipt.doctor.verdict);
    // --json keeps stderr machine-clean (no pretty digest).
    expect(r.stderr).toBe('');
  });

  it('prints a human digest to stderr when pretty is on (stdout still owns the receipt)', async () => {
    const r = await capture(() => info({ pretty: true, cwd: REPO_ROOT }));
    expect(r.exit).toBe(0);
    expect(r.stderr).toContain('liteship info');
    expect(r.stderr).toContain('roster:');
    // The receipt is still emitted to stdout as one JSON line.
    const receipt = JSON.parse(r.stdout.trim().split('\n').pop()!);
    expect(receipt.command).toBe('info');
  });
});

describe('liteship dev — example resolution + missing-app guard', () => {
  it('fails 1 with a structured error when the default example has no app', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'liteship-dev-'));
    try {
      const r = await capture(() => dev({ cwd: empty }));
      expect(r.exit).toBe(1);
      const err = JSON.parse(r.stderr.trim().split('\n').pop()!);
      expect(err.status).toBe('failed');
      expect(err.command).toBe('dev');
      // Default host is examples/showcase.
      expect(err.error).toContain('examples/showcase');
      expect(err.hint).toBeDefined();
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('resolves --tutorial to examples/tutorial', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'liteship-dev-'));
    try {
      const r = await capture(() => dev({ tutorial: true, cwd: empty }));
      expect(r.exit).toBe(1);
      const err = JSON.parse(r.stderr.trim().split('\n').pop()!);
      expect(err.error).toContain('examples/tutorial');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('resolves an explicit --example <name>', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'liteship-dev-'));
    try {
      const r = await capture(() => dev({ example: 'no-such-example', cwd: empty }));
      expect(r.exit).toBe(1);
      const err = JSON.parse(r.stderr.trim().split('\n').pop()!);
      expect(err.error).toContain('examples/no-such-example');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
