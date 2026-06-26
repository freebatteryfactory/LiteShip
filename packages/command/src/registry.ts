/**
 * The single canonical command registry (CUT A1). CLI listing, MCP `tools/list`,
 * `describe --format=mcp`, and `run()` dispatch all derive from one instance.
 *
 * @module
 */
import type {
  CapsuleCommandDescriptor,
  CapsuleCommandInvocation,
  CapsuleCommandResult,
  Clock,
  ContentAddress,
} from '@czap/core';
import { wallClock } from '@czap/core';
import type { GauntletResult } from '@czap/gauntlet';
import { ValidationError } from '@czap/error';

/**
 * Injected I/O surface for command handlers. Handlers receive their Node-coupled
 * dependencies here rather than reaching for globals, so the registry/handler
 * boundary stays declarative. Extended as handlers migrate into this package.
 */
export interface CommandContext {
  /** Working directory for path resolution; defaults to `process.cwd()` at the adapter. */
  readonly cwd?: string;
  /**
   * MONOTONIC clock for measuring command DURATIONS (e.g. compile `durationMs`).
   * Defaults to `@czap/core`'s `systemClock` (`performance.now`) at the call site.
   * Injected so a deterministic replay/test can thread a `manualClock`. This is a
   * DURATION boundary — never feed its reading into a `new Date()` / ISO stamp /
   * HLC (those are TIMESTAMPS and use the wall clock).
   */
  readonly clock?: Clock;
  /**
   * Capture a subprocess's stdout + exit code. Adapters back this with their
   * own spawn helper (e.g. @czap/cli's `spawnArgvCapture`); handlers stay free
   * of `node:child_process`. Absent in pure/test contexts — handlers must
   * degrade gracefully (treat as "not available").
   */
  readonly spawnCapture?: (
    command: string,
    args: readonly string[],
  ) => Promise<{ readonly exitCode: number; readonly stdout: string }>;
  /**
   * The host adapter's own czap version (its package version). Supplied by the
   * adapter because the version is a fact about the host, not this package.
   */
  readonly hostVersion?: () => string;
  /**
   * Raw capsule-manifest JSON text, or null when absent. The adapter resolves
   * the path (honoring CZAP_CAPSULE_MANIFEST) and reads it; the handler parses.
   * Keeps path/env policy on the adapter side.
   */
  readonly manifestSource?: () => string | null;
  /**
   * The resolved capsule-manifest path the adapter looked at (the path behind
   * {@link manifestSource}). Used by manifest-missing teaching errors to name
   * their subject; absent in pure/test contexts, where the errors degrade to
   * path-less wording.
   */
  readonly manifestPath?: () => string;
  /**
   * Run a capsule's generated test files and report the outcome. Adapters back
   * this with their vitest runner; handlers stay free of spawn.
   */
  readonly runVitest?: (
    testFiles: readonly string[],
  ) => Promise<{ readonly exitCode: number; readonly stderrTail: string }>;
  /**
   * Run the profile-driven audit engine (structure/integrity/surface) and return
   * a structured summary. Adapter-backed by `@czap/audit`, which is INJECTED here
   * (not imported) so `@czap/command` — and therefore `@czap/mcp-server` — never
   * takes a build edge on the TypeScript-compiler/fast-glob audit engine. Only
   * `@czap/cli` provides it; `audit` is not MCP-exposed, so the capability is
   * absent in the MCP context and the handler degrades to a structured failure.
   */
  readonly runAudit?: (input: {
    readonly profilePath?: string;
    readonly consumer?: boolean;
    readonly includeFindings?: boolean;
  }) => Promise<AuditEngineSummary>;
  /**
   * Run the audit-floor gate over the repo at `cwd`: run the artifact-independent
   * three-pass audit engine, collect the `rule@file` warning inventory, and diff
   * it against the pinned `AUDIT_WARNING_FLOOR`. Drift (added/removed warnings or
   * ANY error) fails the gate. Returns a structured verdict — no process.exit, no
   * stdout. Like {@link runAudit}, it is backed by the heavy `@czap/audit` engine,
   * so it is NOT provisioned in the shared host factory: only `@czap/cli` injects
   * it. `audit-floor` is therefore not MCP-exposed — over MCP the capability is
   * absent and the handler degrades to a structured failure (capabilityUnavailable).
   */
  readonly runAuditFloor?: () => Promise<AuditFloorSummary>;
  /**
   * Run the package-smoke release gate over the repo at `cwd`: `pnpm pack` every
   * publishable `@czap/*` scope, install the tarballs into an isolated consumer
   * fixture, assert no `workspace:` protocol leaked into the packed manifests, and
   * import-smoke every declared module specifier (plus the `czap` binstub).
   * Returns a structured pass/fail verdict — no process.exit, no stdout. Unlike
   * the `node:fs` scan gates (`runPlumb` / `runCheckInvariants`, host-provisioned
   * and MCP-exposed), this gate is a terminal-streaming SUBPROCESS orchestrator —
   * it spawns `pnpm pack` per package, `pnpm install`, `tar`, and `node` (minutes
   * of runtime, mutating a scratch tree under `os.tmpdir()`), in the same category
   * as `gauntlet`/`ship`. So like `runAuditFloor` it is NOT provisioned in the
   * shared host factory: only `@czap/cli` injects it, and the command is NOT
   * MCP-exposed — over MCP it degrades to a structured `capabilityUnavailable`.
   */
  readonly runPackageSmoke?: () => Promise<PackageSmokeSummary>;
  /**
   * Run the capsule-corpus gate over the repo at `cwd`: read the capsule
   * manifest, assert every capsule's generated test+bench files exist, classify
   * each generated bench's honesty (real | placeholder | typed-not-applicable),
   * confirm mtime-suspect capsules are NOT stale by regenerating into a temp dir
   * and byte-comparing, then run the whole `tests/generated/` suite. Returns a
   * structured verdict — no process.exit, no stdout. Like {@link runPackageSmoke}
   * (and unlike the pure `node:fs` scans `runPlumb` / `runCheckInvariants`), the
   * freshness confirmation spawns `capsule:compile` and the final pass spawns
   * `vitest` — a terminal-streaming SUBPROCESS orchestrator. So it is NOT
   * provisioned in the shared host factory: only `@czap/cli` injects it, and the
   * command is NOT MCP-exposed — over MCP it degrades to a structured
   * `capabilityUnavailable`.
   */
  readonly runCapsuleGate?: () => Promise<CapsuleGateSummary>;
  /**
   * Run the plumb-completeness gate over the repo at `cwd`: scan
   * `tests/generated/` for `*.skip` placeholders (each is a blocking lie about
   * coverage) and check every published package carries a `PACKAGE_PLUMB`
   * classification. Returns a structured verdict — no process.exit, no stdout.
   * Backed by `node:fs` directory scanning, so unlike `runAudit` (the heavy
   * `@czap/audit` engine) it is provisioned in the shared host factory
   * (`createNodeCommandContext`) and is therefore available to BOTH the CLI and
   * the MCP host — an agent can call `plumb` over MCP and read the work-list.
   */
  readonly runPlumb?: () => Promise<PlumbGateSummary>;
  /**
   * Run the fast-lane invariant gate over the repo at `cwd`: scan `packages/**`
   * source for banned patterns (require / module.exports / `var` / non-sanctioned
   * default export / hand-parsed signal axis) and check every committed text file
   * matches the `.gitattributes` eol policy. Returns a structured verdict — no
   * process.exit, no stdout. Backed by `node:fs` + a `git ls-files --eol` probe,
   * so like `runPlumb` (and unlike the heavy `@czap/audit` `runAudit` engine) it is
   * provisioned in the shared host factory (`createNodeCommandContext`) and is
   * therefore available to BOTH the CLI and the MCP host — an agent can call
   * `check-invariants` over MCP and read the grouped violation list.
   */
  readonly runCheckInvariants?: () => Promise<CheckInvariantsSummary>;
  /**
   * Run the PURE gauntlet engine fold (`litelaunchGauntlet`) over the repo at
   * `cwd`, IN-PROCESS — no subprocess, no terminal streaming. Binds the built-in
   * LiteShip gates, the committed assurance map, and the committed waivers, runs
   * the authority ratchet, and returns the structured {@link GauntletResult}
   * (findings + per-gate outcomes + a single blocking verdict). This is the
   * tasks-vs-gates distinction made real: `check` is the fixture-qualified gate
   * FOLD, whereas the CLI-owned `gauntlet` command spawns the 28-phase
   * `gauntlet:full` orchestrator. Backed by `@czap/gauntlet`'s `node:fs` glob,
   * so — like `runPlumb` / `runCheckInvariants`, and unlike the heavy `@czap/audit`
   * engine — it is provisioned in the shared host factory
   * (`createNodeCommandContext`) and is therefore available to BOTH the CLI and
   * the MCP host: an agent can call `check` over MCP and read the Finding[] work-list.
   *
   * `globs` scopes the file set (defaults to every package's source). The
   * adapter owns the waiver-expiry `now` — a WALL-CLOCK epoch Date, never a
   * monotonic reading — because waiver expiry is a calendar-date comparison.
   */
  readonly runGauntlet?: (globs?: readonly string[]) => Promise<GauntletResult>;
  /** Does a file exist? Adapter-backed (fs). Keeps handlers free of `node:fs`. */
  readonly fileExists?: (path: string) => boolean;
  /**
   * Load an asset's raw audio bytes (the adapter resolves source conventions +
   * reads the file). Null when no source file is found.
   */
  readonly loadAssetBytes?: (assetId: string, source?: string) => ArrayBuffer | null;
  /**
   * Run an audio projection over decoded bytes and return the marker count.
   * Adapter-backed by @czap/assets — injected (not imported) so @czap/command
   * does not yet take a domain-package build edge. (Heavy-tier decision: whether
   * command should depend on assets/scene directly, or keep injecting.)
   *
   * `assetId` (supplied by the asset.analyze handler) lets the adapter honor
   * the asset's OWN decoder (`AssetDecl.decoder`, resolved through the asset
   * registry) instead of hardwiring the audio built-in.
   */
  readonly runAudioProjection?: (
    bytes: ArrayBuffer,
    projection: 'beat' | 'onset' | 'waveform',
    assetId?: string,
  ) => Promise<number>;
  /**
   * Dynamically load a user scene module (the adapter owns the dynamic import,
   * keeping @czap/command free of it — relevant to the A1-T3 dynamic-import
   * audit). Null when the module can't be loaded.
   */
  readonly loadSceneModule?: (scenePath: string) => Promise<Record<string, unknown> | null>;
  /** Content-addressed receipt cache (adapter-backed; fs on the CLI side). */
  readonly cache?: CommandCache;
  /**
   * Execute a loaded scene module's compile function (the adapter runs it,
   * including any Effect). Keeps the `effect` runtime + arbitrary-user-code
   * execution out of @czap/command. Throws on compile failure.
   */
  readonly runSceneCompile?: (sceneModule: Record<string, unknown>) => Promise<void>;
  /**
   * Render a scene to the output path via the host's compositor + ffmpeg
   * pipeline, returning frame metrics. Adapter-backed (Compositor/VideoRenderer
   * + ffmpeg spawn); keeps the render backend out of @czap/command.
   */
  readonly renderScene?: (params: {
    readonly fps: number;
    readonly durationMs: number;
    readonly output: string;
    /** Render width in pixels; the host defaults to 1280 when absent. */
    readonly width?: number;
    /** Render height in pixels; the host defaults to 720 when absent. */
    readonly height?: number;
  }) => Promise<{ readonly frameCount: number; readonly elapsedMs: number }>;
  /** Read a file's raw bytes (adapter-backed; fs). Null when absent/unreadable. */
  readonly readFileBytes?: (path: string) => Uint8Array | null;
  /**
   * Decode a ShipCapsule from CBOR bytes (adapter runs the Effect). Returns the
   * capsule id + its claimed tarball-manifest address, or a decode error string.
   */
  readonly decodeShipCapsule?: (bytes: Uint8Array) => Promise<
    | {
        readonly ok: true;
        readonly id: ContentAddress;
        readonly tarballManifestAddress: { readonly display_id: string; readonly integrity_digest: string };
      }
    | { readonly ok: false; readonly error: string }
  >;
  /** Recompute a tarball's manifest address (adapter runs the Effect). */
  readonly recomputeTarballAddress?: (
    bytes: Uint8Array,
  ) => Promise<
    | { readonly ok: true; readonly display_id: string; readonly integrity_digest: string }
    | { readonly ok: false; readonly error: string }
  >;
}

