/**
 * `liteship lsp` — the sibling-server-not-installed guard branch.
 *
 * lsp-wiring.test.ts pins the happy path (the injected runner + lean/IR routing +
 * globs forwarding) by injecting an `@liteship/mcp-server` importer that resolves.
 * This file EXTENDS that by pinning the OTHER side of the dynamic-import guard,
 * which that file can't reach: a MISSING `@liteship/mcp-server` (`ERR_MODULE_NOT_FOUND`)
 * must emit the structured install hint (never a raw module-not-found stack) + exit 1.
 *
 * The import failure is induced by INJECTING a throwing importer through `lsp`'s
 * `importMcpServer` seam (NOT a module mock) — a factory that throws an
 * `ERR_MODULE_NOT_FOUND` error, the exact shape the runtime dynamic import raises
 * when the optional sibling isn't installed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureCli } from '../../../integration/cli/capture.js';

/** A throwing optional-sibling importer — the "not installed" branch, injected. */
const importMcpServerMissing = () => {
  throw Object.assign(new Error('Cannot find package @liteship/mcp-server'), { code: 'ERR_MODULE_NOT_FOUND' });
};

// No engine fold is injected: `lsp()` merely CAPTURES the real `litelaunchGauntlet` /
// `runGauntletWithRepoIR` into its runner closure but never INVOKES it — the
// injected sibling-server importer throws first, so both real folds stay inert.
import { lsp } from '../../../../packages/cli/src/commands/lsp.js';

afterEach(() => vi.restoreAllMocks());

describe('liteship lsp — @liteship/mcp-server not installed (ERR_MODULE_NOT_FOUND)', () => {
  it('emits the structured install hint on the matching major.minor line and exits 1', async () => {
    const { exit, stderr } = await captureCli(() => lsp({}, { importMcpServer: importMcpServerMissing }));
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as {
      command: string;
      code: string;
      error: string;
      hint?: string;
    };
    expect(event.command).toBe('lsp');
    expect(event.code).toBe('cli/not-found');
    expect(event.error).toContain('@liteship/mcp-server is not installed');
    // The hint pins the install to the CLI's own major.minor line (x patch).
    expect(event.hint).toMatch(/pnpm add @liteship\/mcp-server@\d+\.\d+\.x/);
  });

  it('the same guard fires on the IR path too (the runner is never reached)', async () => {
    const { exit, stderr } = await captureCli(() => lsp({ ir: true }, { importMcpServer: importMcpServerMissing }));
    expect(exit).toBe(1);
    expect(stderr).toContain('@liteship/mcp-server is not installed');
  });
});
