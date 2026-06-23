/**
 * `czap lsp` — the sibling-server-not-installed guard branch.
 *
 * lsp-wiring.test.ts pins the happy path (the injected runner + lean/IR routing +
 * globs forwarding) by mocking `@czap/mcp-server` to resolve. This file EXTENDS
 * that by pinning the OTHER side of the dynamic-import guard, which that file
 * can't reach: a MISSING `@czap/mcp-server` (`ERR_MODULE_NOT_FOUND`) must emit the
 * structured install hint (never a raw module-not-found stack) + exit 1.
 *
 * The import failure is induced by a mock factory that throws an
 * `ERR_MODULE_NOT_FOUND` error — the exact shape the runtime dynamic import raises
 * when the optional sibling isn't installed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureCli } from '../../../integration/cli/capture.js';

vi.mock('@czap/mcp-server', () => {
  throw Object.assign(new Error('Cannot find package @czap/mcp-server'), { code: 'ERR_MODULE_NOT_FOUND' });
});

// The engine fold is mocked so building the runner is free (it is never invoked —
// the import throws before runLspStdio would be reached).
vi.mock('@czap/gauntlet', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, litelaunchGauntlet: vi.fn() };
});
vi.mock('../../../../packages/cli/src/lib/repo-ir-gauntlet.js', () => ({ runGauntletWithRepoIR: vi.fn() }));

import { lsp } from '../../../../packages/cli/src/commands/lsp.js';

afterEach(() => vi.restoreAllMocks());

describe('czap lsp — @czap/mcp-server not installed (ERR_MODULE_NOT_FOUND)', () => {
  it('emits the structured install hint on the matching major.minor line and exits 1', async () => {
    const { exit, stderr } = await captureCli(() => lsp());
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as {
      command: string;
      error: string;
      hint?: string;
    };
    expect(event.command).toBe('lsp');
    expect(event.error).toContain('@czap/mcp-server is not installed');
    // The hint pins the install to the CLI's own major.minor line (x patch).
    expect(event.hint).toMatch(/pnpm add @czap\/mcp-server@\d+\.\d+\.x/);
  });

  it('the same guard fires on the IR path too (the runner is never reached)', async () => {
    const { exit, stderr } = await captureCli(() => lsp({ ir: true }));
    expect(exit).toBe(1);
    expect(stderr).toContain('@czap/mcp-server is not installed');
  });
});
