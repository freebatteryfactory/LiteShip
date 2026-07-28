/**
 * createNodeCommandContext — the ONE shared host CommandContext factory. Both
 * the CLI and MCP adapters build their injected I/O from this, so a command
 * runs identically whichever protocol skin invoked it. This is the Node host
 * execution surface; the pure `@liteship/command` main entry never imports it.
 *
 * It provides every host capability the finite handlers need EXCEPT the ones
 * that are genuinely adapter-specific (e.g. the CLI's own `hostVersion`, or
 * verify's `tarballManifestAddress` which lives in the CLI's ship-manifest) —
 * those the adapter spreads on top.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Compositor, createVideoRenderer, wallClock, type Millis } from '@liteship/core';
import { audioDecoder, detectBeats, detectOnsets, computeWaveform } from '@liteship/assets';
import { IoError, ValidationError } from '@liteship/error';
import { litelaunchGauntlet, type EarlyReturnMatch, type SkipMatch } from '@liteship/gauntlet';
import type { CommandContext } from '../registry.js';
import { spawnArgvCapture } from './spawn.js';
import { VitestRunner } from './vitest-runner.js';
import { renderWithFfmpeg } from './ffmpeg.js';
import { tryReadCache, writeCache } from './idempotency.js';
import { getCapsuleManifestPath } from './manifest-path.js';
import {
  applicationCheckGovernanceFacts,
  buildCheckGovernanceFacts,
  hasCheckGovernanceSurface,
} from './check-governance.js';
import { runPlumbScan } from './plumb-scan.js';

/** Render-dimension fallbacks when the scene contract carries no width/height. */
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/**
 * Build the shared Node host context. Pass the adapter's `cwd` so EVERY path
 * capability resolves against it (manifest, cache, file reads, asset/scene
 * loading, LITESHIP_CAPSULE_MANIFEST) — not just manifest + cache.
 *
 * `skipDetector` and `earlyReturnDetector` are OPTIONAL host-built SOUND AST detectors
 * (`@liteship/audit`'s `detectSkipsAST` / `detectEarlyReturnBeforeExpectAST`). They are
 * injected by the ADAPTER, not imported here: `@liteship/command` must NOT depend on
 * `@liteship/audit` (it would drag the TS compiler into `@liteship/mcp-server`). So the CLI
 * adapter — which already deps `@liteship/audit` — passes them, and the in-process
 * `runGauntlet` (`liteship check`) gains parser-backed skip and early-return detection. The
 * MCP adapter omits them → the lean token fallback (the documented degradation, exactly
 * like `runCheckInvariants`, which is likewise CLI-only because it needs `@liteship/audit`).
 */
