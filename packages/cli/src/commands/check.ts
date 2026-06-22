/**
 * check (CLI adapter) — thin projection over `@czap/command`'s check command
 * (the PURE gauntlet engine fold). The pass/fail decision lives in
 * `@czap/command`; this adapter provisions the `runGauntlet` capability via the
 * shared host context (which runs `litelaunchGauntlet` in-process with a
 * WALL-CLOCK `now` for waiver expiry), emits the structured receipt, and prints
 * a concise findings summary to stderr. Exit 0 ok, 1 blocked.
 *
 * This is NOT `czap gauntlet` — that command spawns the 28-phase `gauntlet:full`
 * orchestrator and streams it to the terminal. `czap check` is the in-process,
 * fixture-qualified gate fold that returns a Finding[] work-list.
 *
 * TWO PATHS, ONE RECEIPT SHAPE:
 * - The LEAN path (default, no `--ir`): the IR-free, cache-free, MCP-safe six
 *   regex gates via `@czap/command`'s `check` handler. UNCHANGED — `@czap/command`
 *   and `@czap/mcp-server` never see the IR or `@czap/audit`. This is the path the
 *   MCP server exposes (the established lean-engine boundary: MCP runs ONLY the
 *   lean handler — `--ir` is CLI-only).
 * - The IR-ENRICHED path (`--ir`, CLI-ONLY): builds the repo-IR via `@czap/audit`
 *   and runs the triangulated cross-check (the B1 oracle-divergence) + the B2
 *   verdict cache via `runGauntletWithRepoIR`. `--no-cache` bypasses the cache;
 *   `--supply-chain` composes the avionics-tier supplyChainGate on + injects the
 *   host-computed supply-chain facts (lockfile/SBOM/CI), namespacing the cache mode.
 *   This path lives ENTIRELY in the CLI host (which already deps `@czap/audit`) —
 *   never pushed into the lean engine. Both paths emit the SAME `CheckPayload`
 *   shape (ok/blocked/findingCount/findings) so the receipt is consistent.
 *
 * @module
 */
import { checkCommand, type CheckPayload } from '@czap/command';
import { createNodeCommandContext } from '@czap/command/host';
import { wallClock } from '@czap/core';
import { emit, type WallClockTimestamp } from '../receipts.js';
import { runGauntletWithRepoIR } from '../lib/repo-ir-gauntlet.js';

/** Receipt emitted by `czap check`. */
export interface CheckReceipt extends CheckPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'check';
  readonly timestamp: WallClockTimestamp;
}

/** Options for {@link check}. `ir` selects the CLI-only IR-enriched path; `noCache` bypasses the B2 verdict cache. */
export interface CheckOptions {
  readonly cwd?: string;
  readonly pretty?: boolean;
  /** `--ir`: run the IR-enriched triangulated cross-check (CLI-only) instead of the lean six-regex path. */
  readonly ir?: boolean;
  /** `--no-cache`: bypass the B2 verdict cache (only meaningful with `--ir`). */
  readonly noCache?: boolean;
  /**
   * `--symbols`: also run the heavy symbol-evidenced LanguageService oracle (B3.3)
   * — true cross-file references cross-checked against the file-proxy graph. Only
   * meaningful with `--ir`; ~2 min cold, amortized by the (mode-namespaced) cache.
   */
  readonly symbols?: boolean;
  /**
   * `--supply-chain`: also run the avionics-tier `supplyChainGate` (Slice C, L4)
   * — the host computes the SupplyChainFacts (lockfile policy + SBOM completeness +
   * CI authority scan) and injects them for the gate to fold. Only meaningful with
   * `--ir`; opt-in so the default `--ir` run has no SBOM cost + no `not-evidenced`
   * noise. The cache key is namespaced by this mode (a supply-chain verdict can
   * never be served to a non-supply-chain run).
   */
  readonly supplyChain?: boolean;
}

/** Execute `czap check` — run the gauntlet gate fold in-process; emit the verdict + Finding[]. */
export async function check(opts: CheckOptions = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const payload =
    opts.ir === true
      ? runIrPath(cwd, opts.noCache === true, opts.symbols === true, opts.supplyChain === true)
      : await runLeanPath(cwd);

  const receipt: CheckReceipt = {
    status: payload.blocked ? 'failed' : 'ok',
    command: 'check',
    timestamp: new Date(wallClock.now()).toISOString() as WallClockTimestamp,
    ...payload,
  };
  emit(receipt);

  // Human findings summary on stderr — the work-list a developer reads.
  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty && payload.findingCount > 0) {
    const banner = `${payload.blocked ? 'CHECK BLOCKED' : 'CHECK (advisory)'} — ${payload.findingCount} finding(s) from the gauntlet gate fold${opts.ir === true ? ' (IR-enriched)' : ''}:\n`;
    process.stderr.write(banner);
    for (const f of payload.findings) {
      const where = f.location ? ` (${f.location.file}${f.location.line !== undefined ? `:${f.location.line}` : ''})` : '';
      process.stderr.write(`  [${f.severity}] ${f.ruleId}: ${f.title}${where}\n`);
    }
  }

  return payload.blocked ? 1 : 0;
}

/**
 * The LEAN path (no `--ir`) — the IR-free, MCP-safe six-regex gate fold via
 * `@czap/command`'s `check` handler. UNCHANGED behaviour: `@czap/command` and
 * `@czap/mcp-server` never see the IR. Projects the handler's `CheckPayload`.
 */
async function runLeanPath(cwd: string): Promise<CheckPayload> {
  const context = createNodeCommandContext({ cwd });
  const result = await checkCommand.handler({ name: 'check', args: {} }, context);
  return result.payload as CheckPayload;
}

/**
 * The IR-ENRICHED path (`--ir`, CLI-only) — builds the repo-IR via `@czap/audit`
 * and runs the triangulated cross-check + the B2 verdict cache via
 * `runGauntletWithRepoIR`. `noCache` (`--no-cache`) disarms the cache (a full,
 * uncached run); `supplyChain` (`--supply-chain`) composes the avionics-tier
 * supplyChainGate on + injects the host-computed facts. The wall-clock `now` is the
 * waiver-expiry calendar comparison
 * (TWO-CLOCK LAW: a wallClock boundary, NEVER systemClock). Returns the SAME
 * `CheckPayload` shape the lean path emits, so the receipt is consistent.
 */
function runIrPath(cwd: string, noCache: boolean, symbols: boolean, supplyChain: boolean): CheckPayload {
  const now = new Date(wallClock.now());
  const result = runGauntletWithRepoIR(cwd, now, undefined, {
    noCache,
    withSymbolReferences: symbols,
    withSupplyChain: supplyChain,
  });
  const findings = result.findings;
  return {
    ok: !result.blocked,
    blocked: result.blocked,
    findingCount: findings.length,
    findings,
  };
}
