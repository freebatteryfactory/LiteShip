/**
 * CLI dispatch entry — accepts argv, emits a JSON receipt to stdout,
 * returns a process exit code.
 *
 * The verb table is a PROJECTION of the one canonical command catalog
 * (`@liteship/command`), not a hand-rolled switch:
 *   - CLI-orchestration commands (executionKind `cli-orchestration`) map to
 *     {@link CLI_EXECUTORS}, a record keyed by `CliOwnedName` (derived `as const`
 *     from the catalog). A missing executor is a COMPILE error; a stray one is
 *     dead-code flagged — the two surfaces cannot drift.
 *   - Handler-backed commands route through their thin CLI adapters (each of which
 *     builds a `CommandContext` and invokes the `@liteship/command` handler), so
 *     their exact receipt shapes and per-verb flag parsing are preserved verbatim.
 *
 * {@link assertDispatchCoversCatalog} verifies at module load that every top-level
 * verb in the catalog resolves to an executor, so adding a catalog command with no
 * executor fails fast instead of silently 404-ing at the CLI.
 *
 * @module
 */

import { COMMAND_CATALOG, CHECK_PROFILES, type CheckProfile, type CliOwnedName } from '@liteship/command';
import { InvariantViolationError } from '@liteship/error';
import { completion } from './commands/completion.js';
import { describe as describeCmd } from './commands/describe.js';
import { doctor } from './commands/doctor.js';
import { glossary } from './commands/glossary.js';
import { explain } from './commands/explain.js';
import { context } from './commands/context.js';
import { help } from './commands/help.js';
import { color, colorEnabled } from './lib/ansi.js';
import { sceneCompile } from './commands/scene-compile.js';
import { sceneDev } from './commands/scene-dev.js';
import { sceneRender } from './commands/scene-render.js';
import { sceneVerify } from './commands/scene-verify.js';
import { audit } from './commands/audit.js';
import { auditFloor } from './commands/audit-floor.js';
import { plumb } from './commands/plumb.js';
import { check } from './commands/check.js';
import { packageSmoke } from './commands/package-smoke.js';
import { checkInvariants } from './commands/check-invariants.js';
import { capsuleVerify as capsuleVerifyGate } from './commands/capsule-verify.js';
import { assetAnalyze } from './commands/asset-analyze.js';
import { assetVerify } from './commands/asset-verify.js';
import { astroDev } from './commands/astro-dev.js';
import { capsuleInspect, capsuleList, capsuleVerify } from './commands/capsule.js';
import { gauntlet } from './commands/gauntlet.js';
import { lsp, type ImportMcpServer } from './commands/lsp.js';
import { ship } from './commands/ship.js';
import { verify } from './commands/ship-verify.js';
import { sbom } from './commands/sbom.js';
import { dev } from './commands/dev.js';
import { build } from './commands/build.js';
import { info } from './commands/info.js';
import { add } from './commands/add.js';
import { readCliVersion, version } from './commands/version.js';
import { runGauntletWithRepoIR } from './lib/repo-ir-gauntlet.js';
import { emitError } from './receipts.js';

/**
 * Injectable command/engine seam for {@link run}. Every field defaults to the
 * real module, so production dispatch is byte-identical; tests substitute a fake
 * command (`doctor`) or a scripted engine (`runGauntletWithRepoIR`) to pin the
 * argv→options plumbing without running the heavy real path. Kept unexported and
 * off the public barrel so the api-surface snapshot is unchanged.
 */
interface RunDeps {
  readonly doctor?: typeof doctor;
  readonly runGauntletWithRepoIR?: typeof runGauntletWithRepoIR;
  /** The lean `@liteship/command` check handler, threaded into `check`'s default (lean) path. */
  readonly checkHandler?: NonNullable<Parameters<typeof check>[1]>['checkHandler'];
  /** The profile executor seam used by dispatch tests; production uses the real cached spawn runner. */
  readonly runCheckPlan?: NonNullable<Parameters<typeof check>[1]>['runCheckPlan'];
  /** The optional-sibling `@liteship/mcp-server` importer, threaded into the `mcp` + `lsp` skins. */
  readonly importMcpServer?: ImportMcpServer;
}

