/**
 * Dispatch-level argv validation — closed-set flag values and required
 * positionals are rejected AT dispatch with a usage/expected line, instead
 * of silently defaulting (doctor --target typo ran the wrong profile;
 * describe --format typo fell through to JSON) or forwarding '' downstream
 * (where it surfaced as blank-subject errors like "scene not found: ").
 */
import { describe, it, expect } from 'vitest';
import { run } from '../../../../packages/cli/src/dispatch.js';

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
  (process.stdout as unknown as { write: unknown }).write = ((c: string | Uint8Array) => {
    stdout += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  });
  (process.stderr as unknown as { write: unknown }).write = ((c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  });
  try {
    const exit = await fn();
    return { exit, stdout, stderr };
  } finally {
    (process.stdout as unknown as { write: typeof origO }).write = origO;
    (process.stderr as unknown as { write: typeof origE }).write = origE;
  }
}

const lastStderrReceipt = (stderr: string): { command: string; error: string } => {
  const lines = stderr.trim().split('\n').filter((l) => l.startsWith('{'));
  expect(lines.length).toBeGreaterThan(0);
  return JSON.parse(lines[lines.length - 1]!) as { command: string; error: string };
};

describe('dispatch — closed-set flag validation', () => {
  it('doctor --target with a typo fails instead of silently running the default profile', async () => {
    const r = await capture(() => run(['doctor', '--target', 'cloudfare']));
    expect(r.exit).toBe(1);
    const err = lastStderrReceipt(r.stderr);
    expect(err.command).toBe('doctor');
    expect(err.error).toBe('expected target: cloudflare (got: cloudfare)');
  });

  it('doctor --target=typo (equals form) also fails', async () => {
    const r = await capture(() => run(['doctor', '--target=cloudfare']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr).error).toMatch(/expected target: cloudflare/);
  });

  it('doctor --target with no value names the gap', async () => {
    const r = await capture(() => run(['doctor', '--target']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr).error).toBe('expected target: cloudflare (got: <missing>)');
  });

  it('describe --format with an unknown value fails instead of falling through to JSON', async () => {
    const r = await capture(() => run(['describe', '--format=yaml']));
    expect(r.exit).toBe(1);
    const err = lastStderrReceipt(r.stderr);
    expect(err.command).toBe('describe');
    expect(err.error).toBe('expected format: json | mcp (got: yaml)');
  });

  it('asset analyze rejects a projection outside the closed set', async () => {
    const r = await capture(() => run(['asset', 'analyze', 'kick-loop', '--projection=tempo']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr).error).toBe('expected projection: beat | onset | waveform (got: tempo)');
  });

  it('asset analyze without --projection enumerates the closed set and shows an example', async () => {
    const r = await capture(() => run(['asset', 'analyze', 'kick-loop']));
    expect(r.exit).toBe(1);
    const err = lastStderrReceipt(r.stderr);
    expect(err.error).toMatch(/missing --projection/);
    expect(err.error).toMatch(/beat \| onset \| waveform/);
    expect(err.error).toMatch(/Example: czap asset analyze/);
  });
});

describe('dispatch — missing positionals emit a usage line (no blank-path forwarding)', () => {
  it.each(['compile', 'dev', 'verify', 'render'] as const)('scene %s without a path', async (sub) => {
    const r = await capture(() => run(['scene', sub]));
    expect(r.exit).toBe(1);
    const err = lastStderrReceipt(r.stderr);
    expect(err.command).toBe(`scene.${sub}`);
    expect(err.error).toMatch(new RegExp(`usage: czap scene ${sub} <path-to-scene\\.ts>`));
  });

  it('scene render with -o but no value emits usage instead of swallowing the next flag', async () => {
    const r = await capture(() => run(['scene', 'render', 'intro.ts', '-o', '--force']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr).error).toBe('usage: czap scene render <path-to-scene.ts> -o <output.mp4>');
  });

  it('asset analyze without an asset id', async () => {
    const r = await capture(() => run(['asset', 'analyze']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr).error).toBe('usage: czap asset analyze <asset-id> --projection=<beat|onset|waveform>');
  });

  it('asset verify without an asset id', async () => {
    const r = await capture(() => run(['asset', 'verify']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr).error).toBe('usage: czap asset verify <asset-id>');
  });

  it.each(['inspect', 'verify'] as const)('capsule %s without a name', async (sub) => {
    const r = await capture(() => run(['capsule', sub]));
    expect(r.exit).toBe(1);
    const err = lastStderrReceipt(r.stderr);
    expect(err.command).toBe(`capsule.${sub}`);
    expect(err.error).toBe(`usage: czap capsule ${sub} <capsule-name>`);
  });
});
