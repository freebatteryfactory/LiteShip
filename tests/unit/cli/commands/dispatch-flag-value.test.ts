/**
 * F-PROTO-4 — value-taking flags never swallow a following flag.
 *
 * A space-form `--flag <value>` must refuse to consume a following token that
 * begins with `-` (that token is the NEXT flag). Before the shared `takeFlagValue`
 * parser, `liteship doctor --deployed --fix` read deployed='--fix' and probed the
 * literal string "--fix" as a URL; `--target --fix` reported "got: --fix".
 *
 * The `doctor` command is passed through dispatch's injectable `deps` seam (the
 * defaulted second arg on `run`) so these assert PURELY the argv→options parsing
 * (no network probe runs): the refusal cases never reach it, and the accept cases
 * forward exactly the parsed value.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const doctorMock = vi.fn(async () => 0);

import { run as runDispatch } from '../../../../packages/cli/src/dispatch.js';

/** Dispatch with the `doctor` command scripted so no real probe run happens. */
const run = (argv: readonly string[]): Promise<number> => runDispatch(argv, { doctor: doctorMock });

interface CaptureResult {
  exit: number;
  stderr: string;
}

async function capture(fn: () => Promise<number>): Promise<CaptureResult> {
  let stderr = '';
  const origE = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  try {
    const exit = await fn();
    return { exit, stderr };
  } finally {
    (process.stderr as unknown as { write: typeof origE }).write = origE;
  }
}

const lastStderrReceipt = (stderr: string): { command: string; error: string } => {
  const lines = stderr
    .trim()
    .split('\n')
    .filter((l) => l.startsWith('{'));
  expect(lines.length).toBeGreaterThan(0);
  return JSON.parse(lines[lines.length - 1]!) as { command: string; error: string };
};

describe('dispatch — a value-taking flag never swallows the next flag (F-PROTO-4)', () => {
  beforeEach(() => doctorMock.mockClear());

  it('doctor --deployed --fix refuses with usage (does NOT probe the literal "--fix")', async () => {
    const r = await capture(() => run(['doctor', '--deployed', '--fix']));
    expect(r.exit).toBe(1);
    expect(doctorMock).not.toHaveBeenCalled();
    expect(lastStderrReceipt(r.stderr).error).toBe('usage: liteship doctor --deployed <url>');
  });

  it('doctor --deployed with no value refuses cleanly', async () => {
    const r = await capture(() => run(['doctor', '--deployed']));
    expect(r.exit).toBe(1);
    expect(doctorMock).not.toHaveBeenCalled();
    expect(lastStderrReceipt(r.stderr).error).toBe('usage: liteship doctor --deployed <url>');
  });

  it('doctor --deployed=https://x forwards the URL (equals form still works)', async () => {
    const exit = await run(['doctor', '--deployed=https://example.test/']);
    expect(exit).toBe(0);
    expect(doctorMock).toHaveBeenCalledTimes(1);
    expect(doctorMock.mock.calls[0]![0]).toMatchObject({ deployed: 'https://example.test/' });
  });

  it('doctor --deployed https://x forwards the URL (space form still works)', async () => {
    const exit = await run(['doctor', '--deployed', 'https://example.test/']);
    expect(exit).toBe(0);
    expect(doctorMock.mock.calls[0]![0]).toMatchObject({ deployed: 'https://example.test/' });
  });

  it('doctor --deployed https://x --fix applies --fix when a real URL precedes it', async () => {
    await run(['doctor', '--deployed', 'https://example.test/', '--fix']);
    expect(doctorMock.mock.calls[0]![0]).toMatchObject({ deployed: 'https://example.test/', fix: true });
  });

  it('doctor --target --fix names the gap instead of consuming --fix', async () => {
    const r = await capture(() => run(['doctor', '--target', '--fix']));
    expect(r.exit).toBe(1);
    expect(doctorMock).not.toHaveBeenCalled();
    expect(lastStderrReceipt(r.stderr).error).toBe(
      'expected target: cloudflare | astro | consumer-app (got: <missing>)',
    );
  });

  it('doctor --target astro --fix keeps working (real value + trailing flag)', async () => {
    const exit = await run(['doctor', '--target', 'astro', '--fix']);
    expect(exit).toBe(0);
    expect(doctorMock.mock.calls[0]![0]).toMatchObject({ target: 'astro', fix: true });
  });

  it.each([
    { argv: ['dev', '--example'], command: 'dev', usage: 'usage: liteship dev --example <name>' },
    { argv: ['audit', '--profile'], command: 'audit', usage: 'usage: liteship audit --profile <path>' },
    { argv: ['context', '--task'], command: 'context', usage: 'usage: liteship context --task <task-id>' },
    { argv: ['mcp', '--http'], command: 'mcp', usage: 'usage: liteship mcp --http <address>' },
    {
      argv: ['capsule', 'list', '--kind'],
      command: 'capsule.list',
      usage: 'usage: liteship capsule list --kind <kind>',
    },
  ])('$command refuses a present value flag with no value', async ({ argv, command, usage }) => {
    const r = await capture(() => runDispatch(argv));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr)).toEqual(expect.objectContaining({ command, error: usage }));
  });

  it('describe --format with no value reports the missing closed-set value', async () => {
    const r = await capture(() => runDispatch(['describe', '--format']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr)).toEqual(
      expect.objectContaining({ command: 'describe', error: 'expected format: json | mcp (got: <missing>)' }),
    );
  });

  it('asset analyze --projection accepts the space form through the shared parser', async () => {
    const r = await capture(() => runDispatch(['asset', 'analyze', 'missing-asset', '--projection', 'beat']));
    expect(r.exit).toBe(1);
    expect(lastStderrReceipt(r.stderr).error).not.toMatch(/missing --projection/);
  });
});
