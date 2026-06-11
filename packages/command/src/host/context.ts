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
import { Compositor, VideoRenderer, type Millis } from '@czap/core';
import { resolveAssetDecoder, detectBeats, detectOnsets, computeWaveform, type DecodedAudio } from '@czap/assets';
import type { CommandContext } from '../registry.js';
import { spawnArgvCapture } from './spawn.js';
import { VitestRunner } from './vitest-runner.js';
import { renderWithFfmpeg } from './ffmpeg.js';
import { tryReadCache, writeCache } from './idempotency.js';
import { getCapsuleManifestPath } from './manifest-path.js';

const WIDTH = 1280;
const HEIGHT = 720;

/** Load an asset's raw bytes by source convention (examples/scenes/<id>.wav | manifest source). */
function loadAssetBytes(assetId: string, source?: string): ArrayBuffer | null {
  const candidates = [resolve('examples/scenes', `${assetId}.wav`), source ? resolve(source) : ''].filter(
    (p) => p && existsSync(p),
  );
  if (candidates.length === 0) return null;
  return readFileSync(candidates[0]!).buffer as ArrayBuffer;
}

/**
 * Build the shared Node host context. Pass the adapter's `cwd` so manifest +
 * cache resolution honor it (and CZAP_CAPSULE_MANIFEST).
 */
export function createNodeCommandContext(opts: { readonly cwd?: string } = {}): CommandContext {
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
    fileExists: (path) => existsSync(resolve(path)),
    readFileBytes: (path) => {
      const abs = resolve(path);
      return existsSync(abs) ? new Uint8Array(readFileSync(abs)) : null;
    },
    runVitest: (testFiles) => VitestRunner.run({ testFiles: [...testFiles] }),
    loadAssetBytes,
    runAudioProjection: async (bytes, projection, assetId) => {
      // The asset's OWN decoder (AssetDecl.decoder override or the kind
      // built-in, via its capsule's derive handler) — not a hardwired
      // audioDecoder. Falls back to the audio built-in when the asset isn't
      // registered in this process. The three projections are audio
      // analyses, so the decoded shape must be DecodedAudio (enforced on
      // AssetDecl.decoder for kind 'audio').
      const decoded = (await resolveAssetDecoder(assetId ?? '')(bytes)) as DecodedAudio;
      if (projection === 'beat') return detectBeats(decoded).beats.length;
      if (projection === 'onset') return detectOnsets(decoded).length;
      return computeWaveform(decoded, { bins: 512 }).length;
    },
    loadSceneModule: async (scenePath) =>
      (await import(/* @vite-ignore */ pathToFileURL(resolve(scenePath)).href)) as Record<string, unknown>,
    runSceneCompile: async (mod) => {
      const compileFn = Object.values(mod).find((v): v is () => unknown => typeof v === 'function');
      if (!compileFn) return;
      const result = compileFn();
      if (Effect.isEffect(result)) await Effect.runPromise(result as Effect.Effect<unknown, never, never>);
    },
    renderScene: ({ fps, durationMs, output }) =>
      Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const compositor = yield* Compositor.create();
            const renderer = VideoRenderer.make(
              { fps, width: WIDTH, height: HEIGHT, durationMs: durationMs as Millis },
              compositor,
            );
            return yield* Effect.promise(() =>
              renderWithFfmpeg(renderer.frames(), { output, width: WIDTH, height: HEIGHT, fps }),
            );
          }),
        ),
      ),
    cache: {
      read: (key) => tryReadCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }),
      write: (key, receipt) =>
        writeCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }, receipt),
    },
  };
}
