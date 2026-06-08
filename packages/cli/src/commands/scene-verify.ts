/**
 * scene verify (CLI adapter) — thin projection over `@czap/command`'s
 * scene.verify command. Injects the file-exists check, the dynamic scene-module
 * import, the manifest read, and the vitest runner; the capsule-discovery +
 * branching lives in `@czap/command`. Exit codes: 0 ok, 1 input error, 2 test
 * failed.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { sceneVerifyCommand } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { emit, emitError, getCapsuleManifestPath } from '../receipts.js';
import { VitestRunner } from '../capsules/vitest-runner.js';

function verifyContext(): CommandContext {
  return {
    fileExists: (path) => existsSync(resolve(path)),
    loadSceneModule: async (scenePath) => {
      const abs = resolve(scenePath);
      return (await import(/* @vite-ignore */ pathToFileURL(abs).href)) as Record<string, unknown>;
    },
    manifestSource: () => {
      const path = getCapsuleManifestPath();
      return existsSync(path) ? readFileSync(path, 'utf8') : null;
    },
    runVitest: (testFiles) => VitestRunner.run({ testFiles: [...testFiles] }),
  };
}

/** Execute the scene verify command. */
export async function sceneVerify(scenePath: string): Promise<number> {
  const result = await sceneVerifyCommand.handler(
    { name: 'scene.verify', args: { scene: scenePath } },
    verifyContext(),
  );
  if (result.status === 'failed') {
    emitError('scene.verify', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  const payload = result.payload as { sceneId: string; generatedTests: number };
  emit({
    status: 'ok',
    command: 'scene.verify',
    timestamp: result.timestamp,
    sceneId: payload.sceneId,
    generatedTests: payload.generatedTests,
  });
  return 0;
}
