/**
 * CLI error-contract upgrades:
 *  - emitError carries an optional `hint` field (the literal next thing to
 *    type — the doctor-check convention generalized into the envelope).
 *  - `czap mcp` without @czap/mcp-server installed emits the structured
 *    one-JSON-line-on-stderr envelope instead of a raw ERR_MODULE_NOT_FOUND
 *    stack trace.
 */
import { describe, it, expect, vi } from 'vitest';
import { emitError } from '../../../../packages/cli/src/receipts.js';
import { readCliVersion } from '../../../../packages/cli/src/commands/version.js';

vi.mock('@czap/mcp-server', () => {
  const err = new Error("Cannot find package '@czap/mcp-server'");
  (err as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
  throw err;
});

import { run } from '../../../../packages/cli/src/dispatch.js';

async function captureStderr<T>(fn: () => Promise<T> | T): Promise<{ result: T; stderr: string }> {
  let stderr = '';
  const orig = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: unknown }).write = ((c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  });
  try {
    const result = await fn();
    return { result, stderr };
  } finally {
    (process.stderr as unknown as { write: typeof orig }).write = orig;
  }
}

describe('emitError hint field', () => {
  it('includes hint in the stderr JSON envelope when supplied', async () => {
    const { stderr } = await captureStderr(() => emitError('demo', 'something broke', 'Type this: czap doctor'));
    const receipt = JSON.parse(stderr.trim());
    expect(receipt).toMatchObject({
      status: 'failed',
      command: 'demo',
      error: 'something broke',
      hint: 'Type this: czap doctor',
    });
    expect(typeof receipt.timestamp).toBe('string');
  });

  it('omits the hint key entirely when not supplied', async () => {
    const { stderr } = await captureStderr(() => emitError('demo', 'something broke'));
    const receipt = JSON.parse(stderr.trim());
    expect('hint' in receipt).toBe(false);
  });
});

describe('czap mcp without @czap/mcp-server installed', () => {
  it('emits a structured install-teaching error instead of a raw module-not-found stack', async () => {
    const { result, stderr } = await captureStderr(() => run(['mcp']));
    expect(result).toBe(1);
    const lines = stderr.trim().split('\n').filter((l) => l.startsWith('{'));
    expect(lines.length).toBeGreaterThan(0);
    const receipt = JSON.parse(lines[lines.length - 1]!);
    expect(receipt.status).toBe('failed');
    expect(receipt.command).toBe('mcp');
    expect(receipt.error).toBe('@czap/mcp-server is not installed');
    // Pin the LAW, not the literal: the hint pins the sibling MCP server to the
    // CLI's OWN minor line, so it tracks every release bump (a hard-coded `0.1.x`
    // is exactly what drifted — Codex P2, #45). Assert the shape too, so a broken
    // readCliVersion can't make this vacuous.
    const [major, minor] = readCliVersion().split('.');
    expect(receipt.hint).toBe(
      `Install it next to @czap/cli on the same version line: pnpm add @czap/mcp-server@${major}.${minor}.x`,
    );
    expect(receipt.hint).toMatch(/pnpm add @czap\/mcp-server@\d+\.\d+\.x$/);
  });
});
