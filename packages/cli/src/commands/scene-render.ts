/**
 * `scene render` CLI projection. The shared Node command context owns scene
 * loading, cache semantics, compositor lifecycle, and ffmpeg execution; this
 * adapter only renders the public receipt.
 *
 * @module
 */

import { runCliCommand } from '../internal/run-command.js';
import { emit } from '../receipts.js';

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

/** Execute the scene render command. */
export async function sceneRender(
  scenePath: string,
  output: string,
  force = false,
  opts: { readonly cwd?: string } = {},
): Promise<number> {
  return runCliCommand('scene.render', { scene: scenePath, output, force }, { cwd: opts.cwd }, (payload, result) => {
    emit({
      status: 'ok',
      command: 'scene.render',
      timestamp: result.timestamp,
      sceneId: payload.sceneId,
      output: payload.output,
      frameCount: payload.frameCount,
      elapsedMs: payload.elapsedMs,
      width: payload.width ?? DEFAULT_WIDTH,
      height: payload.height ?? DEFAULT_HEIGHT,
      ...(payload.fps !== undefined ? { fps: payload.fps } : {}),
      cached: payload.cached ?? false,
    });
  });
}
