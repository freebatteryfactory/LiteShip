/**
 * check (CLI adapter) — thin projection over `@liteship/command`'s check command
 * (the PURE gauntlet engine fold). The pass/fail decision lives in
 * `@liteship/command`; this adapter provisions the `runGauntlet` capability via the
 * shared host context (which runs `litelaunchGauntlet` in-process with a
 * WALL-CLOCK `now` for waiver expiry), emits the structured receipt, and prints
 * a concise findings summary to stderr. Exit 0 ok, 1 blocked.
 *
 * This is NOT `liteship gauntlet` — that command spawns the full `gauntlet:full`
 * orchestrator and streams it to the terminal. `liteship check` is the in-process,
 * fixture-qualified gate fold that returns a Finding[] work-list.
 *
 * TWO PATHS, ONE RECEIPT SHAPE:
 * - The LEAN path (default, no `--ir`): the IR-free, cache-free, MCP-safe six
 *   regex gates via `@liteship/command`'s `check` handler. UNCHANGED — `@liteship/command`
 *   and `@liteship/mcp-server` never see the IR or `@liteship/audit`. This is the path the
 *   MCP server exposes (the established lean-engine boundary: MCP runs ONLY the
 *   lean handler — `--ir` is CLI-only).
 * - The IR-ENRICHED path (`--ir`, CLI-ONLY): builds the repo-IR via `@liteship/audit`
 *   and runs the triangulated cross-check (the B1 oracle-divergence) + the B2
 *   verdict cache via `runGauntletWithRepoIR`. `--no-cache` bypasses the cache;
 *   `--supply-chain` composes the avionics-tier supplyChainGate on + injects the
 *   host-computed supply-chain facts (lockfile/SBOM/CI), namespacing the cache mode.
 *   This path lives ENTIRELY in the CLI host (which already deps `@liteship/audit`) —
 *   never pushed into the lean engine. Both paths emit the SAME `CheckPayload`
 *   shape (ok/blocked/findingCount/findings) so the receipt is consistent.
 *
 * @module
 */
import { checkCommand, type CheckPayload } from '@liteship/command';
import { createNodeCommandContext } from '@liteship/command/host';
import { wallClock } from '@liteship/core';
import { detectEarlyReturnBeforeExpectAST, detectSkipsAST } from '@liteship/audit';
import { emit, type WallClockTimestamp } from '../receipts.js';
import { runGauntletWithRepoIR } from '../lib/repo-ir-gauntlet.js';