/** {@link RunDeps} with every default resolved — the shape each executor receives. */
interface ResolvedDeps {
  readonly doctor: typeof doctor;
  readonly runGauntletWithRepoIR: typeof runGauntletWithRepoIR;
  readonly checkHandler?: NonNullable<Parameters<typeof check>[1]>['checkHandler'];
  readonly runCheckPlan?: NonNullable<Parameters<typeof check>[1]>['runCheckPlan'];
  readonly importMcpServer: ImportMcpServer;
}

/** One verb's executor: the argv tail after the verb + the resolved deps → exit code. */
type Executor = (rest: readonly string[], deps: ResolvedDeps) => number | Promise<number>;

/**
 * Executors for the CLI-orchestration commands, keyed by `CliOwnedName` (derived
 * from the catalog's `CLI_OWNED_DESCRIPTORS`). The typed record is the projection
 * contract: a CLI-owned command declared in the catalog but missing here is a
 * COMPILE error, and an executor for a name not in the catalog is flagged as an
 * excess property. Each executor ports its verb's exact argv/flag parsing.
 */
const CLI_EXECUTORS: Record<CliOwnedName, Executor> = {
  help: () => help(),
  describe: (rest) => {
    const formatRaw = parseFlag(rest, '--format');
    const format = formatRaw === 'json' || formatRaw === 'mcp' ? formatRaw : undefined;
    // An unknown format must not silently fall through to JSON mode.
    if (formatRaw !== undefined && format === undefined) {
      emitError('describe', `expected format: json | mcp (got: ${formatRaw})`);
      return 1;
    }
    process.stdout.write(JSON.stringify(describeCmd({ format })) + '\n');
    return 0;
  },
  completion: (rest) => completion(rest[0]),
  check: execCheck,
  doctor: (rest, deps) => {
    // `--target` / `--deployed` are value-taking: neither may swallow a following
    // token that begins with `-` (that token is the NEXT flag). Before, `doctor
    // --deployed --fix` read deployed='--fix' and probed the literal string
    // "--fix" as a URL; `takeFlagValue` refuses it (F-PROTO-4).
    const target = takeFlagValue(rest, '--target');
    const deployed = takeFlagValue(rest, '--deployed');
    const targetRaw = target.value;
    if (target.present && targetRaw !== 'cloudflare' && targetRaw !== 'astro' && targetRaw !== 'consumer-app') {
      emitError('doctor', `expected target: cloudflare | astro | consumer-app (got: ${targetRaw ?? '<missing>'})`);
      return 1;
    }
    if (deployed.present && !deployed.value) {
      emitError('doctor', 'usage: liteship doctor --deployed <url>');
      return 1;
    }
    return deps.doctor({
      fix: rest.includes('--fix'),
      ci: rest.includes('--ci'),
      preflight: rest.includes('--preflight'),
      ...(targetRaw === 'cloudflare' || targetRaw === 'astro' || targetRaw === 'consumer-app'
        ? { target: targetRaw }
        : {}),
      ...(deployed.value ? { deployed: deployed.value } : {}),
    });
  },
  gauntlet: (rest) => gauntlet(rest),
  ship: (rest) => ship(rest),
  sbom: (rest) => sbom(rest),
  mcp: async (rest, deps) => {
    // @liteship/mcp-server is an optional sibling install, not a dependency of
    // @liteship/cli — an unguarded import would break the one-JSON-line-on-stderr
    // contract with a raw ERR_MODULE_NOT_FOUND stack trace.
    let mcpServer: { start: (opts: { readonly http?: string }) => Promise<void> };
    try {
      mcpServer = await deps.importMcpServer();
    } catch (err) {
      // Node puts ERR_MODULE_NOT_FOUND on err.code; wrapping loaders
      // (custom ESM hooks, test harnesses) carry the original on cause.
      const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
      if (code !== 'ERR_MODULE_NOT_FOUND') throw err;
      // Derive the install hint from the CLI's OWN version so the sibling
      // MCP server lands on the same minor line — a hard-coded pin drifts
      // every release and desyncs the command/tool schemas (Codex P2, #45).
      const [major, minor] = readCliVersion().split('.');
      emitError(
        'mcp',
        '@liteship/mcp-server is not installed',
        `Install it next to @liteship/cli on the same version line: pnpm add @liteship/mcp-server@${major}.${minor}.x`,
      );
      return 1;
    }
    const httpFlag = parseFlag(rest, '--http');
    await mcpServer.start(httpFlag !== undefined ? { http: httpFlag } : {});
    return 0;
  },
  lsp: (rest, deps) =>
    // The THIRD JSON-RPC skin: launch the gauntlet LSP rigor server over stdio
    // (the editor spawns `liteship lsp` as its language server). The runner is built
    // in the CLI host and injected, so @liteship/mcp-server stays lean — see
    // commands/lsp.ts. `--ir` selects the IR-enriched fold.
    lsp(
      { ir: rest.includes('--ir') },
      { runGauntletWithRepoIR: deps.runGauntletWithRepoIR, importMcpServer: deps.importMcpServer },
    ),
  'scene.dev': (subRest) => {
    // A missing positional must not flow downstream as '' (it surfaces there as a
    // blank-subject error like "scene not found: ").
    const scene = positional(subRest);
    if (scene === undefined) {
      emitError('scene.dev', 'usage: liteship scene dev <path-to-scene.ts>');
      return 1;
    }
    return sceneDev(scene);
  },
  'astro.dev': () => astroDev('dev'),
  'astro.status': () => astroDev('status'),
  'astro.stop': () => astroDev('stop'),
  dev: (rest) => {
    // `--example <name>` in either `--example=x` or `--example x` form.
    const example = takeFlagValue(rest, '--example').value;
    return dev({
      ...(example !== undefined ? { example } : {}),
      tutorial: rest.includes('--tutorial'),
    });
  },
  build: () => build(),
  info: (rest) => info({ json: rest.includes('--json') }),
  add: (rest) => {
    const kind = positional(rest);
    const name = rest[1] !== undefined && !rest[1].startsWith('-') ? rest[1] : undefined;
    return add({
      ...(kind !== undefined ? { kind } : {}),
      ...(name !== undefined ? { name } : {}),
    });
  },
};

