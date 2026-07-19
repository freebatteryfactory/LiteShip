/**
 * scene compile (CLI adapter) — thin projection over `@liteship/command`'s
 * scene.compile command. Injects the file-exists check, the dynamic scene
 * import, and the compile-fn execution (incl. Effect); the capsule/contract
 * discovery + receipt shaping live in `@liteship/command`.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { sceneCompileCommand } from '@liteship/command';
import type { CommandContext } from '@liteship/command';
import { emit, emitError } from '../receipts.js';
import type { SceneCompileReceipt } from '../receipts.js';

function compileContext(): CommandContext {
  return {
    fileExists: (path) => existsSync(resolve(path)),
    loadSceneModule: async (scenePath) =>
      (await import(/* @vite-ignore */ pathToFileURL(resolve(scenePath)).href)) as Record<string, unknown>,
    runSceneCompile: async (mod) => {
      // Scene compile fns are sync (they return a CompiledScene descriptor); invoke
      // for the compile side effect. The legacy `Effect.isEffect(result)` branch is
      // retired — no compile fn returns an Effect anymore (Wave 8).
      const compileFn = Object.values(mod).find((v): v is () => unknown => typeof v === 'function');
      if (!compileFn) return;
      compileFn();
    },
  };
}

/** Execute the scene compile command. */
export async function sceneCompile(scenePath: string): Promise<number> {
  const result = await sceneCompileCommand.handler(
    { name: 'scene.compile', args: { scene: scenePath } },
    compileContext(),
  );
  if (result.status === 'failed') {
    emitError('scene.compile', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  const payload = result.payload as { sceneId: string; trackCount: number; durationMs: number };
  const receipt: SceneCompileReceipt = {
    status: 'ok',
    command: 'scene.compile',
    timestamp: result.timestamp,
    sceneId: payload.sceneId,
    trackCount: payload.trackCount,
    durationMs: payload.durationMs,
  };
  emit(receipt);
  return 0;
}
