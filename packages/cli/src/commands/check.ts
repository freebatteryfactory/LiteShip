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
 * A THIRD surface, orthogonal to those two: `--profile <p>` (WITHOUT `--plan`) is the
 * profile-driven SWEEP. It projects `@liteship/command`'s `CHECK_REGISTRY` into the
 * ordered plan for the profile (via `planChecks`) and runs it through the CLI SPAWN
 * LAYER — each registry check's `command` becomes a subprocess, its exit status the
 * per-check verdict — emitting a `CheckReport` (the executed DUAL of the `--plan`
 * `CheckPlan`), NOT the gauntlet-fold `CheckReceipt`. `--json` selects the machine
 * report. This is how `liteship check --profile quick` runs the registry's checks,
 * distinct from the bare-`check` in-process gate fold that `check:gates` invokes.
 *
 * @module
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  checkCommand,
  formatCheckPlan,
  planChecks,
  type CheckPayload,
  type CheckPlan,
  type CheckPlatform,
  type CheckProfile,
  type CheckReport,
  type CheckRunResult,
  type CheckVerdict,
} from '@liteship/command';
import { createNodeCommandContext } from '@liteship/command/host';
import { systemClock, wallClock } from '@liteship/core';
import { detectEarlyReturnBeforeExpectAST, detectSkipsAST } from '@liteship/audit';
import { emit, type WallClockTimestamp } from '../receipts.js';
import { runGauntletWithRepoIR } from '../lib/repo-ir-gauntlet.js';

/** Receipt emitted by `liteship check`. */
export interface CheckReceipt extends CheckPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'check';
  readonly timestamp: WallClockTimestamp;
}

/**
 * Injectable engine/handler seam for {@link check}. Each field DEFAULTS (via the
 * null-coalesce at its call site) to the real dependency, so production
 * `liteship check` is byte-identical: `runGauntletWithRepoIR` is the real
 * IR-enriched builder (the `--ir` path), `checkHandler` is the real lean
 * `@liteship/command` handler (the default path). Tests pass a scripted runner /
 * handler to pin the flag plumbing + receipt projection without paying for a real
 * full-repo `ts.Program` build or a real six-regex gate fold. Unexported + off the
 * public barrel, so the api-surface snapshot is unchanged.
 */
interface CheckDeps {
  readonly runGauntletWithRepoIR?: typeof runGauntletWithRepoIR;
  readonly checkHandler?: typeof checkCommand.handler;
  /**
   * The profile-sweep executor (the `--profile` path). DEFAULTS to
   * {@link runCheckPlanBySpawn} (the real CLI spawn layer), so production is
   * byte-identical; tests inject a scripted runner to pin the report projection +
   * exit-code fold without spawning the registry's real (heavy) check commands.
   */
  readonly runCheckPlan?: CheckPlanRunner;
}

/** Runs an ordered {@link CheckPlan} to completion, folding the executed {@link CheckReport}. */
type CheckPlanRunner = (plan: CheckPlan, cwd: string) => CheckReport;

/** Options for {@link check}. `ir` selects the CLI-only IR-enriched path; `noCache` bypasses the B2 verdict cache. */
export interface CheckOptions {
  readonly cwd?: string;
  readonly pretty?: boolean;
  /**
   * `--plan`: PURE projection — print the ordered check plan for {@link profile} on the
   * current platform and run NOTHING (no gauntlet fold, no IR build, no receipt). The
   * `check/<slug>` plan is the projection of `@liteship/command`'s `CHECK_REGISTRY`.
   */
  readonly plan?: boolean;
  /**
   * `--profile <p>`: the profile the {@link plan} projects AND the profile-driven sweep runs
   * — one of quick | full | release | consumer | environment. With `--plan`, defaults to
   * `quick` (the plan projection). WITHOUT `--plan`, PRESENCE selects the profile SWEEP: the
   * registry is projected into the ordered plan and RUN through the CLI spawn layer, emitting
   * a `CheckReport` (see {@link check}). Absent (and no `--plan`), `check` stays the bare
   * in-process gauntlet gate fold that emits a `CheckReceipt`.
   */
  readonly profile?: CheckProfile;
  /**
   * `--json`: machine output. With `--plan`, emit the `CheckPlan` as JSON (instead of text);
   * with `--profile` (the sweep), emit the `CheckReport` as JSON (instead of text); with
   * neither, suppress the pretty stderr summary (the receipt is already JSON on stdout).
   */
  readonly json?: boolean;
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

/**
 * Execute `liteship check`. Three surfaces: `--plan` prints the pure plan projection;
 * `--profile <p>` (without `--plan`) runs the profile SWEEP through the CLI spawn layer
 * and emits a `CheckReport`; bare `check` runs the in-process gauntlet gate fold and
 * emits a `CheckReceipt` (the verdict + Finding[]).
 */
export async function check(opts: CheckOptions = {}, deps: CheckDeps = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  // `--plan`: PURE — project the registry into the ordered plan and print it. Runs
  // nothing (no gauntlet fold, no IR build, no receipt), so it returns before any
  // execution path. `--json` selects the structured plan; otherwise human text.
  if (opts.plan === true) {
    const plan = planChecks(opts.profile ?? 'quick', currentCheckPlatform());
    process.stdout.write((opts.json === true ? JSON.stringify(plan) : formatCheckPlan(plan)) + '\n');
    return 0;
  }

  // `--profile <p>` (WITHOUT `--plan`): the profile-driven SWEEP. Project the registry
  // into the ordered plan for `profile` on the current platform, then RUN it through the
  // CLI spawn layer (each check's `command` → a subprocess; its exit status → the per-check
  // verdict). Emit the `CheckReport` (the executed DUAL of the `--plan` `CheckPlan`) — NOT
  // the gauntlet-fold `CheckReceipt`. `--json` selects the machine report; otherwise a human
  // summary. Exit 1 iff a BLOCKING check failed. Bare `check` (no `--profile`) falls through
  // to the gauntlet gate fold below, so `check:gates` (`liteship check`) is unchanged.
  if (opts.profile !== undefined) {
    const plan = planChecks(opts.profile, currentCheckPlatform());
    const report = (deps.runCheckPlan ?? runCheckPlanBySpawn)(plan, cwd);
    process.stdout.write((opts.json === true ? JSON.stringify(report) : formatCheckReport(report)) + '\n');
    return report.blocked ? 1 : 0;
  }

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
          deps.runGauntletWithRepoIR ?? runGauntletWithRepoIR,
        )
      : await runLeanPath(cwd, deps.checkHandler ?? checkCommand.handler);