/** `scene <sub>` — scene.dev is CLI-owned; compile/verify/render are handler-backed. */
function execScene(rest: readonly string[], deps: ResolvedDeps): number | Promise<number> {
  const [sub, ...subRest] = rest;
  const scene = positional(subRest);
  if (sub === 'dev') return CLI_EXECUTORS['scene.dev'](subRest, deps);
  if (sub === 'compile' || sub === 'verify' || sub === 'render') {
    // A missing positional must not flow downstream as '' (it surfaces there as a
    // blank-subject error like "scene not found: ").
    if (scene === undefined) {
      emitError(
        `scene.${sub}`,
        `usage: liteship scene ${sub} <path-to-scene.ts>${sub === 'render' ? ' [-o <output.mp4>]' : ''}`,
      );
      return 1;
    }
  }
  if (sub === 'compile') return sceneCompile(scene ?? '');
  if (sub === 'render') {
    // Both space forms (-o X, --output X) and the `--output=X` equals form parse
    // through one rule (`takeFlagValue`). A present `-o`/`--output` with no value
    // — end of argv, or a following token that is itself a flag — errors instead
    // of silently discarding the user's path (with output now DERIVED when empty).
    const output = takeFlagValue(subRest, ['-o', '--output']);
    if (output.present && output.value === undefined) {
      emitError('scene.render', 'usage: liteship scene render <path-to-scene.ts> -o <output.mp4>');
      return 1;
    }
    const force = subRest.includes('--force');
    // Empty output is the "derive <scene>.mp4" default, resolved in @liteship/command.
    return sceneRender(scene ?? '', output.value ?? '', force);
  }
  if (sub === 'verify') return sceneVerify(scene ?? '');
  emitError('scene', `unknown subcommand: ${sub ?? '<missing>'}`);
  return 1;
}

/** `astro <sub>` — dev/status/stop are all CLI-owned background dev-server verbs. */
function execAstro(rest: readonly string[], deps: ResolvedDeps): number | Promise<number> {
  const [sub] = rest;
  if (sub === 'dev' || sub === 'status' || sub === 'stop') {
    return CLI_EXECUTORS[`astro.${sub}`](rest, deps);
  }
  emitError('astro', `unknown subcommand: ${sub ?? '<missing>'}`);
  return 1;
}

