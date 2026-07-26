/**
 * `scene compile` CLI projection. Scene loading, compile execution, and failure
 * normalization come from the one shared Node command context.
 *
 * @module
 */

import { runCliCommand } from '../lib/run-command.js';
import { emit } from '../receipts.js';

/** Execute the scene compile command. */
export async function sceneCompile(scenePath: string): Promise<number> {
  return runCliCommand('scene.compile', { scene: scenePath }, {}, (payload, result) => {
    emit({
      status: 'ok',
      command: 'scene.compile',
      timestamp: result.timestamp,
      sceneId: payload.sceneId,
      trackCount: payload.trackCount,
      durationMs: payload.durationMs,
    });
  });
}
