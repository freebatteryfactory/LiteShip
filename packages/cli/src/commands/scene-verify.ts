/**
 * scene verify (CLI adapter) — thin projection over `@liteship/command`'s
 * scene.verify command, routed through {@link runCliCommand}. The file-exists
 * check, the dynamic scene-module import, the manifest read, and the vitest
 * runner are provided by the shared host context (`createNodeCommandContext`);
 * the capsule-discovery + branching lives in `@liteship/command`. Exit codes: 0 ok,
 * 1 input error, 2 test failed.
 *
 * The `scene.verify` payload type is not yet in `CommandMap` (still `unknown`),
 * so the projection reads it through a narrow structural cast; that cast drops
 * once the [SCH] scene payload slice lands its type.
 *
 * @module
 */

import { runCliCommand } from '../lib/run-command.js';
import { emit } from '../receipts.js';

/** Execute the scene verify command. */
export async function sceneVerify(scenePath: string): Promise<number> {
  return runCliCommand('scene.verify', { scene: scenePath }, {}, (rawPayload, result) => {
    const payload = rawPayload as { sceneId: string; generatedTests: number };
    emit({
      status: 'ok',
      command: 'scene.verify',
      timestamp: result.timestamp,
      sceneId: payload.sceneId,
      generatedTests: payload.generatedTests,
    });
    return 0;
  });
}