/** `asset <sub>` — analyze/verify are handler-backed. */
function execAsset(rest: readonly string[]): number | Promise<number> {
  const [sub, ...subRest] = rest;
  const id = positional(subRest);
  if (sub === 'analyze') {
    if (id === undefined) {
      emitError('asset.analyze', 'usage: liteship asset analyze <asset-id> --projection=<beat|onset|waveform>');
      return 1;
    }
    const projectionRaw = parseFlag(subRest, '--projection');
    if (projectionRaw === undefined) {
      emitError(
        'asset.analyze',
        'missing --projection. Choose one: --projection=beat | onset | waveform. Example: liteship asset analyze kick-loop --projection=beat',
      );
      return 1;
    }
    if (projectionRaw !== 'beat' && projectionRaw !== 'onset' && projectionRaw !== 'waveform') {
      emitError('asset.analyze', `expected projection: beat | onset | waveform (got: ${projectionRaw})`);
      return 1;
    }
    const force = subRest.includes('--force');
    return assetAnalyze(id, projectionRaw, force);
  }
  if (sub === 'verify') {
    if (id === undefined) {
      emitError('asset.verify', 'usage: liteship asset verify <asset-id>');
      return 1;
    }
    return assetVerify(id);
  }
  emitError('asset', `unknown subcommand: ${sub ?? '<missing>'}`);
  return 1;
}

/** `capsule <sub>` — inspect/verify/list are handler-backed. */
function execCapsule(rest: readonly string[]): number | Promise<number> {
  const [sub, ...subRest] = rest;
  const name = positional(subRest);
  if (sub === 'inspect' || sub === 'verify') {
    if (name === undefined) {
      emitError(`capsule.${sub}`, `usage: liteship capsule ${sub} <capsule-name>`);
      return 1;
    }
    return sub === 'inspect' ? capsuleInspect(name) : capsuleVerify(name);
  }
  if (sub === 'list') return capsuleList(parseFlag(subRest, '--kind'));
  emitError('capsule', `unknown subcommand: ${sub ?? '<missing>'}`);
  return 1;
}

/** `audit [--profile <p>] [--consumer] [--consumer-app] [--findings]` — handler-backed. */
function execAudit(rest: readonly string[]): Promise<number> {
  // `--profile <name>` is value-taking — the same swallow guard as doctor's
  // flags: `audit --profile --consumer` must not read profile='--consumer'.
  const profile = takeFlagValue(rest, '--profile').value;
  const consumer = rest.includes('--consumer');
  const consumerApp = rest.includes('--consumer-app');
  const findings = rest.includes('--findings');
  return audit({
    ...(profile ? { profile } : {}),
    ...(consumer ? { consumer } : {}),
    ...(consumerApp ? { consumerApp: true } : {}),
    ...(findings ? { findings } : {}),
  });
}

