/**
 * `czap lsp` CLI launch wiring (Slice B/B3 — the THIRD JSON-RPC skin).
 *
 * Proves the editor-spawnable language server is wired to the production `czap`
 * dispatch: `czap lsp` dynamically imports `@czap/mcp-server` and hands it an
 * INJECTED gauntlet runner built in the CLI host (so the engine + `@czap/audit`
 * stay out of the lean server). The default path builds the runner over the LEAN
 * `litelaunchGauntlet`; `--ir` builds it over `runGauntletWithRepoIR`.
 *
 * Both the engine fold and the sibling server are mocked so the assertions pin
 * the SEAM (which runner the LSP receives, which path it runs) without a real
 * `ts.Program` build or a real stdio loop.
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { finding, type GauntletResult } from '@czap/gauntlet';

const { runLspStdioMock } = vi.hoisted(() => ({ runLspStdioMock: vi.fn() }));
vi.mock('@czap/mcp-server', () => ({ runLspStdio: runLspStdioMock }));

const { litelaunchGauntletMock } = vi.hoisted(() => ({ litelaunchGauntletMock: vi.fn() }));
vi.mock('@czap/gauntlet', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, litelaunchGauntlet: litelaunchGauntletMock };
});

const { runGauntletWithRepoIRMock } = vi.hoisted(() => ({ runGauntletWithRepoIRMock: vi.fn() }));
vi.mock('../../../../packages/cli/src/lib/repo-ir-gauntlet.js', () => ({
  runGauntletWithRepoIR: runGauntletWithRepoIRMock,
}));

import { run } from '../../../../packages/cli/src/dispatch.js';

const leanResult: GauntletResult = {
  findings: [finding({ ruleId: 'lean/r', severity: 'advisory', level: 'L1', title: 'lean', detail: 'd' })],
  outcomes: [],
  blocked: false,
};
const irResult: GauntletResult = {
  findings: [finding({ ruleId: 'ir/r', severity: 'error', level: 'L3', title: 'ir', detail: 'd' })],
  outcomes: [],
  blocked: true,
};

/** The runner the LSP receives — captured from the runLspStdio call. */
type Runner = (globs?: readonly string[]) => Promise<{ findings: readonly unknown[]; blocked: boolean }>;

beforeEach(() => {
  runLspStdioMock.mockReset().mockResolvedValue(undefined);
  litelaunchGauntletMock.mockReset().mockReturnValue(leanResult);
  runGauntletWithRepoIRMock.mockReset().mockReturnValue(irResult);
});
afterEach(() => vi.restoreAllMocks());

describe('czap lsp — launch wiring', () => {
  it('dispatches `lsp` to the mcp-server LSP driver with an injected runner (exit 0)', async () => {
    const code = await run(['lsp']);
    expect(code).toBe(0);
    expect(runLspStdioMock).toHaveBeenCalledTimes(1);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    expect(typeof runner).toBe('function');
  });

  it('the default (no --ir) injected runner runs the LEAN litelaunchGauntlet, never the IR builder', async () => {
    await run(['lsp']);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    const result = await runner();
    expect(litelaunchGauntletMock).toHaveBeenCalledTimes(1);
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
    expect(result.findings).toEqual(leanResult.findings);
    expect(result.blocked).toBe(false);
  });

  it('the --ir injected runner runs runGauntletWithRepoIR (the triangulated cross-check)', async () => {
    await run(['lsp', '--ir']);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    const result = await runner();
    expect(runGauntletWithRepoIRMock).toHaveBeenCalledTimes(1);
    expect(litelaunchGauntletMock).not.toHaveBeenCalled();
    expect(result.findings).toEqual(irResult.findings);
    expect(result.blocked).toBe(true);
  });

  it('the injected runner forwards an optional globs scope to the engine fold', async () => {
    await run(['lsp']);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    await runner(['packages/x/**']);
    // litelaunchGauntlet(cwd, now, globs) — the third arg is the forwarded scope.
    const callArgs = litelaunchGauntletMock.mock.calls[0]!;
    expect(callArgs[2]).toEqual(['packages/x/**']);
  });
});
