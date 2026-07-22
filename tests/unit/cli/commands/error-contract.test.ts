/**
 * CLI error-contract upgrades:
 *  - emitError carries a required stable `cli/*` code and an optional `hint`
 *    field (the literal next thing to type — the doctor-check convention
 *    generalized into the envelope).
 *  - `liteship mcp` without @liteship/mcp-server installed emits the structured
 *    one-JSON-line-on-stderr envelope instead of a raw ERR_MODULE_NOT_FOUND
 *    stack trace.
 */
import { describe, it, expect } from 'vitest';
import { emitError } from '../../../../packages/cli/src/receipts.js';
import { readCliVersion } from '../../../../packages/cli/src/commands/version.js';

// The optional @liteship/mcp-server sibling is INJECTED as a throwing importer
// carrying ERR_MODULE_NOT_FOUND (the exact shape the runtime dynamic import raises
// when the sibling isn't installed) — NOT a module mock — so `liteship mcp` takes
// the structured-install-hint guard instead of a raw module-not-found stack.
const importMcpServerMissing = () => {
  const err = new Error("Cannot find package '@liteship/mcp-server'");
  (err as Error & { code: string }).code = 'ERR_MODULE_NOT_FOUND';
  throw err;
};

import { run } from '../../../../packages/cli/src/dispatch.js';

async function captureStderr<T>(fn: () => Promise<T> | T): Promise<{ result: T; stderr: string }> {
  let stderr = '';
  const orig = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  try {
    const result = await fn();
    return { result, stderr };
  } finally {
    (process.stderr as unknown as { write: typeof orig }).write = orig;
  }
}

describe('emitError diagnostic envelope', () => {
  it('includes the stable code and hint when supplied', async () => {
    const { stderr } = await captureStderr(() =>
      emitError('demo', 'cli/command-failed', 'something broke', 'Type this: liteship doctor'),
    );
    const receipt = JSON.parse(stderr.trim());
    expect(receipt).toMatchObject({
      status: 'failed',
      command: 'demo',
      code: 'cli/command-failed',
      error: 'something broke',
      hint: 'Type this: liteship doctor',
    });
    expect(typeof receipt.timestamp).toBe('string');
  });

  it('omits the hint key entirely when not supplied', async () => {
    const { stderr } = await captureStderr(() => emitError('demo', 'cli/command-failed', 'something broke'));
    const receipt = JSON.parse(stderr.trim());
    expect('hint' in receipt).toBe(false);
  });
});

describe('liteship mcp without @liteship/mcp-server installed', () => {
  it('emits a structured install-teaching error instead of a raw module-not-found stack', async () => {
    const { result, stderr } = await captureStderr(() => run(['mcp'], { importMcpServer: importMcpServerMissing }));
    expect(result).toBe(1);
    const lines = stderr
      .trim()
      .split('\n')
      .filter((l) => l.startsWith('{'));
    expect(lines.length).toBeGreaterThan(0);
    const receipt = JSON.parse(lines[lines.length - 1]!);
    expect(receipt.status).toBe('failed');
    expect(receipt.command).toBe('mcp');
    expect(receipt.code).toBe('cli/not-found');
    expect(receipt.error).toBe('@liteship/mcp-server is not installed');
    // Pin the LAW, not the literal: the hint pins the sibling MCP server to the
    // CLI's OWN minor line, so it tracks every release bump (a hard-coded `0.1.x`
    // is exactly what drifted — Codex P2, #45). Assert the shape too, so a broken
    // readCliVersion can't make this vacuous.
    const [major, minor] = readCliVersion().split('.');
    expect(receipt.hint).toBe(
      `Install it next to @liteship/cli on the same version line: pnpm add @liteship/mcp-server@${major}.${minor}.x`,
    );
    expect(receipt.hint).toMatch(/pnpm add @liteship\/mcp-server@\d+\.\d+\.x$/);
  });
});