export function createNodeCommandContext(
  opts: {
    readonly cwd?: string;
    readonly skipDetector?: (source: string) => readonly SkipMatch[];
    readonly earlyReturnDetector?: (source: string) => readonly EarlyReturnMatch[];
    /**
     * Adapter-supplied capability overrides merged OVER the shared defaults, so a
     * CLI adapter builds its context purely as `createNodeCommandContext({ …overrides })`
     * instead of hand-writing an inline `CommandContext` literal. Every provided
     * key wins over the default of the same name; keys absent here keep the shared
     * host implementation. This is how the CLI injects the heavy `@liteship/audit`-backed
     * gates (`runAuditFloor`, `runPackageSmoke`, `runCapsuleGate`, `runCheckInvariants`)
     * and the vitest runner (`runVitest`) that are NOT provisioned in the shared
     * factory — over MCP those stay absent and the handlers degrade structurally.
     */
    readonly overrides?: Partial<Omit<CommandContext, 'cwd'>>;
  } = {},
): CommandContext {
  const cwd = opts.cwd ?? process.cwd();
  const resolveFrom = (path: string): string => resolve(cwd, path);

  /** Load an asset's raw bytes: manifest-declared `source` first, then the examples/scenes/<id>.wav convention. */
  const loadAssetBytes = (assetId: string, source?: string): ArrayBuffer | null => {
    const candidates = [source ? resolveFrom(source) : '', resolveFrom(`examples/scenes/${assetId}.wav`)].filter(
      (p) => p && existsSync(p),
    );
    if (candidates.length === 0) return null;
    // Slice out of Node's Buffer pool — `.buffer` alone is the shared pool allocation.
    const bytes = readFileSync(candidates[0]!);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  };

  const base: CommandContext = {
    cwd: opts.cwd,
    spawnCapture: async (command, args) => {
      const r = await spawnArgvCapture(command, args).catch(() => null);
      return r ? { exitCode: r.exitCode, stdout: r.stdout } : { exitCode: 1, stdout: '' };
    },
    manifestSource: () => {
      const path = getCapsuleManifestPath(opts.cwd);
      return existsSync(path) ? readFileSync(path, 'utf8') : null;
    },
    manifestPath: () => getCapsuleManifestPath(opts.cwd),
    fileExists: (path) => existsSync(resolveFrom(path)),
    readFileBytes: (path) => {
      const abs = resolveFrom(path);
      return existsSync(abs) ? new Uint8Array(readFileSync(abs)) : null;
    },
    runVitest: (testFiles) => VitestRunner.run({ testFiles: [...testFiles] }),
    // The plumb gate scans the repo at `cwd` (NOT a script-relative root): the
    // generated-test corpus + the published-package set are both facts about the
    // working tree the host was pointed at. Pure fs walk, so it lives in the
    // shared host factory and the MCP host gets it for free.
    runPlumb: async () => runPlumbScan(cwd, opts.skipDetector),
    // The pure gauntlet engine fold (the `check` command), run IN-PROCESS over
    // the repo at `cwd` — no subprocess, unlike the CLI-owned `gauntlet`
    // orchestrator. Like `runPlumb` it is a `node:fs` glob, so it lives in the
    // shared host factory and the MCP host gets it for free (an agent can call
    // `check` and read the Finding[] work-list).
    //
    // TWO-CLOCK LAW: the waiver-expiry `now` is a CALENDAR-DATE comparison (a
    // waiver's `expires` is a wall-clock date), so it MUST come from the
    // wallClock boundary (epoch ms → `new Date(...)`), NEVER systemClock /
    // performance.now (a monotonic DURATION reading whose value is not epoch ms —
    // feeding it into `new Date()` would land near 1970 and silently mis-expire
    // every waiver).
    runGauntlet: async (globs) => {
      const now = new Date(wallClock.now());
      // Registry coverage, negative controls, and testing-ledger waivers are
      // governance facts owned by the LiteShip repository. A packed consumer
      // still gets the real semantic gates over its own source, but must not be
      // required to carry LiteShip's private repository ledger.
      const governance = hasCheckGovernanceSurface(cwd)
        ? buildCheckGovernanceFacts(cwd, now)
        : applicationCheckGovernanceFacts();
      return litelaunchGauntlet(
        cwd,
        now,
        globs,
        undefined,
        opts.skipDetector,
        opts.earlyReturnDetector,
        undefined,
        governance,
      );
    },
    // NOTE: `runCheckInvariants` is NOT provisioned here — unlike runPlumb, the
    // invariant scan needs `@liteship/audit`'s `normalizeRepoPath` (the one B5b
    // slash-normalize home), and `@liteship/command` must not import `@liteship/audit`
    // (it would drag the heavy TS-compiler/glob engine into `@liteship/mcp-server`).
    // So — like `audit`/`audit-floor` — the gate is CLI-only: only `@liteship/cli`
    // injects `runCheckInvariants`, and over MCP it degrades to capabilityUnavailable.
    loadAssetBytes,
    runAudioProjection: async (bytes, projection) => {
      // This host command consumes a compiled manifest and raw WAV bytes; it
      // does not import the authored scene registry. Keep that explicit host
      // adapter separate from AssetRegistry, whose authority is registered
      // identity/kind/decoder ownership and therefore never falls back.
      const decoded = await audioDecoder(bytes);
      if (projection === 'beat') return detectBeats(decoded).beats.length;
      if (projection === 'onset') return detectOnsets(decoded).length;
      return computeWaveform(decoded, { bins: 512 }).length;
    },
    loadSceneModule: async (scenePath) => {
      try {
        return (await import(/* @vite-ignore */ pathToFileURL(resolveFrom(scenePath)).href)) as Record<string, unknown>;
      } catch (cause) {
        throw IoError('scene-module-import', 'could not import scene module', { path: scenePath, cause });
      }
    },
    runSceneCompile: async (mod) => {
      // Scene modules expose an explicit compile* function. Execute it exactly
      // once, then validate the structural projection consumed by command. This
      // keeps scene semantics in @liteship/scene while preventing the command
      // layer from re-deriving duration from raw authoring data.
      const compileEntries = Object.entries(mod).filter(
        ([name, value]) => /^compile(?:[A-Z_]|$)/.test(name) && typeof value === 'function',
      );
      if (compileEntries.length === 0) {
        throw ValidationError('scene.compile', 'module exports no compile function');
      }
      if (compileEntries.length > 1) {
        throw ValidationError(
          'scene.compile',
          `module exports multiple compile functions (${compileEntries.map(([name]) => name).join(', ')}); export exactly one`,
        );
      }
      const compileEntry = compileEntries[0]!;
      if (typeof compileEntry[1] !== 'function') throw ValidationError('scene.compile', 'export is not callable');
      const compiled = compileEntry[1]();
      if (typeof compiled !== 'object' || compiled === null) {
        throw ValidationError(
          'scene.compile',
          `function returned ${String(compiled)} instead of a CompiledScene descriptor`,
        );
      }
      const candidate = compiled as Record<string, unknown>;
      const durationMs = candidate['duration'];
      const fps = candidate['fps'];
      const trackSpawns = candidate['trackSpawns'];
      if (
        typeof durationMs !== 'number' ||
        !Number.isFinite(durationMs) ||
        durationMs < 0 ||
        typeof fps !== 'number' ||
        !Number.isFinite(fps) ||
        fps <= 0 ||
        !Array.isArray(trackSpawns)
      ) {
        throw ValidationError('scene.compile', 'function returned an invalid CompiledScene descriptor');
      }
      return { durationMs, fps, trackCount: trackSpawns.length };
    },
    renderScene: async ({ fps, durationMs, output, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }) => {
      // Compositor.create is sync-first (Wave 2): it returns the live instance
      // that owns its own teardown. The render collapses to a plain await; the
      // compositor's sole finalizer (closing the reactive `changes` kernel) runs
      // on the way out, preserving the old `Effect.scoped` cleanup.
      const compositor = Compositor.create();
      try {
        const renderer = createVideoRenderer({ fps, width, height, durationMs: durationMs as Millis }, compositor);
        return await renderWithFfmpeg(renderer.frames(), { output, width, height, fps });
      } finally {
        await compositor.dispose();
      }
    },
    cache: {
      read: (key) => tryReadCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }),
      write: (key, receipt) =>
        writeCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }, receipt),
    },
  };
  // Adapter capability overrides win over the shared defaults; keys absent from
  // `overrides` keep the host implementation above.
  return opts.overrides ? { ...base, ...opts.overrides } : base;
}
