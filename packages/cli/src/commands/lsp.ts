/**
 * lsp (CLI adapter) — launch the gauntlet LSP rigor server over stdio.
 *
 * `czap lsp` is the editor-spawnable language server: an editor (or its czap
 * extension) starts `czap lsp` as its language server, and the server publishes
 * gauntlet Findings as live `textDocument/publishDiagnostics` Diagnostics +
 * offers their remediations as `textDocument/codeAction` CodeActions. It is the
 * THIRD JSON-RPC skin over the one gauntlet fold — sibling to `czap check`
 * (CLI receipt) and `czap mcp` (MCP tools/call).
 *
 * THE INJECTED-RUNNER SEAM: the LSP projection lives in `@czap/mcp-server` (which
 * owns the JSON-RPC transport) and stays LEAN — it depends on neither
 * `@czap/gauntlet` nor `@czap/audit`. So this adapter builds the gauntlet runner
 * HERE (in the CLI host, which already deps both) and injects it via
 * `runLspStdio`. Exactly the boundary `czap check` / the MCP `runGauntlet`
 * capability already use: the engine fold runs in the CLI host; the server
 * merely projects the findings.
 *
 * TWO PATHS (mirroring `czap check`):
 *  - LEAN (default): the IR-free six-regex gate fold via `litelaunchGauntlet` —
 *    fast, the same gates the MCP `check` exposes.
 *  - IR-ENRICHED (`--ir`): builds the repo-IR via `@czap/audit` and runs the
 *    triangulated cross-check via `runGauntletWithRepoIR`. CLI-only.
 *
 * TWO-CLOCK LAW: the waiver-expiry `now` is a CALENDAR-DATE comparison — a
 * wallClock boundary (epoch ms → `new Date(...)`), NEVER systemClock.
 *
 * @czap/mcp-server is an OPTIONAL sibling install (not a CLI dependency), so the
 * dynamic import is guarded exactly like the `mcp` subcommand: a missing module
 * emits the install hint, not a raw ERR_MODULE_NOT_FOUND stack.
 *
 * @module
 */

import { wallClock } from '@czap/core';
import { litelaunchGauntlet } from '@czap/gauntlet';
import { detectEarlyReturnBeforeExpectAST, detectSkipsAST } from '@czap/audit';
import { runGauntletWithRepoIR } from '../lib/repo-ir-gauntlet.js';
import { emitError } from '../receipts.js';
import { readCliVersion } from './version.js';

/** A finding list + blocking verdict — the shape the injected LSP runner returns. */
type RunnerResult = {
  readonly findings: ReturnType<typeof litelaunchGauntlet>['findings'];
  readonly blocked: boolean;
};

/** Options for {@link lsp}. `ir` selects the CLI-only IR-enriched fold. */
export interface LspOptions {
  readonly cwd?: string;
  /** `--ir`: run the IR-enriched triangulated cross-check instead of the lean fold. */
  readonly ir?: boolean;
}

/**
 * Launch `czap lsp`. Builds the injected gauntlet runner (lean or IR-enriched),
 * then hands stdio to the `@czap/mcp-server` LSP driver. Returns when the editor
 * closes the connection (`exit` / stream end). Exit code 0 on a clean shutdown;
 * 1 when the sibling server is not installed.
 */
export async function lsp(opts: LspOptions = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const useIr = opts.ir === true;

  // The injected runner — built in the CLI host so the engine + @czap/audit stay
  // OUT of @czap/mcp-server. Each call re-runs the fold over a fresh wall-clock
  // `now` (waiver expiry is a calendar comparison), so a long-lived editor session
  // re-checks against the current date on every `czap/check` request.
  const runGauntlet = async (globs?: readonly string[]): Promise<RunnerResult> => {
    const now = new Date(wallClock.now());
    if (useIr) {
      const result = await runGauntletWithRepoIR(cwd, now, globs, { noCache: false, withSymbolReferences: false });
      return { findings: result.findings, blocked: result.blocked };
    }
    // Inject the host-built SOUND AST detectors (the CLI deps `@czap/audit`) so the LEAN LSP
    // path matches the no-skip/no-early-return rigor of `czap check`.
    const result = litelaunchGauntlet(cwd, now, globs, undefined, detectSkipsAST, detectEarlyReturnBeforeExpectAST);
    return { findings: result.findings, blocked: result.blocked };
  };

  let mcpServer: { runLspStdio: (runner: typeof runGauntlet) => Promise<void> };
  try {
    mcpServer = await import('@czap/mcp-server');
  } catch (err) {
    const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code !== 'ERR_MODULE_NOT_FOUND') throw err;
    const [major, minor] = readCliVersion().split('.');
    emitError(
      'lsp',
      '@czap/mcp-server is not installed',
      `Install it next to @czap/cli on the same version line: pnpm add @czap/mcp-server@${major}.${minor}.x`,
    );
    return 1;
  }

  await mcpServer.runLspStdio(runGauntlet);
  return 0;
}
