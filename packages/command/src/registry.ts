/**
 * The single canonical command registry (CUT A1). CLI listing, MCP `tools/list`,
 * `describe --format=mcp`, and `run()` dispatch all derive from one instance.
 *
 * @module
 */
import type { CapsuleCommandDescriptor, CapsuleCommandInvocation, CapsuleCommandResult } from '@czap/core';

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
   * Run a capsule's generated test files and report the outcome. Adapters back
   * this with their vitest runner; handlers stay free of spawn.
   */
  readonly runVitest?: (
    testFiles: readonly string[],
  ) => Promise<{ readonly exitCode: number; readonly stderrTail: string }>;
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
   */
  readonly runAudioProjection?: (
    bytes: ArrayBuffer,
    projection: 'beat' | 'onset' | 'waveform',
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
  }) => Promise<{ readonly frameCount: number; readonly elapsedMs: number }>;
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
      throw new Error(`@czap/command: duplicate command name "${name}"`);
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
