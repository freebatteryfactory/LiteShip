/**
 * scene compile (CLI adapter) — thin projection over `@czap/command`'s
 * scene.compile command. Injects the file-exists check, the dynamic scene
 * import, and the compile-fn execution (incl. Effect); the capsule/contract
 * discovery + receipt shaping live in `@czap/command`.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Effect } from 'effect';
import { sceneCompileCommand } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { emit, emitError } from '../receipts.js';
import type { SceneCompileReceipt } from '../receipts.js';

function compileContext(): CommandContext {
  return {
    fileExists: (path) => existsSync(resolve(path)),
    loadSceneModule: async (scenePath) =>
      (await import(/* @vite-ignore */ pathToFileURL(resolve(scenePath)).href)) as Record<string, unknown>,
    runSceneCompile: async (mod) => {
      const compileFn = Object.values(mod).find((v): v is () => unknown => typeof v === 'function');
      if (!compileFn) return;
      // Compile fns may return a CompiledScene descriptor or an Effect (legacy).
      const result = compileFn();
      if (Effect.isEffect(result)) await Effect.runPromise(result as Effect.Effect<unknown, never, never>);
    },
  };
}

/** Execute the scene compile command. */
export async function sceneCompile(scenePath: string): Promise<number> {
  const result = await sceneCompileCommand.handler({ name: 'scene.compile', args: { scene: scenePath } }, compileContext());
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
