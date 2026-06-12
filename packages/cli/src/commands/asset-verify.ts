/**
 * asset verify (CLI adapter) — thin projection over `@czap/command`'s
 * asset.verify command. Injects the manifest read, a file-exists check, and
 * the vitest runner; the decision (no test → ok/0; pass → ok/1; fail → 2)
 * lives in `@czap/command`.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { assetVerifyCommand } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { emit, emitError, getCapsuleManifestPath } from '../receipts.js';
import { VitestRunner } from '../capsules/vitest-runner.js';

function verifyContext(): CommandContext {
  return {
    manifestSource: () => {
      const path = getCapsuleManifestPath();
      return existsSync(path) ? readFileSync(path, 'utf8') : null;
    },
    manifestPath: () => getCapsuleManifestPath(),
    fileExists: (path) => existsSync(path),
    runVitest: (testFiles) => VitestRunner.run({ testFiles: [...testFiles] }),
  };
}

/** Execute the asset verify command. */
export async function assetVerify(assetId: string): Promise<number> {
  const result = await assetVerifyCommand.handler({ name: 'asset.verify', args: { asset: assetId } }, verifyContext());
  if (result.status === 'failed') {
    emitError('asset.verify', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  const payload = result.payload as { assetId: string; invariantsChecked: number };
  emit({
    status: 'ok',
    command: 'asset.verify',
    timestamp: result.timestamp,
    assetId: payload.assetId,
    invariantsChecked: payload.invariantsChecked,
  });
  return 0;
}
