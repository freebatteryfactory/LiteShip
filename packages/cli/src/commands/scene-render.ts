/**
 * scene render (CLI adapter) — thin projection over `@czap/command`'s
 * scene.render command. Injects the file-exists check, the receipt cache, the
 * dynamic scene import, and the host compositor + ffmpeg render pipeline; the
 * output/cache/discovery branching + receipt shaping live in `@czap/command`.
 * Exit codes: 0 ok, 1 input error, 5 ffmpeg/subprocess error.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Effect } from 'effect';
import { Compositor, VideoRenderer } from '@czap/core';
import type { Millis } from '@czap/core';
import { sceneRenderCommand } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { renderWithFfmpeg } from '../render-backend/ffmpeg.js';
import { emit, emitError } from '../receipts.js';
import type { SceneRenderReceipt } from '../receipts.js';
import { tryReadCache, writeCache } from '../idempotency.js';

/** Render-dimension fallbacks when the scene contract carries no width/height. */
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

function renderContext(opts: { readonly cwd?: string }): CommandContext {
  return {
    fileExists: (path) => existsSync(resolve(path)),
    cache: {
      read: (key) => tryReadCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }),
      write: (key, receipt) =>
        writeCache({ command: key.command, inputs: key.inputs, force: key.force, cwd: opts.cwd }, receipt),
    },
    loadSceneModule: async (scenePath) =>
      (await import(/* @vite-ignore */ pathToFileURL(resolve(scenePath)).href)) as Record<string, unknown>,
    renderScene: ({ fps, durationMs, output, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }) =>
      Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            const compositor = yield* Compositor.create();
            const renderer = VideoRenderer.make({ fps, width, height, durationMs: durationMs as Millis }, compositor);
            return yield* Effect.promise(() => renderWithFfmpeg(renderer.frames(), { output, width, height, fps }));
          }),
        ),
      ),
  };
}

/** Execute the scene render command. */
export async function sceneRender(
  scenePath: string,
  output: string,
  force = false,
  opts: { readonly cwd?: string } = {},
): Promise<number> {
  const result = await sceneRenderCommand.handler(
    { name: 'scene.render', args: { scene: scenePath, output, force } },
    renderContext(opts),
  );
  if (result.status === 'failed') {
    emitError('scene.render', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  const payload = result.payload as Omit<SceneRenderReceipt, 'status' | 'command' | 'timestamp'> & { cached: boolean };
  emit({
    status: 'ok',
    command: 'scene.render',
    timestamp: result.timestamp,
    sceneId: payload.sceneId,
    output: payload.output,
    frameCount: payload.frameCount,
    elapsedMs: payload.elapsedMs,
    cached: payload.cached,
  });
  return 0;
}
