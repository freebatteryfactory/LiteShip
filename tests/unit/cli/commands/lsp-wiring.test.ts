/**
 * `liteship lsp` CLI launch wiring (Slice B/B3 — the THIRD JSON-RPC skin).
 *
 * Proves the editor-spawnable language server is wired to the production `liteship`
 * dispatch: `liteship lsp` dynamically imports `@liteship/mcp-server` and hands it an
 * INJECTED gauntlet runner built in the CLI host (so the engine + `@liteship/audit`
 * stay out of the lean server). The default path builds the runner over the LEAN
 * `litelaunchGauntlet`; `--ir` builds it over `runGauntletWithRepoIR`.
 *
 * The engine folds are INJECTED as scripted spies (the LSP deps seam) and only the
 * sibling server is mocked, so the assertions pin the SEAM (which runner the LSP
 * receives, which fold it runs) without a real `ts.Program` build or a stdio loop.
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { finding, type GauntletResult } from '@liteship/gauntlet';

const runLspStdioMock = vi.fn();

// The two engine folds are scripted spies injected through the LSP deps seam, and
// the optional @liteship/mcp-server sibling is INJECTED through the `importMcpServer`
// seam — NO @liteship/gauntlet or @liteship/mcp-server module mock — so nothing
// sweeps the real repo, builds a ts.Program, or dynamic-imports the real server.
const litelaunchGauntletMock = vi.fn();
const runGauntletWithRepoIRMock = vi.fn();

import { run as runDispatch } from '../../../../packages/cli/src/dispatch.js';
import { lsp } from '../../../../packages/cli/src/commands/lsp.js';

/** The injected optional-sibling importer resolving to the LSP stdio driver spy. */
const importMcpServer = () => Promise.resolve({ runLspStdio: runLspStdioMock, start: async (): Promise<void> => {} });

/** Dispatch `liteship <argv>` with the IR fold + sibling importer scripted — case 1 pins dispatch→server routing. */
const run = (argv: readonly string[]): Promise<number> =>
  runDispatch(argv, { runGauntletWithRepoIR: runGauntletWithRepoIRMock, importMcpServer });

/** The scripted-fold + importer deps the injected LSP runner is built over (lean + IR). */
const lspDeps = {
  runGauntletWithRepoIR: runGauntletWithRepoIRMock,
  litelaunchGauntlet: litelaunchGauntletMock,
  importMcpServer,
};

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

describe('liteship lsp — launch wiring', () => {
  it('dispatches `lsp` to the mcp-server LSP driver with an injected runner (exit 0)', async () => {
    const code = await run(['lsp']);
    expect(code).toBe(0);
    expect(runLspStdioMock).toHaveBeenCalledTimes(1);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    expect(typeof runner).toBe('function');
  });

  it('the default (no --ir) injected runner runs the LEAN litelaunchGauntlet, never the IR builder', async () => {
    await lsp({}, lspDeps);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    const result = await runner();
    expect(litelaunchGauntletMock).toHaveBeenCalledTimes(1);
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
    expect(result.findings).toEqual(leanResult.findings);
    expect(result.blocked).toBe(false);
  });

  it('the --ir injected runner runs runGauntletWithRepoIR (the triangulated cross-check)', async () => {
    await lsp({ ir: true }, lspDeps);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    const result = await runner();
    expect(runGauntletWithRepoIRMock).toHaveBeenCalledTimes(1);
    expect(litelaunchGauntletMock).not.toHaveBeenCalled();
    expect(result.findings).toEqual(irResult.findings);
    expect(result.blocked).toBe(true);
  });

  it('the injected runner forwards an optional globs scope to the engine fold', async () => {
    await lsp({}, lspDeps);
    const runner = runLspStdioMock.mock.calls[0]![0] as Runner;
    await runner(['packages/x/**']);
    // litelaunchGauntlet(cwd, now, globs) — the third arg is the forwarded scope.
    const callArgs = litelaunchGauntletMock.mock.calls[0]!;
    expect(callArgs[2]).toEqual(['packages/x/**']);
  });
});
