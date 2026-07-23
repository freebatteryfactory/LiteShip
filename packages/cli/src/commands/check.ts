/**
 * check (CLI adapter) — one public profile command with an explicit gate subcommand.
 *
 * - `liteship check` projects and executes the quick profile from the canonical
 *   check registry. `--profile`, `--plan`, `--json`, and `--no-cache` refine that
 *   profile execution without changing its identity.
 * - `liteship check gates` runs the IR-free, MCP-safe pure gauntlet fold exposed as
 *   the handler command `check.gates`.
 * - `liteship check gates --ir` runs the CLI-only repository-IR fold and its
 *   opt-in evidence modes. The IR never crosses into `@liteship/command` or MCP.
 *
 * Profile execution emits a {@link CheckReport}; gate execution emits a
 * {@link CheckReceipt}. `liteship gauntlet` remains the separate terminal-streaming
 * full orchestrator.
 *
 * @module
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { CanonicalCbor, normalizeRepoPath, systemClock, wallClock } from '@liteship/core';
import { walkFiles } from '@liteship/core/fs-walk';
import { sha256Hex } from '@liteship/canonical';
import { IoError, ParseError } from '@liteship/error';
import {
  checkGatesCommand,
  formatCheckPlan,
  planChecks,
  type CheckPayload,
  type CheckPlan,
  type CheckContext,
  type CheckPlatform,
  type CheckProfile,
  type CheckReport,
  type CheckRunResult,
  type CheckVerdict,
} from '@liteship/command';
import { createNodeCommandContext, currentEnvFingerprint } from '@liteship/command/host';
import { detectEarlyReturnBeforeExpectAST, detectSkipsAST } from '@liteship/audit';
import { emit, type WallClockTimestamp } from '../receipts.js';
import { runGauntletWithRepoIR } from '../lib/repo-ir-gauntlet.js';
import { detectProjectPackageManager, projectBinaryInvocation } from '../lib/project-package-manager.js';

/** Receipt emitted by `liteship check gates`. */
export interface CheckReceipt extends CheckPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'check.gates';
  readonly timestamp: WallClockTimestamp;
}

/**
 * Injectable engine/handler seam for {@link check}. Each field DEFAULTS (via the
 * null-coalesce at its call site) to the real dependency, so production
 * `liteship check gates` is byte-identical: `runGauntletWithRepoIR` is the real
 * IR-enriched builder (the `gates --ir` path), `checkHandler` is the real lean
 * `@liteship/command` handler. Tests pass a scripted runner /
 * handler to pin the flag plumbing + receipt projection without paying for a real
 * full-repo `ts.Program` build or a real six-regex gate fold. Unexported + off the
 * public barrel, so the api-surface snapshot is unchanged.
 */
interface CheckDeps {
  readonly runGauntletWithRepoIR?: typeof runGauntletWithRepoIR;
  readonly checkHandler?: typeof checkGatesCommand.handler;
  /**
   * The profile-sweep executor (the `--profile` path). DEFAULTS to
   * {@link runCheckPlanBySpawn} (the real CLI spawn layer), so production is
   * byte-identical; tests inject a scripted runner to pin the report projection +
   * exit-code fold without spawning the registry's real (heavy) check commands.
   */
  readonly runCheckPlan?: CheckPlanRunner;
}

/** Runs an ordered {@link CheckPlan} to completion, folding the executed {@link CheckReport}. */
export type CheckPlanRunner = (plan: CheckPlan, cwd: string, options?: CheckPlanRunOptions) => CheckReport;

/** Runtime controls for a profile sweep. */
export interface CheckPlanRunOptions {
  /** Bypass content-addressed verdict reads while still refreshing successful writes. */
  readonly noCache?: boolean;
}

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
   * `--profile <p>`: the profile the {@link plan} projects and the profile-driven sweep runs
   * — one of quick | full | release | consumer | environment. It defaults to `quick` both
   * with and without `--plan`.
   */
  readonly profile?: CheckProfile;
  /**
   * `--json`: machine output. With `--plan`, emit the `CheckPlan` as JSON (instead of text);
   * for profile execution, emit the `CheckReport` as JSON (instead of text); with
   * `gates`, suppress the pretty stderr summary (the receipt is already JSON on stdout).
   */
  readonly json?: boolean;
  /** Run the explicit in-process gate fold instead of the default quick profile. */
  readonly gates?: boolean;
  /** `--ir`: under `check gates`, run the CLI-only IR-enriched cross-check instead of the lean fold. */
  readonly ir?: boolean;
  /** `--no-cache`: bypass profile result reuse, or the IR verdict cache under `check gates --ir`. */
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
 * Execute `liteship check`. Bare `check` and `--profile quick` are the same profile
 * sweep. `--plan` prints that profile's pure projection. The old in-process fold is
 * retained under the explicit `check gates` route. Gate-only flags are rejected
 * unless that subcommand is present, so the two contracts cannot be confused.
 */