/** Receipt emitted by `liteship check`. */
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
  /**
   * `--mutate`: also run the avionics-tier `mutationDivergenceGate` (Slice C, L4 —
   * mutation-as-divergence). The host generates the deterministic mutants over the
   * live effective-L4 trust-spine seams, runs each through the per-mutant vitest
   * runner (in-place mutate → isolated subprocess → verified restore), folds the
   * kill/survive verdicts, and surfaces every SURVIVOR as a finding. Only meaningful
   * with `--ir`; opt-in (a covering-test suite run per mutant is HEAVY). The cache
   * key is namespaced by this mode (a mutation verdict never serves a non-mutation
   * run). MUST run in isolation — it mutates real source files in place.
   */
  readonly mutate?: boolean;
  /**
   * `--mcdc`: also run the avionics-tier `mcdcCoverageGate` (L4 — DO-178B Level A's
   * Modified Condition/Decision Coverage, realized as CONDITION-LEVEL MUTATION). The host
   * decomposes each effective-L4 decision into its atomic conditions, mints the
   * force-true/force-false condition-mutant per condition, runs each through the per-pin
   * vitest runner (in-place pin → isolated subprocess → verified restore), and folds the
   * two pins per condition: a condition is MC/DC-covered iff BOTH pins are KILLED, else its
   * independent effect is unobserved — an MC/DC gap surfaced as a finding (L4 demands full
   * MC/DC). Only meaningful with `--ir`; opt-in (a covering-test suite run per pin, two per
   * condition, is HEAVY). The cache key is namespaced by this mode (an MC/DC verdict never
   * serves a non-MC/DC run). MUST run in isolation — it mutates real source files in place.
   */
  readonly mcdc?: boolean;
  /**
   * `--simulate`: also run the avionics-tier `simulationDeterminismGate` (L4 — the
   * determinism spine, DST). The host drives the committed scenario corpus — real L4
   * trust-spine SUTs (content-address / HLC / graph-patch / boundary-evaluator) —
   * through the seeded `@liteship/core/simulation` world, replaying each seed TWICE and
   * comparing the two byte-exact trace digests. A deterministic pair CERTIFIES
   * byte-exact reproducibility; a divergence is a REAL nondeterminism bug surfaced as
   * an L4 finding carrying the seed (never fake-passed). Only meaningful with `--ir`;
   * opt-in (no `not-evidenced` advisory on the default `--ir` run). The cache key is
   * namespaced by this mode (a simulation verdict never serves a non-simulation run).
   */
  readonly simulate?: boolean;
  /**
   * `--taint`: also run the `taintFlowGate` (the TAINT-ANALYSIS family, L4). The host
   * traces the source→sink dataflow via @liteship/audit's GENERIC taint oracle, classified
   * by the LiteShip-LOCAL source/sink/sanitizer registry the CLI injects (the shader-
   * source fetch→compile, the AI-cast graph-apply, the runtime-URL SSRF seam, …). An
   * UNSANITIZED untrusted-value→dangerous-sink flow is a finding; a sanitized flow is
   * clean. Only meaningful with `--ir`; opt-in (a whole-corpus ts.Program + checker
   * dataflow trace is HEAVY). The cache key is namespaced by this mode (a taint verdict
   * never serves a non-taint run).
   */
  readonly taint?: boolean;
  /**
   * `--proof`: also run the `proofPropagationGate` (the LOCAL-VS-GLOBAL correctness
   * family — the lax-functor, L4). The host reads the proof signals (mutation score /
   * coverage / property tests / enrolled invariants), blends them into a per-module
   * scalar, and the gate propagates it along the IR's dep DAG (the `min`-fixpoint): a
   * trust-spine module whose GLOBAL proof drops below its level floor because of a weak
   * dependency is a finding naming the weak-link path. Only meaningful with `--ir`;
   * opt-in. The cache key is namespaced by this mode (a proof verdict never serves a
   * non-proof run).
   */
  readonly proof?: boolean;
  /**
   * `--composition`: also run the `compositionCoverageGate` (the LOCAL-VS-GLOBAL
   * correctness family — "locally green, globally untested interaction", L4). The host
   * derives the interaction edges from the IR call graph (both endpoints individually
   * tested) and classifies each integration-covered/uncovered (the sound
   * static-reference proxy): an UNCOVERED interaction edge on the trust spine is a
   * finding. Only meaningful with `--ir`; opt-in. The cache key is namespaced by this
   * mode (a composition verdict never serves a non-composition run).
   */
  readonly composition?: boolean;
  /**
   * `--capability-gate`: also run the `capabilityGateLinkGate` (codex round-8, #1b — the
   * capability-link dataflow proof, L4). The host resolves each sanctioned skip's guard against the
   * canonical capability symbol table and proves it DERIVES FROM its declared capability's probe (not
   * merely that it is conditional); an unrelated/mislabeled guard is a finding. Only meaningful with
   * `--ir`; opt-in (a ts.Program over the sanctioned files + capability modules). The cache key is
   * namespaced by this mode (a capability-gate verdict never serves a non-capability-gate run).
   */
  readonly capabilityGate?: boolean;
  /**
   * `--spine-relation`: also run the `spineRelationGate` (Wave 8.5, the public constitution's
   * STATIC-projection half, L4). The host probes each admitted `@liteship/_spine` mirror type's
   * bidirectional assignability against its runtime source (a ts.Program probe over the spine
   * + runtime surface) and injects the observed facts; a mirror whose observed relation no
   * longer satisfies its admitted (frozen) relation — or no longer resolves — is a
   * public-contract drift finding. Only meaningful with `--ir`; opt-in (a second ts.Program
   * build, ~3.25s, is HEAVY) but REQUIRED in the release/CI profile. The cache key is
   * namespaced by this mode (a spine-relation verdict never serves a non-spine-relation run).
   */
  readonly spineRelation?: boolean;
}