/** `check [gates] [--plan] [--profile <p>] [--json] [--ir] [gate flags]`. */
function execCheck(rest: readonly string[], deps: ResolvedDeps): Promise<number> {
  const subcommand = positional(rest);
  if (subcommand !== undefined && subcommand !== 'gates') {
    emitError('check', `expected subcommand: gates (got: ${subcommand})`);
    return Promise.resolve(1);
  }
  const gates = subcommand === 'gates';
  // `--plan` is the PURE projection surface: print the ordered check plan for
  // `--profile` and run nothing. `--json` selects machine output (a JSON plan under
  // `--plan`; a receipt-only, no-pretty-summary run otherwise). `--profile <p>` picks
  // the profile the plan projects (default quick), validated against the closed set.
  const plan = rest.includes('--plan');
  const json = rest.includes('--json');
  const profileFlag = takeFlagValue(rest, '--profile');
  if (
    profileFlag.present &&
    (profileFlag.value === undefined || !CHECK_PROFILES.includes(profileFlag.value as CheckProfile))
  ) {
    emitError('check', `expected profile: ${CHECK_PROFILES.join(' | ')} (got: ${profileFlag.value ?? '<missing>'})`);
    return Promise.resolve(1);
  }
  const profile = profileFlag.value as CheckProfile | undefined;
  // `check gates --ir` opts into the CLI-ONLY IR-enriched path (the triangulated
  // oracle-divergence cross-check + the B2 verdict cache via @liteship/audit);
  // `--no-cache` bypasses that cache. WITHOUT `--ir`, `liteship check gates` stays
  // the lean, IR-free, MCP-safe fold (the MCP server exposes only that
  // lean handler — `--ir` never crosses into @liteship/command / @liteship/mcp-server).
  const ir = rest.includes('--ir');
  const noCache = rest.includes('--no-cache');
  // `--symbols` adds the heavy symbol-evidenced LanguageService oracle (B3.3) —
  // only meaningful with `--ir`; the cache key is namespaced by this mode.
  const symbols = rest.includes('--symbols');
  // `--supply-chain` composes the avionics-tier supplyChainGate (Slice C, L4) on
  // + injects the host-computed supply-chain facts — only meaningful with `--ir`;
  // opt-in (no SBOM cost + no not-evidenced noise on the default `--ir` run); the
  // cache key is namespaced by this mode (mirrors --symbols).
  const supplyChain = rest.includes('--supply-chain');
  // `--mutate` composes the avionics-tier mutationDivergenceGate (Slice C, L4) on
  // + runs the per-mutant vitest runner over the live effective-L4 trust-spine
  // seams (each mutant → an isolated subprocess; the score's survivors surface as
  // findings). Only meaningful with `--ir`; opt-in (a covering-test suite run per
  // mutant is HEAVY); the cache key is namespaced by this mode. It mutates real
  // source files IN PLACE (verified-restored), so it must run in ISOLATION.
  const mutate = rest.includes('--mutate');
  // `--mcdc` composes the avionics-tier mcdcCoverageGate (L4 — DO-178B Level A's
  // Modified Condition/Decision Coverage via CONDITION-LEVEL MUTATION) on + runs the
  // per-pin vitest runner over the live effective-L4 trust-spine seams: each atomic
  // condition's force-true/force-false pin → an isolated subprocess; a condition whose
  // independent effect is unobserved (a surviving pin) surfaces as an MC/DC-gap finding
  // (L4 demands full MC/DC). Only meaningful with `--ir`; opt-in (a covering-test suite
  // run per pin, two per condition, is HEAVY); the cache key is namespaced by this
  // mode. It mutates real source files IN PLACE (verified-restored), so it must run in
  // ISOLATION.
  const mcdc = rest.includes('--mcdc');
  // `--simulate` composes the avionics-tier simulationDeterminismGate (L4 — the
  // determinism spine, DST) on + drives the committed scenario corpus through the
  // `@liteship/core/simulation` seeded world (each scenario replayed twice; a
  // byte-exact divergence is a real nondeterminism bug surfaced as an L4 finding
  // carrying the seed). Only meaningful with `--ir`; opt-in (no not-evidenced
  // advisory on the default `--ir` run); the cache key is namespaced by this mode.
  const simulate = rest.includes('--simulate');
  // `--taint` composes the taintFlowGate (the TAINT-ANALYSIS family, L4) on + traces
  // the source→sink dataflow via @liteship/audit's generic taint oracle, classified by
  // the LiteShip-LOCAL source/sink/sanitizer registry the CLI injects (the shader
  // fetch→compile, the AI-cast graph-apply, the runtime-URL SSRF seam). An
  // UNSANITIZED untrusted-value→dangerous-sink flow is a finding. Only meaningful
  // with `--ir`; opt-in (a whole-corpus ts.Program + checker trace is HEAVY); the
  // cache key is namespaced by this mode.
  const taint = rest.includes('--taint');
  // `--proof` composes the proofPropagationGate (the LOCAL-VS-GLOBAL correctness
  // family — the lax-functor, L4) on + reads the proof signals (mutation/coverage/
  // property/invariant), blends a per-module scalar, and propagates it along the dep
  // DAG (the min-fixpoint): a trust-spine module whose GLOBAL proof drops below its
  // floor via a weak dependency is a finding. Only meaningful with `--ir`; opt-in
  // (LIGHT — artifact reads + a corpus scan); the cache key is namespaced by this mode.
  const proof = rest.includes('--proof');
  // `--composition` composes the compositionCoverageGate (the LOCAL-VS-GLOBAL family —
  // "locally green, globally untested interaction", L4) on + derives the interaction
  // edges from the IR call graph (both endpoints individually tested) and classifies
  // each integration-covered/uncovered (the sound static-reference proxy): an UNCOVERED
  // trust-spine interaction edge is a finding. Only meaningful with `--ir`; opt-in
  // (LIGHT — a corpus scan); the cache key is namespaced by this mode.
  const composition = rest.includes('--composition');
  // `--capability-gate` composes the capabilityGateLinkGate (codex round-8, #1b — the
  // capability-link dataflow proof, L4) on + proves every sanctioned skip's guard DERIVES FROM its
  // declared capability's probe (the canonical capability symbol table); an unrelated/mislabeled
  // guard is a finding. Only meaningful with `--ir`; opt-in (a ts.Program over the sanctioned
  // files + capability modules); the cache key is namespaced by this mode.
  const capabilityGate = rest.includes('--capability-gate');
  // `--spine-relation` composes the spineRelationGate (Wave 8.5, the public constitution's
  // STATIC-projection half, L4) on + probes each admitted @liteship/_spine mirror type's
  // bidirectional assignability against its runtime source (a ts.Program probe over the
  // spine + runtime surface): a mirror whose observed relation no longer satisfies its
  // admitted (frozen) relation, or no longer resolves, is a public-contract drift finding.
  // Only meaningful with `--ir`; opt-in (a second ts.Program build, ~3.25s, is HEAVY) but
  // REQUIRED in the release/CI profile; the cache key is namespaced by this mode.
  const spineRelation = rest.includes('--spine-relation');
  const hasGateFlag =
    ir ||
    symbols ||
    supplyChain ||
    mutate ||
    mcdc ||
    simulate ||
    taint ||
    proof ||
    composition ||
    capabilityGate ||
    spineRelation;
  if (hasGateFlag && !gates) {
    emitError('check', 'gate-only flags require the explicit `check gates` subcommand');
    return Promise.resolve(1);
  }
  if ((gates || hasGateFlag) && (plan || profile !== undefined)) {
    emitError('check', 'gate mode cannot be combined with --plan or --profile');
    return Promise.resolve(1);
  }
  // `--no-cache` / `--symbols` / `--supply-chain` / `--mutate` / `--simulate` /
  // `--taint` / `--proof` / `--composition` / `--capability-gate` / `--spine-relation` are
  // only meaningful on the IR path (the lean path has no cache + no IR). A bare flag there
  // is a no-op, never a silent wrong run.
  return check(
    {
      ...(plan ? { plan } : {}),
      ...(json ? { json } : {}),
      ...(profile ? { profile } : {}),
      ...(gates ? { gates } : {}),
      ...(ir ? { ir } : {}),
      ...(noCache ? { noCache } : {}),
      ...(symbols ? { symbols } : {}),
      ...(supplyChain ? { supplyChain } : {}),
      ...(mutate ? { mutate } : {}),
      ...(mcdc ? { mcdc } : {}),
      ...(simulate ? { simulate } : {}),
      ...(taint ? { taint } : {}),
      ...(proof ? { proof } : {}),
      ...(composition ? { composition } : {}),
      ...(capabilityGate ? { capabilityGate } : {}),
      ...(spineRelation ? { spineRelation } : {}),
    },
    {
      runGauntletWithRepoIR: deps.runGauntletWithRepoIR,
      ...(deps.checkHandler ? { checkHandler: deps.checkHandler } : {}),
      ...(deps.runCheckPlan ? { runCheckPlan: deps.runCheckPlan } : {}),
    },
  );
}