/**
 * One audit finding — a structural mirror of `@czap/audit`'s `AuditFinding`,
 * declared here so the contract lives in `@czap/command` without an import of
 * the engine.
 */
export interface AuditEngineFinding {
  readonly id: string;
  readonly section: string;
  readonly rule: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly title: string;
  readonly summary: string;
  readonly location?: { readonly file: string; readonly line?: number; readonly column?: number };
  readonly metadata?: Record<string, unknown>;
}

/**
 * Structured summary returned by the injected {@link CommandContext.runAudit}
 * capability — a structural mirror of `@czap/audit`'s pass result, declared here
 * so the contract lives in `@czap/command` without an import of the engine.
 */
export interface AuditEngineSummary {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly findingCount: number;
  readonly suppressedCount: number;
  readonly passFindingCounts: {
    readonly structure: number;
    readonly integrity: number;
    readonly surface: number;
  };
  readonly repoRoot: string;
  readonly profileSource: 'default' | 'file' | 'consumer';
  /** Present only when the caller asked for findings (`--findings`). */
  readonly findings?: readonly AuditEngineFinding[];
}

/**
 * Structured verdict returned by the injected {@link CommandContext.runAuditFloor}
 * capability — the artifact-independent three-pass warning floor, diffed against
 * the pinned `AUDIT_WARNING_FLOOR`. `ok` ⟺ no warning drift (no added/removed
 * inventory keys) AND no errors. Declared here so the `audit-floor` command's
 * contract lives in `@czap/command` without an import of the heavy engine.
 */
