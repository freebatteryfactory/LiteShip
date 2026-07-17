/**
 * createNodeCommandContext — the ONE shared host CommandContext factory. Both
 * the CLI and MCP adapters build their injected I/O from this, so a command
 * runs identically whichever protocol skin invoked it. This is the Node host
 * execution surface; the pure `@czap/command` main entry never imports it.
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
import { Effect } from 'effect';
import { Compositor, VideoRenderer, wallClock, type Millis } from '@czap/core';
import { AssetRegistry, detectBeats, detectOnsets, computeWaveform, type DecodedAudio } from '@czap/assets';
import { litelaunchGauntlet, type EarlyReturnMatch, type SkipMatch } from '@czap/gauntlet';
import type { CommandContext } from '../registry.js';
import { spawnArgvCapture } from './spawn.js';
import { VitestRunner } from './vitest-runner.js';
import { renderWithFfmpeg } from './ffmpeg.js';
import { tryReadCache, writeCache } from './idempotency.js';
import { getCapsuleManifestPath } from './manifest-path.js';
import { runPlumbScan } from './plumb-scan.js';

// Host audio decode resolves by asset id, falling back to the built-in audio
// decoder for any id not in a registry. An EMPTY immutable registry preserves
// the prior global `resolveAssetDecoder` behavior (no scene is imported in the
// host, so nothing was ever registered) without the order-dependent global.
const HOST_ASSET_REGISTRY = AssetRegistry.make([]);

/** Render-dimension fallbacks when the scene contract carries no width/height. */
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/**
 * Build the shared Node host context. Pass the adapter's `cwd` so EVERY path
 * capability resolves against it (manifest, cache, file reads, asset/scene
 * loading, CZAP_CAPSULE_MANIFEST) — not just manifest + cache.
 *
 * `skipDetector` and `earlyReturnDetector` are OPTIONAL host-built SOUND AST detectors
 * (`@czap/audit`'s `detectSkipsAST` / `detectEarlyReturnBeforeExpectAST`). They are
 * injected by the ADAPTER, not imported here: `@czap/command` must NOT depend on
 * `@czap/audit` (it would drag the TS compiler into `@czap/mcp-server`). So the CLI
 * adapter — which already deps `@czap/audit` — passes them, and the in-process
 * `runGauntlet` (`czap check`) gains parser-backed skip and early-return detection. The
 * MCP adapter omits them → the lean token fallback (the documented degradation, exactly
 * like `runCheckInvariants`, which is likewise CLI-only because it needs `@czap/audit`).
 */
export function createNodeCommandContext(
  opts: {
    readonly cwd?: string;
    readonly skipDetector?: (source: string) => readonly SkipMatch[];
    readonly earlyReturnDetector?: (source: string) => readonly EarlyReturnMatch[];
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

  return {
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
    runGauntlet: async (globs) =>
      litelaunchGauntlet(cwd, new Date(wallClock.now()), globs, undefined, opts.skipDetector, opts.earlyReturnDetector),
    // NOTE: `runCheckInvariants` is NOT provisioned here — unlike runPlumb, the
    // invariant scan needs `@czap/audit`'s `normalizeRepoPath` (the one B5b
    // slash-normalize home), and `@czap/command` must not import `@czap/audit`
    // (it would drag the heavy TS-compiler/glob engine into `@czap/mcp-server`).
    // So — like `audit`/`audit-floor` — the gate is CLI-only: only `@czap/cli`
    // injects `runCheckInvariants`, and over MCP it degrades to capabilityUnavailable.
    loadAssetBytes,
    runAudioProjection: async (bytes, projection, assetId) => {
      // The asset's OWN decoder (AssetDecl.decoder override or the kind
      // built-in, via its capsule's derive handler) — not a hardwired
      // audioDecoder. Falls back to the audio built-in when the asset isn't
      // registered in this process. The three projections are audio
      // analyses, so the decoded shape must be DecodedAudio (enforced on
      // AssetDecl.decoder for kind 'audio').
      const decoded = (await HOST_ASSET_REGISTRY.resolveDecoder(assetId ?? '')(bytes)) as DecodedAudio;
      if (projection === 'beat') return detectBeats(decoded).beats.length;
      if (projection === 'onset') return detectOnsets(decoded).length;
      return computeWaveform(decoded, { bins: 512 }).length;
    },
    loadSceneModule: async (scenePath) =>
      (await import(/* @vite-ignore */ pathToFileURL(resolveFrom(scenePath)).href)) as Record<string, unknown>,
    runSceneCompile: async (mod) => {
      const compileFn = Object.values(mod).find((v): v is () => unknown => typeof v === 'function');
      if (!compileFn) return;
      const result = compileFn();
      if (Effect.isEffect(result)) await Effect.runPromise(result as Effect.Effect<unknown, never, never>);
    },
    renderScene: async ({ fps, durationMs, output, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }) => {
      // Compositor.create is sync-first (Wave 2): it returns the live instance
      // plus the Lifetime that owns its teardown. The render collapses to a
      // plain await; the scope's sole finalizer (closing the reactive `changes`
      // kernel) runs on the way out, preserving the old `Effect.scoped` cleanup.
      const { compositor, lifetime } = Compositor.create();
      try {
        const renderer = VideoRenderer.make({ fps, width, height, durationMs: durationMs as Millis }, compositor);
        return await renderWithFfmpeg(renderer.frames(), { output, width, height, fps });
      } finally {
        await lifetime.dispose();
      }
    },
    cache: {
      read: (key) => tryReadCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }),
      write: (key, receipt) =>
        writeCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }, receipt),
    },
  };
}
