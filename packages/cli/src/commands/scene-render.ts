/**
 * scene render (CLI adapter) — thin projection over `@liteship/command`'s
 * scene.render command. Injects the file-exists check, the receipt cache, the
 * dynamic scene import, and the host compositor + ffmpeg render pipeline; the
 * output/cache/discovery branching + receipt shaping live in `@liteship/command`.
 * Exit codes: 0 ok, 1 input error, 5 ffmpeg/subprocess error.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Compositor, VideoRenderer } from '@liteship/core';
import type { Millis } from '@liteship/core';
import { sceneRenderCommand } from '@liteship/command';
import type { CommandContext } from '@liteship/command';
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
    renderScene: async ({ fps, durationMs, output, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }) => {
      // Compositor.create is sync-first (Wave 2): it returns the live instance
      // that owns its own teardown. The render collapses to a plain await; the
      // compositor's sole finalizer (closing the reactive `changes` kernel) runs
      // on the way out, preserving the old `Effect.scoped` cleanup.
      const compositor = Compositor.create();
      try {
        const renderer = VideoRenderer.make({ fps, width, height, durationMs: durationMs as Millis }, compositor);
        return await renderWithFfmpeg(renderer.frames(), { output, width, height, fps });
      } finally {
        await compositor.dispose();
      }
    },
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
  const payload = result.payload as Omit<
    SceneRenderReceipt,
    'status' | 'command' | 'timestamp' | 'width' | 'height'
  > & {
    cached: boolean;
    width?: number;
    height?: number;
  };
  emit({
    status: 'ok',
    command: 'scene.render',
    timestamp: result.timestamp,
    sceneId: payload.sceneId,
    output: payload.output,
    frameCount: payload.frameCount,
    elapsedMs: payload.elapsedMs,
    // Contract-declared dimensions ride the payload; absent ones resolve to
    // the adapter defaults the render actually used. Echoed so the values
    // are observable in the receipt, not just in the video bytes.
    width: payload.width ?? DEFAULT_WIDTH,
    height: payload.height ?? DEFAULT_HEIGHT,
    ...(payload.fps !== undefined ? { fps: payload.fps } : {}),
    cached: payload.cached,
  });
  return 0;
}