export interface AuditFloorSummary {
  readonly ok: boolean;
  /** Number of pinned floor warnings (`AUDIT_WARNING_FLOOR.length`). */
  readonly expectedWarnings: number;
  /** Number of `rule@file` warning keys the engine actually surfaced. */
  readonly actualWarnings: number;
  /** Error-severity findings across all three passes — any error fails the gate. */
  readonly errorCount: number;
  /** Warning-inventory drift against the floor: `added` are new, `removed` are gone. */
  readonly delta: { readonly added: readonly string[]; readonly removed: readonly string[] };
  /** The sorted `rule@file` warning inventory the engine surfaced. */
  readonly inventory: readonly string[];
}

/**
 * Structured verdict returned by the injected {@link CommandContext.runPackageSmoke}
 * capability — the release-grade pack/install/import smoke. `ok` ⟺ every package
 * packed, installed, carried no `workspace:` leak, and every declared module
 * specifier (plus the `czap` binstub) resolved. `failedStep` + `failure` carry the
 * bracketed step label and message of the first failure (so a CI log identifies it
 * without artifact download). Declared here so the `package-smoke` command's
 * contract lives in `@czap/command` without an import of the heavy CLI engine.
 */
export interface PackageSmokeSummary {
  readonly ok: boolean;
  /** Number of `@czap/*` (+ unscoped) scopes packed via `pnpm pack`. */
  readonly packagesPacked: number;
  /** Number of module specifiers the import-smoke resolved (0 when it never ran). */
  readonly importsSmoked: number;
  /** The bracketed step label of the first failure, or null on success. */
  readonly failedStep: string | null;
  /** The failure message of the first failure, or null on success. */
  readonly failure: string | null;
}

