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
  ContentAddress,
} from '@czap/core';

/**
 * Injected I/O surface for command handlers. Handlers receive their Node-coupled
 * dependencies here rather than reaching for globals, so the registry/handler
 * boundary stays declarative. Extended as handlers migrate into this package.
 */
export interface CommandContext {
  /** Working directory for path resolution; defaults to `process.cwd()` at the adapter. */
  readonly cwd?: string;
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
export function capabilityUnavailable(
  command: string,
  missing: readonly CommandCapability[],
): CapsuleCommandResult {
  return {
    status: 'failed',
    command,
    timestamp: new Date().toISOString(),
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
      throw new Error(
        `@czap/command: duplicate command name "${name}" — two RegisteredCommand entries share descriptor.name; check HANDLER_COMMANDS / CLI_OWNED_DESCRIPTORS in catalog.ts`,
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