export async function check(opts: CheckOptions = {}, deps: CheckDeps = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  // `--plan`: PURE — project the registry into the ordered plan and print it. Runs
  // nothing (no gauntlet fold, no IR build, no receipt), so it returns before any
  // execution path. `--json` selects the structured plan; otherwise human text.
  if (opts.plan === true) {
    const plan = planChecks(opts.profile ?? 'quick', currentCheckPlatform(), detectCheckContext(cwd));
    process.stdout.write((opts.json === true ? JSON.stringify(plan) : formatCheckPlan(plan)) + '\n');
    return 0;
  }

  const gateFlagRequested =
    opts.ir === true ||
    opts.symbols === true ||
    opts.supplyChain === true ||
    opts.mutate === true ||
    opts.mcdc === true ||
    opts.simulate === true ||
    opts.taint === true ||
    opts.proof === true ||
    opts.composition === true ||
    opts.capabilityGate === true ||
    opts.spineRelation === true;
  if (gateFlagRequested && opts.gates !== true) {
    process.stderr.write('liteship check: gate-only flags require the explicit `check gates` subcommand.\n');
    return 1;
  }
  const gateMode = opts.gates === true;

  // The public default: a bare `liteship check` is exactly the quick registry
  // profile. Gate folding is a separate explicit surface (`check gates`).
  if (!gateMode) {
    const profile = opts.profile ?? 'quick';
    const plan = planChecks(profile, currentCheckPlatform(), detectCheckContext(cwd));
    const report = (deps.runCheckPlan ?? defaultCheckPlanRunner)(plan, cwd, { noCache: opts.noCache === true });
    process.stdout.write((opts.json === true ? JSON.stringify(report) : formatCheckReport(report)) + '\n');
    return report.ok ? 0 : 1;
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
      : await runLeanPath(cwd, deps.checkHandler ?? checkGatesCommand.handler);

  const receipt: CheckReceipt = {
    status: payload.blocked ? 'failed' : 'ok',
    command: 'check.gates',
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

/** Only the LiteShip source tree is repository context; every other cwd is an application. */
export function detectCheckContext(cwd: string): CheckContext {
  const isLiteShipRepository =
    existsSync(resolve(cwd, 'scripts', 'package-catalog.ts')) &&
    existsSync(resolve(cwd, 'packages', 'command', 'src', 'checks', 'registry.ts'));
  return isLiteShipRepository ? 'repository' : 'application';
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
 * The npm-script names defined in `<cwd>/package.json`, or `null` when no manifest
 * exists. A present but unreadable/malformed manifest throws: uncertainty cannot
 * become a green or skipped report.
 */
export function readDefinedScripts(cwd: string): ReadonlySet<string> | null {
  const manifestPath = resolve(cwd, 'package.json');
  // No manifest at all → null (the common consumer case: cwd is not a package
  // root). An ABSENT file is not an error, so this needs no catch.
  if (!existsSync(manifestPath)) return null;
  let source: string;
  try {
    source = readFileSync(manifestPath, 'utf8');
  } catch (error) {
    throw IoError('check.read-manifest', error instanceof Error ? error.message : String(error), {
      path: manifestPath,
      cause: error,
    });
  }
  try {
    const parsed = JSON.parse(source) as { scripts?: Record<string, unknown> };
    return new Set(Object.keys(parsed.scripts ?? {}));
  } catch (error) {
    // A PRESENT-but-malformed manifest is a real environment problem. ParseError
    // keeps it structured; null is reserved for an absent manifest.
    throw ParseError(manifestPath, error instanceof Error ? error.message : String(error));
  }
}

const CHECK_CACHE_SCHEMA = 1 as const;
const CHECK_OUTPUT_LIMIT = 32 * 1024;
const CHECK_SPAWN_BUFFER = 4 * 1024 * 1024;

interface CheckCacheEntry {
  readonly schema: typeof CHECK_CACHE_SCHEMA;
  readonly key: string;
  readonly id: string;
  readonly verdict: 'pass';
  readonly findings: readonly string[];
}

interface SpawnedCheck {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout?: string | Buffer;
  readonly stderr?: string | Buffer;
  readonly error?: Error;
}

interface CheckRunnerDeps {
  readonly spawn?: (command: string, cwd: string, timeoutMs: number) => SpawnedCheck;
  readonly now?: () => number;
  readonly env?: Readonly<Record<string, string>>;
}

/** Create the production profile runner, with narrow clock/spawn seams for executable tests. */
export function createCheckPlanRunner(deps: CheckRunnerDeps = {}): CheckPlanRunner {
  const spawn = deps.spawn ?? spawnCheck;
  const now = deps.now ?? systemClock.now;
  const env = deps.env ?? currentEnvFingerprint();

  return (plan, cwd, options = {}) => executeCheckPlan(plan, cwd, options, spawn, now, env);
}

const defaultCheckPlanRunner: CheckPlanRunner = createCheckPlanRunner();

/** Execute a command with bounded buffering; only the parent report reaches stdout. */
function spawnCheck(command: string, cwd: string, timeoutMs: number): SpawnedCheck {
  return spawnSync(command, {
    shell: true,
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: CHECK_SPAWN_BUFFER,
    stdio: 'pipe',
  });
}

/**
 * The real CLI SPAWN LAYER. Content-addressed checks reuse a verdict only when
 * command, declared input bytes, platform/toolchain, and cache schema all match.
 * Missing scripts are explicit skips; an entirely skipped sweep is non-green.
 */
function executeCheckPlan(
  plan: CheckPlan,
  cwd: string,
  options: CheckPlanRunOptions,
  spawn: NonNullable<CheckRunnerDeps['spawn']>,
  now: NonNullable<CheckRunnerDeps['now']>,
  env: Readonly<Record<string, string>>,
): CheckReport {
  const results: CheckRunResult[] = plan.skipped.map((skip) => ({
    id: skip.id,
    verdict: 'skipped',
    durationMs: 0,
    cacheHit: false,
    findings: [skip.reason],
  }));
  let definedScripts: ReadonlySet<string> | null;
  try {
    definedScripts = readDefinedScripts(cwd);
  } catch (error) {
    const finding = error instanceof Error ? error.message : String(error);
    return {
      profile: plan.profile,
      platform: plan.platform,
      context: plan.context,
      ok: false,
      blocked: true,
      results: plan.checks.map((check) => ({
        id: check.id,
        verdict: 'fail',
        durationMs: 0,
        cacheHit: false,
        findings: [finding],
      })),
    };
  }

  const inputCorpus = createInputCorpus(cwd);
  let blocked = false;
  for (const check of plan.checks) {
    // Applicability was decided by planChecks before execution. Once a check is in
    // the plan, a missing declared script is a broken authority, never a skip.
    const script = check.execution === undefined ? invokedScriptName(check.command) : null;
    if (script !== null && definedScripts !== null && !definedScripts.has(script)) {
      if (check.authority === 'blocking') blocked = true;
      results.push({
        id: check.id,
        verdict: 'fail',
        durationMs: 0,
        cacheHit: false,
        findings: [`${check.command} — planned authority is missing the "${script}" package.json script`],
      });
      continue;
    }

    let cacheKey: string | null = null;
    if (check.cacheable) {
      cacheKey = checkCacheKey(check, plan, inputCorpus, env);
      if (options.noCache !== true) {
        const cached = readCheckCache(cacheKey, cwd, check.id);
        if (cached !== null) {
          const cacheResult: CheckRunResult = {
            id: check.id,
            verdict: cached.verdict,
            durationMs: 0,
            cacheHit: true,
            findings: cached.findings,
          };
          results.push(cacheResult);
          continue;
        }
      }
    }

    const command = materializeCheckCommand(check, cwd);
    const start = now();
    const r = spawn(command, cwd, check.timeoutMs);
    const durationMs = Math.max(0, now() - start);
    const passed = r.status === 0;
    if (!passed && check.authority === 'blocking') blocked = true;
    const verdict: CheckVerdict = passed ? 'pass' : 'fail';
    const findings = passed ? [] : checkFailureFindings(command, check.timeoutMs, r);
    const result: CheckRunResult = { id: check.id, verdict, durationMs, cacheHit: false, findings };
    results.push(result);

    // Cache only a successful deterministic verdict. A timeout, signal, spawn
    // fault, or transient tool failure is not reusable evidence.
    if (cacheKey !== null && verdict === 'pass') {
      writeCheckCache(cacheKey, cwd, {
        schema: CHECK_CACHE_SCHEMA,
        key: cacheKey,
        id: check.id,
        verdict,
        findings,
      });
    }
  }

  const executed = results.some((result) => result.verdict !== 'skipped');
  return {
    profile: plan.profile,
    platform: plan.platform,
    context: plan.context,
    ok: executed && !blocked,
    blocked,
    results,
  };
}

/** Materialize structured application checks only at the CLI host boundary. */
function materializeCheckCommand(check: CheckPlan['checks'][number], cwd: string): string {
  if (check.execution === undefined) return check.command;
  const manager = detectProjectPackageManager(cwd);
  const invocation = projectBinaryInvocation(manager, 'liteship', check.execution.argv);
  return [invocation.command, ...invocation.args].join(' ');
}

interface InputCorpus {
  readonly files: readonly string[];
  readonly digestOf: (relativePath: string) => string;
}

/** Walk once per profile run and digest matched files lazily across all checks. */
function createInputCorpus(cwd: string): InputCorpus {
  const absoluteByRelative = new Map<string, string>();
  for (const absolute of walkFiles(cwd, {
    skipDirs: ['.git', '.liteship', 'node_modules', 'dist', 'coverage'],
  })) {
    const rel = normalizeRepoPath(relative(cwd, absolute));
    absoluteByRelative.set(rel, absolute);
  }
  const files = [...absoluteByRelative.keys()].sort((a, b) => a.localeCompare(b));
  const digests = new Map<string, string>();
  return {
    files,
    digestOf(relativePath: string): string {
      const existing = digests.get(relativePath);
      if (existing !== undefined) return existing;
      const absolute = absoluteByRelative.get(relativePath);
      if (absolute === undefined) {
        throw IoError('check.cache-input', 'declared input disappeared while its cache identity was being built', {
          path: relativePath,
        });
      }
      const digest = sha256Hex(readFileSync(absolute));
      digests.set(relativePath, digest);
      return digest;
    },
  };
}

/** Canonical SHA-256 identity of one check's declared input bytes and toolchain. */
function checkCacheKey(
  check: CheckPlan['checks'][number],
  plan: CheckPlan,
  corpus: InputCorpus,
  env: Readonly<Record<string, string>>,
): string {
  const declaredPatterns =
    plan.context === 'repository'
      ? [
          ...check.inputs,
          'package.json',
          'pnpm-lock.yaml',
          'packages/cli/src/commands/check.ts',
          'packages/command/src/checks/**/*.ts',
        ]
      : [...check.inputs];
  const inputs = [...new Set(declaredPatterns)].map((pattern) => {
    const matcher = globToRegExp(normalizeRepoPath(pattern));
    const matches = corpus.files
      .filter((path) => matcher.test(path))
      .map((path) => ({ path, digest: corpus.digestOf(path) }));
    return { pattern: normalizeRepoPath(pattern), matches };
  });
  const bytes = CanonicalCbor.encode({
    schema: CHECK_CACHE_SCHEMA,
    id: check.id,
    command: check.command,
    ...(check.execution !== undefined ? { execution: check.execution } : {}),
    profile: plan.profile,
    platform: plan.platform,
    env,
    inputs,
  });
  return `check-sha256:${sha256Hex(bytes)}`;
}

function checkCachePath(key: string, cwd: string): string {
  return resolve(cwd, '.liteship', 'cache', 'checks', `${sha256Hex(key).slice(0, 32)}.json`);
}

/** Corrupt/old cache data is a miss; uncertain I/O never becomes a served verdict. */
function readCheckCache(key: string, cwd: string, id: string): CheckCacheEntry | null {
  const path = checkCachePath(key, cwd);
  if (!existsSync(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (
      error instanceof SyntaxError ||
      code === 'ENOENT' ||
      code === 'EACCES' ||
      code === 'EISDIR' ||
      code === 'EPERM'
    ) {
      return null;
    }
    throw error;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Partial<CheckCacheEntry>;
  if (
    candidate.schema !== CHECK_CACHE_SCHEMA ||
    candidate.key !== key ||
    candidate.id !== id ||
    candidate.verdict !== 'pass' ||
    !Array.isArray(candidate.findings) ||
    !candidate.findings.every((finding) => typeof finding === 'string')
  ) {
    return null;
  }
  return candidate as CheckCacheEntry;
}

/** Atomic cache write: a reader observes the old entry or the complete new one. */
function writeCheckCache(key: string, cwd: string, entry: CheckCacheEntry): void {
  const path = checkCachePath(key, cwd);
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.${sha256Hex(`${key}:${wallClock.now()}`).slice(0, 8)}.tmp`;
  writeFileSync(temp, JSON.stringify(entry), 'utf8');
  renameSync(temp, path);
}

function checkFailureFindings(command: string, timeoutMs: number, result: SpawnedCheck): string[] {
  const headline = result.error
    ? `${command} could not complete: ${result.error.message}`
    : result.signal
      ? `${command} terminated by signal ${result.signal} (ceiling ${timeoutMs}ms)`
      : `${command} exited with status ${result.status ?? 'unknown'}`;
  const diagnostics = boundedDiagnostics(result.stderr, result.stdout);
  return diagnostics === '' ? [headline] : [headline, diagnostics];
}

function boundedDiagnostics(stderr: string | Buffer | undefined, stdout: string | Buffer | undefined): string {
  const sections: string[] = [];
  const stderrText = outputText(stderr).trim();
  const stdoutText = outputText(stdout).trim();
  if (stderrText !== '') sections.push(`stderr:\n${stderrText}`);
  if (stdoutText !== '') sections.push(`stdout:\n${stdoutText}`);
  const combined = sections.join('\n');
  if (combined.length <= CHECK_OUTPUT_LIMIT) return combined;
  const omitted = combined.length - CHECK_OUTPUT_LIMIT;
  return `[output truncated: ${omitted} character(s) omitted]\n${combined.slice(-CHECK_OUTPUT_LIMIT)}`;
}

function outputText(value: string | Buffer | undefined): string {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : value.toString('utf8');
}

/** Minimal glob dialect needed by CheckDefinition.inputs (`*`, `**`, `?`). */
function globToRegExp(glob: string): RegExp {
  let source = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index]!;
    if (char === '*') {
      if (glob[index + 1] === '*') {
        index += 1;
        if (glob[index + 1] === '/') {
          index += 1;
          source += '(?:.*/)?';
        } else {
          source += '.*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += /[\\^$+.()|[\]{}]/.test(char) ? `\\${char}` : char;
    }
  }
  return new RegExp(`${source}$`);
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
  lines.push(
    report.blocked
      ? 'CHECK BLOCKED — a blocking check failed.'
      : report.ok
        ? 'CHECK OK — authoritative checks executed and passed.'
        : 'CHECK UNVERIFIED — no authoritative check executed.',
  );
  return lines.join('\n');
}

/**
 * The LEAN path (no `--ir`) — the IR-free, MCP-safe six-regex gate fold via
 * `@liteship/command`'s `check` handler. UNCHANGED behaviour: `@liteship/command` and
 * `@liteship/mcp-server` never see the IR. Projects the handler's `CheckPayload`.
 */
async function runLeanPath(cwd: string, handler: typeof checkGatesCommand.handler): Promise<CheckPayload> {
  // Inject the host-built SOUND AST detectors — the CLI deps `@liteship/audit`, so even the
  // lean (`@liteship/command`) check path gains parser-backed skip and early-return detection.
  // The MCP adapter builds the context WITHOUT them → the lean fallbacks; this keeps
  // `@liteship/audit` out of `@liteship/mcp-server`.
  const context = createNodeCommandContext({
    cwd,
    skipDetector: detectSkipsAST,
    earlyReturnDetector: detectEarlyReturnBeforeExpectAST,
  });
  const result = await handler({ name: 'check.gates', args: {} }, context);
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