/**
 * Bench-honesty classification across a capsule corpus — a structural mirror of
 * the gate engine's result, declared here so the `capsule-verify` command's
 * contract lives in `@czap/command` without a host import. `real` counts genuine
 * measurements AND typed not-applicable benches (a premise-guard body); every
 * name in `placeholder` is a comment-only bench measuring nothing (the bench
 * analogue of `it.skip` — green but covering nothing).
 */
export interface CapsuleBenchClassification {
  /** Number of generated bench files found. */
  readonly total: number;
  /** Benches with executable closure bodies — actually measuring something. */
  readonly real: number;
  /** Capsule names whose bench closure is empty/comment-only (no measurement). */
  readonly placeholder: readonly string[];
}

/**
 * Structured verdict returned by the injected {@link CommandContext.runCapsuleGate}
 * capability — the capsule-corpus freshness + bench-honesty + green-suite gate.
 * `status` is `ok` only when every generated test+bench exists, no committed file
 * is stale against a fresh regeneration, no bench is a lazy placeholder/drift, and
 * the whole generated suite passes; `stale` means a missing/stale/dishonest
 * artifact (run `capsule:compile`); `failed` means the generated tests ran red.
 * `errors` is the human work-list (empty on success). Declared here so the
 * `capsule-verify` command's contract lives in `@czap/command` without a host import.
 */