/** Grouped verbs whose subcommand parsing lives in a dedicated executor. */
const GROUPED_EXECUTORS: Record<string, Executor> = {
  scene: execScene,
  astro: execAstro,
  asset: (rest) => execAsset(rest),
  capsule: (rest) => execCapsule(rest),
};

/** Flat handler-backed verbs — each routes to its thin CLI adapter (receipt shape preserved). */
const HANDLER_EXECUTORS: Record<string, Executor> = {
  glossary: (rest) => glossary(rest[0] && !rest[0].startsWith('-') ? rest[0] : null),
  explain: (rest) => explain(positional(rest) ?? null, { json: rest.includes('--json') }),
  context: (rest) => context(takeFlagValue(rest, '--task').value ?? null, { json: rest.includes('--json') }),
  version: () => version(),
  audit: (rest) => execAudit(rest),
  'audit-floor': () => auditFloor(),
  plumb: () => plumb(),
  'check-invariants': () => checkInvariants(),
  'package-smoke': (rest) => packageSmoke({ hermetic: rest.includes('--hermetic') }),
  'capsule-verify': () => capsuleVerifyGate(),
  verify: (rest) => verify(rest),
};

/**
 * Resolve a normalized top-level verb to its executor. Grouped verbs
 * (scene/asset/capsule/astro) sub-dispatch; flat CLI-owned verbs come from
 * {@link CLI_EXECUTORS}; flat handler-backed verbs from {@link HANDLER_EXECUTORS}.
 * `undefined` ⟺ the verb is not in the catalog.
 */