  const receipt: CheckReceipt = {
    status: payload.blocked ? 'failed' : 'ok',
    command: 'check',
    timestamp: new Date(wallClock.now()).toISOString() as WallClockTimestamp,
    ...payload,
  };
  emit(receipt);

  // Human findings summary on stderr — the work-list a developer reads. `--json`
  // forces machine mode: the receipt is already JSON on stdout, so the pretty
  // stderr summary is suppressed.
  const wantPretty = opts.json === true ? false : (opts.pretty ?? Boolean(process.stderr.isTTY));
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
 * Map the host's `process.platform` to a {@link CheckPlatform}. The registry declares
 * platform support over the three LiteShip-supported targets; any other `process.platform`
 * (an unsupported host) folds to `linux` so a plan still projects rather than emptying —
 * every current check supports all three, so the fold is behaviourally inert today.
 */
function currentCheckPlatform(): CheckPlatform {
  const platform = process.platform;
  if (platform === 'darwin' || platform === 'win32') return platform;
  return 'linux';
}

/**
 * The single npm-script a registry check's `command` invokes, or `null` when the
 * command names no single script whose presence we could test for. Matches
 * `pnpm run <script>` (the registry's canonical form) and the `pnpm test`
 * builtin shorthand. Used by the sweep to SKIP — rather than fail — a check whose
 * script the invocation cwd's `package.json` does not define (the consumer-app
 * case, where the monorepo-root scripts are simply absent).
 */
export function invokedScriptName(command: string): string | null {
  const run = /^pnpm run (\S+)/.exec(command);
  if (run) return run[1]!;
  if (/^pnpm test(\s|$)/.test(command)) return 'test';
  return null;
}

/**
 * The npm-script names defined in `<cwd>/package.json`, or `null` when there is no
 * readable/parseable package.json — in which case the sweep cannot distinguish a
 * missing script from a present one and runs every check as-is (an unreadable
 * manifest is not evidence a script is absent).
 */
export function readDefinedScripts(cwd: string): ReadonlySet<string> | null {
  const manifestPath = resolve(cwd, 'package.json');
  // No manifest at all → null (the common consumer case: cwd is not a package
  // root). An ABSENT file is not an error, so this needs no catch.
  if (!existsSync(manifestPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as { scripts?: Record<string, unknown> };
    return new Set(Object.keys(parsed.scripts ?? {}));
  } catch (e) {
    // A PRESENT-but-unreadable/malformed manifest is a real environment problem,
    // not a missing one — surface it (never launder the failure to a silent null)
    // before falling back to the run-every-check behaviour.
    process.stderr.write(
      `liteship check: could not read ${manifestPath}: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    return null;
  }
}

/**
 * The default {@link CheckPlanRunner} — the CLI SPAWN LAYER for the `--profile` sweep.
 * Runs each planned check by spawning its `command` (the exact root-script shell line
 * the registry declares) as a subprocess in `cwd`, mapping the exit status to a per-check
 * verdict (0 → pass; non-zero, a timeout, or a signal → fail) and the measured MONOTONIC
 * elapsed time to `durationMs` (two-clock law: a `systemClock` delta, never a wall-clock
 * timestamp). A failed BLOCKING check blocks the aggregate verdict; an advisory failure
 * surfaces (as a finding line) but never blocks. Child stdout/stderr is DISCARDED so the
 * emitted `CheckReport` is the only thing on the CLI's stdout. `cacheHit` is always false —
 * this layer re-runs every planned check (the content-addressed verdict cache the registry
 * annotates via `cacheable` is a later increment); `timeoutMs` is enforced as the spawn
 * ceiling. `skipped` platform drops live in the plan; ONE other row can be `skipped` here —
 * a check whose `pnpm run <script>` names a script the invocation cwd's `package.json` does
 * not define (see {@link invokedScriptName}). That is the CONSUMER-APP case: a scaffolded
 * LiteShip app has none of the monorepo-root scripts (`package:smoke`, `test:journey`, …),
 * so those checks are honestly SKIPPED rather than spawned into a guaranteed
 * `ERR_PNPM_NO_SCRIPT` failure. In the monorepo every script exists, so nothing skips and
 * the gauntlet projection is byte-for-byte unaffected.
 */
function runCheckPlanBySpawn(plan: CheckPlan, cwd: string): CheckReport {
  const results: CheckRunResult[] = [];
  const definedScripts = readDefinedScripts(cwd);
  let blocked = false;
  for (const check of plan.checks) {
    // Consumer-honesty SKIP: a check whose `pnpm run <script>` names a script this
    // package.json does not define asserts something about a repo that is not here.
    // Skip it (non-blocking) rather than spawning a guaranteed no-script failure.
    const script = invokedScriptName(check.command);
    if (script !== null && definedScripts !== null && !definedScripts.has(script)) {
      results.push({
        id: check.id,
        verdict: 'skipped',
        durationMs: 0,
        cacheHit: false,
        findings: [`${check.command} — no "${script}" script in this package.json; skipped (not a consumer-app check)`],
      });
      continue;
    }
    const start = systemClock.now();
    const r = spawnSync(check.command, { shell: true, cwd, stdio: 'ignore', timeout: check.timeoutMs });
    const durationMs = systemClock.now() - start;
    const passed = r.status === 0;
    if (!passed && check.authority === 'blocking') blocked = true;
    const verdict: CheckVerdict = passed ? 'pass' : 'fail';
    const findings = passed
      ? []
      : [
          r.signal
            ? `${check.command} terminated by signal ${r.signal} (ceiling ${check.timeoutMs}ms)`
            : `${check.command} exited with status ${r.status ?? 'unknown'}`,
        ];
    results.push({ id: check.id, verdict, durationMs, cacheHit: false, findings });
  }
  return { profile: plan.profile, platform: plan.platform, ok: !blocked, blocked, results };
}

/**
 * Render a {@link CheckReport} as human text — the default (non-`--json`) `--profile` sweep
 * output: a header, one line per executed check (verdict + measured duration, plus any
 * finding lines), and the aggregate verdict footer. PURE: a total function of the report.
 */
function formatCheckReport(report: CheckReport): string {
  const lines: string[] = [`check report — profile "${report.profile}" on ${report.platform}`];
  const idWidth = report.results.reduce((max, r) => Math.max(max, r.id.length), 0);
  for (const r of report.results) {
    const mark = r.verdict === 'pass' ? 'PASS' : r.verdict === 'fail' ? 'FAIL' : 'SKIP';
    lines.push(`  ${mark}  ${r.id.padEnd(idWidth, ' ')}  ${r.durationMs}ms${r.cacheHit ? ' (cached)' : ''}`);
    for (const f of r.findings) lines.push(`        ${f}`);
  }
  lines.push('');
  lines.push(report.blocked ? 'CHECK BLOCKED — a blocking check failed.' : 'CHECK OK — no blocking check failed.');
  return lines.join('\n');
}

/**
 * The LEAN path (no `--ir`) — the IR-free, MCP-safe six-regex gate fold via
 * `@liteship/command`'s `check` handler. UNCHANGED behaviour: `@liteship/command` and
 * `@liteship/mcp-server` never see the IR. Projects the handler's `CheckPayload`.
 */
async function runLeanPath(cwd: string, handler: typeof checkCommand.handler): Promise<CheckPayload> {
  // Inject the host-built SOUND AST detectors — the CLI deps `@liteship/audit`, so even the
  // lean (`@liteship/command`) check path gains parser-backed skip and early-return detection.
  // The MCP adapter builds the context WITHOUT them → the lean fallbacks; this keeps
  // `@liteship/audit` out of `@liteship/mcp-server`.
  const context = createNodeCommandContext({
    cwd,
    skipDetector: detectSkipsAST,
    earlyReturnDetector: detectEarlyReturnBeforeExpectAST,
  });
  const result = await handler({ name: 'check', args: {} }, context);
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
  runGauntlet: typeof runGauntletWithRepoIR,
): Promise<CheckPayload> {
  const now = new Date(wallClock.now());
  const result = await runGauntlet(cwd, now, undefined, {
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