export interface CapsuleGateSummary {
  readonly status: 'ok' | 'stale' | 'failed';
  /** Human work-list: each blocking reason (missing/stale/dishonest/red). Empty on `ok`. */
  readonly errors: readonly string[];
  /** Number of capsules in the manifest the gate read. */
  readonly capsuleCount: number;
  /** Per-corpus bench-honesty classification. */
  readonly benches: CapsuleBenchClassification;
}

/**
 * One skipped generated test — a placeholder standing in for unwired work. A
 * structural mirror of the host scan's result item, declared here so the
 * `plumb` command's contract lives in `@czap/command` without a host import.
 */
export interface PlumbSkip {
  readonly file: string;
  /**
   * The detected skip TOKEN as it appears in source — the SAME alias-aware detector the
   * `no-skipped-test` gate uses (`@czap/gauntlet`'s `detectSkips`). Covers every form a
   * generated test can carry: the plain call (`it.skip` / `test.skip` / `describe.skip` /
   * `bench.skip` / `it.todo` / `xit`), the runtime-conditional (`it.skipIf` / `it.runIf`),
   * and the bare alias reference (`it.skip` behind a `COND ? it : it.skip` ternary). A
   * generated test must NEVER skip in ANY form — so all of them are caught here.
   */
  readonly kind: string;
  readonly message: string;
}

/**
 * Structured verdict returned by the injected {@link CommandContext.runPlumb}
 * capability. `ok` ⟺ generated corpus present AND no skips AND no unclassified
 * packages. `generatedPresent` is false when `tests/generated/` had no corpus
 * to scan (⇒ run capsule:compile).
 */
export interface PlumbGateSummary {
  readonly ok: boolean;
  /** Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking. */
  readonly skips: readonly PlumbSkip[];
  /** Published packages with no PACKAGE_PLUMB classification. */
  readonly unclassified: readonly string[];
  /** Whether the generated test corpus was present to scan. */
  readonly generatedPresent: boolean;
}

/**
 * One banned-pattern hit: a repo-relative `file`, 1-based `line`, and the trimmed
 * source `content`. A structural mirror of the host scan's result item, declared
 * here so the `check-invariants` command's contract lives in `@czap/command`
 * without a host import.
 */
export interface InvariantViolation {
  readonly file: string;
  readonly line: number;
  readonly content: string;
}

/** Every violation of one named invariant rule, with its human teaching `message`. */
export interface InvariantViolationGroup {
  readonly name: string;
  readonly message: string;
  readonly violations: readonly InvariantViolation[];
}