/** Execute `liteship check` — run the gauntlet gate fold in-process; emit the verdict + Finding[]. */
export async function check(opts: CheckOptions = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  const payload =
    opts.ir === true
      ? await runIrPath(
          cwd,
          opts.noCache === true,
          opts.symbols === true,
          opts.supplyChain === true,
          opts.mutate === true,
          opts.mcdc === true,
          opts.simulate === true,
          opts.taint === true,
          opts.proof === true,
          opts.composition === true,
          opts.capabilityGate === true,
          opts.spineRelation === true,
        )
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
      const where = f.location
        ? ` (${f.location.file}${f.location.line !== undefined ? `:${f.location.line}` : ''})`
        : '';
      process.stderr.write(`  [${f.severity}] ${f.ruleId}: ${f.title}${where}\n`);
    }
  }

  return payload.blocked ? 1 : 0;
}

/**
 * The LEAN path (no `--ir`) — the IR-free, MCP-safe six-regex gate fold via
 * `@liteship/command`'s `check` handler. UNCHANGED behaviour: `@liteship/command` and
 * `@liteship/mcp-server` never see the IR. Projects the handler's `CheckPayload`.
 */
async function runLeanPath(cwd: string): Promise<CheckPayload> {
  // Inject the host-built SOUND AST detectors — the CLI deps `@liteship/audit`, so even the
  // lean (`@liteship/command`) check path gains parser-backed skip and early-return detection.
  // The MCP adapter builds the context WITHOUT them → the lean fallbacks; this keeps
  // `@liteship/audit` out of `@liteship/mcp-server`.
  const context = createNodeCommandContext({
    cwd,
    skipDetector: detectSkipsAST,
    earlyReturnDetector: detectEarlyReturnBeforeExpectAST,
  });
  const result = await checkCommand.handler({ name: 'check', args: {} }, context);
  return result.payload as CheckPayload;
}

/**
 * The IR-ENRICHED path (`--ir`, CLI-only) — builds the repo-IR via `@liteship/audit`
 * and runs the triangulated cross-check + the B2 verdict cache via
 * `runGauntletWithRepoIR`. `noCache` (`--no-cache`) disarms the cache (a full,
 * uncached run); `supplyChain` (`--supply-chain`) composes the avionics-tier
 * supplyChainGate on + injects the host-computed facts; `mutate` (`--mutate`) composes
 * the mutationDivergenceGate on + runs the per-mutant vitest runner over the live
 * effective-L4 seams (HEAVY — must run in isolation, it mutates real source files in
 * place). `simulate` (`--simulate`) composes the simulationDeterminismGate on +
 * drives the committed scenario corpus through the `@liteship/core/simulation` seeded
 * world (replaying each seed twice, folding the byte-exact-replay verdicts). The
 * wall-clock `now` is the
 * waiver-expiry calendar comparison
 * (TWO-CLOCK LAW: a wallClock boundary, NEVER systemClock). Async because the
 * `--simulate` corpus drives the harness through the scheduler seam (async). Returns
 * the SAME `CheckPayload` shape the lean path emits, so the receipt is consistent.
 */
async function runIrPath(
  cwd: string,
  noCache: boolean,
  symbols: boolean,
  supplyChain: boolean,
  mutate: boolean,
  mcdc: boolean,
  simulate: boolean,
  taint: boolean,
  proof: boolean,
  composition: boolean,
  capabilityGate: boolean,
  spineRelation: boolean,
): Promise<CheckPayload> {
  const now = new Date(wallClock.now());
  const result = await runGauntletWithRepoIR(cwd, now, undefined, {
    noCache,
    withSymbolReferences: symbols,
    withSupplyChain: supplyChain,
    withMutate: mutate,
    withMcdc: mcdc,
    withSimulate: simulate,
    withTaint: taint,
    withProof: proof,
    withComposition: composition,
    withCapabilityGate: capabilityGate,
    withSpineRelation: spineRelation,
  });
  const findings = result.findings;
  return {
    ok: !result.blocked,
    blocked: result.blocked,
    findingCount: findings.length,
    findings,
  };
}
