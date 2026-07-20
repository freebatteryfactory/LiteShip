/**
 * lsp (CLI adapter) — launch the gauntlet LSP rigor server over stdio.
 *
 * `liteship lsp` is the editor-spawnable language server: an editor (or its liteship
 * extension) starts `liteship lsp` as its language server, and the server publishes
 * gauntlet Findings as live `textDocument/publishDiagnostics` Diagnostics +
 * offers their remediations as `textDocument/codeAction` CodeActions. It is the
 * THIRD JSON-RPC skin over the one gauntlet fold — sibling to `liteship check`
 * (CLI receipt) and `liteship mcp` (MCP tools/call).
 *
 * THE INJECTED-RUNNER SEAM: the LSP projection lives in `@liteship/mcp-server` (which
 * owns the JSON-RPC transport) and stays LEAN — it depends on neither
 * `@liteship/gauntlet` nor `@liteship/audit`. So this adapter builds the gauntlet runner
 * HERE (in the CLI host, which already deps both) and injects it via
 * `runLspStdio`. Exactly the boundary `liteship check` / the MCP `runGauntlet`
 * capability already use: the engine fold runs in the CLI host; the server
 * merely projects the findings.
 *
 * TWO PATHS (mirroring `liteship check`):
 *  - LEAN (default): the IR-free six-regex gate fold via `litelaunchGauntlet` —
 *    fast, the same gates the MCP `check` exposes.
 *  - IR-ENRICHED (`--ir`): builds the repo-IR via `@liteship/audit` and runs the
 *    triangulated cross-check via `runGauntletWithRepoIR`. CLI-only.
 *
 * TWO-CLOCK LAW: the waiver-expiry `now` is a CALENDAR-DATE comparison — a
 * wallClock boundary (epoch ms → `new Date(...)`), NEVER systemClock.
 *
 * @liteship/mcp-server is an OPTIONAL sibling install (not a CLI dependency), so the
 * dynamic import is guarded exactly like the `mcp` subcommand: a missing module
 * emits the install hint, not a raw ERR_MODULE_NOT_FOUND stack.
 *
 * @module
 */

import { wallClock } from '@liteship/core';
import { litelaunchGauntlet } from '@liteship/gauntlet';
import { detectEarlyReturnBeforeExpectAST, detectSkipsAST } from '@liteship/audit';
import { runGauntletWithRepoIR } from '../lib/repo-ir-gauntlet.js';
import { emitError } from '../receipts.js';
import { readCliVersion } from './version.js';

/** A finding list + blocking verdict — the shape the injected LSP runner returns. */
type RunnerResult = {
  readonly findings: ReturnType<typeof litelaunchGauntlet>['findings'];
  readonly blocked: boolean;
};

/**
 * The `@liteship/mcp-server` subset the CLI consumes across its two dynamic-import
 * skins: the LSP stdio driver (`liteship lsp`, here) and the MCP server `start`
 * (`liteship mcp`, in dispatch). Both fields are present so ONE injectable importer
 * ({@link ImportMcpServer}) serves both call sites — a test that only exercises one
 * skin stubs the other. Exported for the dispatch seam ONLY; the CLI barrel
 * re-exports only `run`, so this type never reaches the public type-export surface.
 */
export type McpServerModule = {
  readonly start: (opts: { readonly http?: string }) => Promise<void>;
  readonly runLspStdio: (runner: (globs?: readonly string[]) => Promise<RunnerResult>) => Promise<void>;
};

/**
 * Injectable importer for the optional `@liteship/mcp-server` sibling. Defaults to
 * the real `() => import('@liteship/mcp-server')`, so production launch is
 * byte-identical; tests inject a resolver (the "installed" branch) or a throwing
 * factory carrying `ERR_MODULE_NOT_FOUND` (the "not installed" guard) WITHOUT a
 * `vi.mock` of the internal sibling module.
 */
export type ImportMcpServer = () => Promise<McpServerModule>;

/** Options for {@link lsp}. `ir` selects the CLI-only IR-enriched fold. */
export interface LspOptions {
  readonly cwd?: string;
  /** `--ir`: run the IR-enriched triangulated cross-check instead of the lean fold. */
  readonly ir?: boolean;
}

/**
 * Injectable engine seam for {@link lsp}'s two folds. `runGauntletWithRepoIR`
 * defaults to the real IR-enriched builder so production `liteship lsp --ir` is
 * unchanged; `litelaunchGauntlet` defaults (via the null-coalesce at the call
 * site) to the real LEAN fold so the default `liteship lsp` is unchanged. Tests
 * pass scripted folds to pin WHICH fold the injected LSP runner drives (lean vs
 * IR) and which globs it forwards, without a real `ts.Program` build or repo sweep.
 */
interface LspDeps {
  readonly runGauntletWithRepoIR?: typeof runGauntletWithRepoIR;
  readonly litelaunchGauntlet?: typeof litelaunchGauntlet;
  /** The optional-sibling importer; defaults to the real dynamic import at the call site. */
  readonly importMcpServer?: ImportMcpServer;
}

/**
 * Launch `liteship lsp`. Builds the injected gauntlet runner (lean or IR-enriched),
 * then hands stdio to the `@liteship/mcp-server` LSP driver. Returns when the editor
 * closes the connection (`exit` / stream end). Exit code 0 on a clean shutdown;
 * 1 when the sibling server is not installed.
 */
export async function lsp(opts: LspOptions = {}, deps: LspDeps = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const useIr = opts.ir === true;
  const runGauntletIR = deps.runGauntletWithRepoIR ?? runGauntletWithRepoIR;

  // The injected runner — built in the CLI host so the engine + @liteship/audit stay
  // OUT of @liteship/mcp-server. Each call re-runs the fold over a fresh wall-clock
  // `now` (waiver expiry is a calendar comparison), so a long-lived editor session
  // re-checks against the current date on every `liteship/check` request.
  const runGauntlet = async (globs?: readonly string[]): Promise<RunnerResult> => {
    const now = new Date(wallClock.now());
    if (useIr) {
      const result = await runGauntletIR(cwd, now, globs, { noCache: false, withSymbolReferences: false });
      return { findings: result.findings, blocked: result.blocked };
    }
    // Inject the host-built SOUND AST detectors (the CLI deps `@liteship/audit`) so the LEAN LSP
    // path matches the no-skip/no-early-return rigor of `liteship check`.
    const runLean = deps.litelaunchGauntlet ?? litelaunchGauntlet;
    const result = runLean(cwd, now, globs, undefined, detectSkipsAST, detectEarlyReturnBeforeExpectAST);
    return { findings: result.findings, blocked: result.blocked };
  };

  const importMcpServer = deps.importMcpServer ?? (() => import('@liteship/mcp-server'));
  let mcpServer: McpServerModule;
  try {
    mcpServer = await importMcpServer();
  } catch (err) {
    const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code !== 'ERR_MODULE_NOT_FOUND') throw err;
    const [major, minor] = readCliVersion().split('.');
    emitError(
      'lsp',
      '@liteship/mcp-server is not installed',
      `Install it next to @liteship/cli on the same version line: pnpm add @liteship/mcp-server@${major}.${minor}.x`,
    );
    return 1;
  }

  await mcpServer.runLspStdio(runGauntlet);
  return 0;
}