function resolveExecutor(verb: string): Executor | undefined {
  if (Object.prototype.hasOwnProperty.call(GROUPED_EXECUTORS, verb)) return GROUPED_EXECUTORS[verb];
  // A dotless verb that is a CLI-owned command name (the dotted scene.dev /
  // astro.* keys are reached only via their grouped executor, never typed directly).
  if (!verb.includes('.') && Object.prototype.hasOwnProperty.call(CLI_EXECUTORS, verb)) {
    return CLI_EXECUTORS[verb as CliOwnedName];
  }
  if (Object.prototype.hasOwnProperty.call(HANDLER_EXECUTORS, verb)) return HANDLER_EXECUTORS[verb];
  return undefined;
}

/** The distinct top-level verbs the catalog declares (first segment of each command name). */
function catalogTopLevelVerbs(): readonly string[] {
  return [...new Set(COMMAND_CATALOG.map((d) => d.name.split('.')[0]!))];
}

/**
 * Introspection seam for the catalog-parity test
 * (tests/unit/cli/dispatch-catalog-parity.test.ts). These are deliberately NOT
 * re-exported from the CLI barrel (`index.ts` exports only `run`), so the
 * api-surface / type-export snapshots are unaffected — they are read-only
 * projections of the private dispatch tables, letting the test prove
 * dispatch == catalog without duplicating the tables.
 */

/** Every CLI-orchestration executor name (the `CLI_EXECUTORS` keys, incl. the dotted scene/astro subverbs). */
export function cliExecutorNames(): readonly string[] {
  return Object.keys(CLI_EXECUTORS);
}

/** The distinct top-level verbs dispatch can resolve (grouped + flat CLI-owned + handler-backed). */
export function dispatchableTopLevelVerbs(): readonly string[] {
  return [
    ...new Set([
      ...Object.keys(GROUPED_EXECUTORS),
      ...Object.keys(CLI_EXECUTORS).filter((name) => !name.includes('.')),
      ...Object.keys(HANDLER_EXECUTORS),
    ]),
  ];
}

/** Resolve a top-level verb to its executor, or `undefined` when the verb is not routed. */
export function resolveDispatchExecutor(verb: string): boolean {
  return resolveExecutor(verb) !== undefined;
}

/**
 * Fail fast at module load if the dispatch table is not a total projection of the
 * catalog: every top-level verb the catalog declares MUST resolve to an executor.
 * This is what makes "dispatch is a projection of the catalog" a guarantee rather
 * than a hope — a catalog command added without an executor breaks import (and the
 * CLI test suite) instead of silently 404-ing at runtime.
 */
function assertDispatchCoversCatalog(): void {
  const uncovered = catalogTopLevelVerbs().filter((verb) => resolveExecutor(verb) === undefined);
  if (uncovered.length > 0) {
    throw InvariantViolationError(
      'cli.dispatch',
      `dispatch has no executor for catalog verb(s): ${uncovered.join(', ')} — add one to CLI_EXECUTORS / HANDLER_EXECUTORS / GROUPED_EXECUTORS in dispatch.ts`,
    );
  }
}