/**
 * Structured verdict returned by the injected {@link CommandContext.runCheckInvariants}
 * capability. `ok` ⟺ no banned-pattern violation in any rule AND no line-ending
 * policy violation. `groups` carries the per-rule violation lists; `lineEndings`
 * carries the `.gitattributes` eol offenders.
 */
export interface CheckInvariantsSummary {
  readonly ok: boolean;
  /** Banned-pattern violations, grouped by the rule that flagged them. */
  readonly groups: readonly InvariantViolationGroup[];
  /** Committed text files whose line endings violate the `.gitattributes` policy. */
  readonly lineEndings: readonly string[];
}

/** Idempotency key: command + structured inputs + force-bypass flag. */
export interface CommandCacheKey {
  readonly command: string;
  readonly inputs: Record<string, unknown>;
  readonly force: boolean;
}

/** A receipt cache the adapter backs (content-addressed on the CLI side). */
export interface CommandCache {
  readonly read: (key: CommandCacheKey) => unknown | null;
  readonly write: (key: CommandCacheKey, receipt: unknown) => void;
}

/** Name of an injectable {@link CommandContext} capability (everything but `cwd`). */
export type CommandCapability = Exclude<keyof CommandContext, 'cwd'>;

/**
 * The ONE structured failure for a missing injected capability. The dispatcher
 * emits it for unmet descriptor `requires`; handlers reuse it for capabilities
 * they only need conditionally. Exit code 2 — the dominant convention among the
 * per-handler absence checks this replaces (capsule.verify / scene.verify /
 * asset.verify all used 2; scene.render's 5 and asset.analyze's 1 were outliers).
 */
export function capabilityUnavailable(command: string, missing: readonly CommandCapability[]): CapsuleCommandResult {
  return {
    status: 'failed',
    command,
    timestamp: new Date(wallClock.now()).toISOString(),
    exitCode: 2,
    payload: {
      error: 'capability_unavailable',
      missing,
      hint: 'build the context with createNodeCommandContext() from @czap/command/host, or inject the missing capabilities into your CommandContext',
    },
  };
}

/** A command handler: structured invocation in, structured result out. No stdout, no argv. */
export interface CapsuleCommandHandler {
  (invocation: CapsuleCommandInvocation, context: CommandContext): Promise<CapsuleCommandResult>;
}

/**
 * A descriptor paired with its handler — the unit the registry indexes. The
 * handler is optional: a descriptor-only entry declares a command's identity in
 * the canonical catalog while its handler is still legacy-backed (routed by the
 * CLI's own dispatch) and pending migration into this package.
 */
export interface RegisteredCommand {
  readonly descriptor: CapsuleCommandDescriptor;
  readonly handler?: CapsuleCommandHandler;
}

/**
 * A fully-migrated command: descriptor + a guaranteed handler. Migrated command
 * modules type their export as this so adapters can invoke `.handler` directly
 * without a presence check. Assignable to {@link RegisteredCommand}.
 */
export interface HandledCommand extends RegisteredCommand {
  readonly handler: CapsuleCommandHandler;
}

interface CommandRegistryShape {
  readonly get: (name: string) => RegisteredCommand | undefined;
  readonly list: () => readonly CapsuleCommandDescriptor[];
}

function make(commands: readonly RegisteredCommand[]): CommandRegistryShape {
  const byName = new Map<string, RegisteredCommand>();
  for (const command of commands) {
    const { name } = command.descriptor;
    if (byName.has(name)) {
      throw ValidationError(
        'command.registry',
        `duplicate command name "${name}" — two RegisteredCommand entries share descriptor.name; check HANDLER_COMMANDS / CLI_OWNED_DESCRIPTORS in catalog.ts`,
      );
    }
    byName.set(name, command);
  }
  const descriptors = [...byName.values()]
    .map((command) => command.descriptor)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    get: (name) => byName.get(name),
    list: () => descriptors,
  };
}

export const CommandRegistry = { make };
export declare namespace CommandRegistry {
  export type Shape = CommandRegistryShape;
}