assertDispatchCoversCatalog();

/** Run the CLI with the given argv slice. Returns a process exit code. */
export async function run(argv: readonly string[], deps: RunDeps = {}): Promise<number> {
  const resolved: ResolvedDeps = {
    doctor: deps.doctor ?? doctor,
    runGauntletWithRepoIR: deps.runGauntletWithRepoIR ?? runGauntletWithRepoIR,
    importMcpServer: deps.importMcpServer ?? (() => import('@liteship/mcp-server')),
    ...(deps.checkHandler ? { checkHandler: deps.checkHandler } : {}),
    ...(deps.runCheckPlan ? { runCheckPlan: deps.runCheckPlan } : {}),
  };
  const [rawCmd, ...rest] = argv;
  const cmd = normalizeTopLevel(rawCmd);

  // No command + no flags: friendly help on stdout, exit 0.
  if (cmd === undefined) return help();

  const executor = resolveExecutor(cmd);
  if (executor === undefined) {
    // Friendly text first; structured JSON envelope last so machine
    // consumers can read it as the trailing line of stderr.
    const on = colorEnabled();
    process.stderr.write(
      `${color('red', 'Unknown command:', on)} \`${rawCmd}\`.\nTry \`${color('cyan', 'liteship help', on)}\` for the chart.\n`,
    );
    process.stderr.write(JSON.stringify({ error: 'unknown_command', command: rawCmd }) + '\n');
    return 1;
  }

  return executor(rest, resolved);
}

/**
 * Normalize top-level argv[0]. Standard help/version flags fold into
 * their verb counterparts so `liteship --help` and `liteship -h` behave like
 * `liteship help`. Returns the input unchanged otherwise.
 */
function normalizeTopLevel(raw: string | undefined): string | undefined {
  if (raw === '--help' || raw === '-h') return 'help';
  if (raw === '--version' || raw === '-V' || raw === '-v') return 'version';
  return raw;
}

/** Parse a `--flag=value` style option out of the argv tail. Returns undefined if absent. */
function parseFlag(argv: readonly string[], flag: string): string | undefined {
  for (const a of argv) {
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return undefined;
}

/** A value-taking flag read from argv: whether it appeared at all, and its parsed value (if any). */
interface FlagValue {
  /** The flag token appeared (either `--flag=…` or a bare `--flag`). */
  readonly present: boolean;
  /**
   * The parsed value — `undefined` when the flag is absent OR is present in space
   * form with no usable value (end of argv, or the next token is itself a flag).
   * Callers tell "omitted" (`!present`) apart from "given without a value"
   * (`present && value === undefined`).
   */
  readonly value: string | undefined;
}

/**
 * Read a value-taking flag from argv in either the `--flag=value` or the
 * `--flag value` space form. One or more names may be given so aliases
 * (`['-o', '--output']`) resolve through the same rule.
 *
 * The load-bearing rule (F-PROTO-4): a space-form flag must NEVER consume a
 * following token that begins with `-`. That token is the NEXT flag, not this
 * flag's value — so `doctor --deployed --fix` reads as "--deployed with no value"
 * (a clean usage error), not "--deployed=--fix" (which then probed the literal
 * string "--fix" as a URL). This is the guard the scene-render `-o` path already
 * had, lifted into one shared parser for every value-taking flag.
 */
function takeFlagValue(argv: readonly string[], flag: string | readonly string[]): FlagValue {
  const names = typeof flag === 'string' ? [flag] : flag;
  for (const a of argv) {
    for (const name of names) {
      if (a.startsWith(`${name}=`)) return { present: true, value: a.slice(name.length + 1) };
    }
  }
  const idx = argv.findIndex((a) => names.includes(a));
  if (idx < 0) return { present: false, value: undefined };
  const next = argv[idx + 1];
  if (next === undefined || next.startsWith('-')) return { present: true, value: undefined };
  return { present: true, value: next };
}

/** First positional argument: argv[0] only when present and not a flag. */
function positional(argv: readonly string[]): string | undefined {
  const first = argv[0];
  return first !== undefined && !first.startsWith('-') ? first : undefined;
}
