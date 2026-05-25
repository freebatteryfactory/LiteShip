/**
 * capsule inspect / verify / list (CLI adapter) — thin projections over
 * `@czap/command`'s capsule commands. The manifest read (path resolution via
 * getCapsuleManifestPath, honoring CZAP_CAPSULE_MANIFEST) and the vitest run
 * are injected here; the structured decisions live in `@czap/command`. This
 * adapter renders the exact JSON receipts to stdout and errors to stderr.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { capsuleInspectCommand, capsuleListCommand, capsuleVerifyCommand } from '@czap/command';
import type { CommandContext } from '@czap/command';
import { emit, emitError, getCapsuleManifestPath } from '../receipts.js';
import { VitestRunner } from '../capsules/vitest-runner.js';

/** Build the injected I/O surface the capsule handlers need. */
function capsuleContext(): CommandContext {
  return {
    manifestSource: () => {
      const path = getCapsuleManifestPath();
      return existsSync(path) ? readFileSync(path, 'utf8') : null;
    },
    runVitest: (testFiles) => VitestRunner.run({ testFiles: [...testFiles] }),
  };
}

/** Execute `capsule inspect <id>`. */
export async function capsuleInspect(id: string): Promise<number> {
  const result = await capsuleInspectCommand.handler({ name: 'capsule.inspect', args: { id } }, capsuleContext());
  if (result.status === 'failed') {
    emitError('capsule.inspect', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  emit({
    status: 'ok',
    command: 'capsule.inspect',
    timestamp: result.timestamp,
    capsule: (result.payload as { capsule: unknown }).capsule,
  });
  return 0;
}

/** Execute `capsule list [--kind=<kind>]`. */
export async function capsuleList(kind?: string): Promise<number> {
  const args = kind ? { kind } : {};
  const result = await capsuleListCommand.handler({ name: 'capsule.list', args }, capsuleContext());
  if (result.status === 'failed') {
    emitError('capsule.list', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  const payload = result.payload as { capsules: unknown; kind: string | null };
  emit({
    status: 'ok',
    command: 'capsule.list',
    timestamp: result.timestamp,
    capsules: payload.capsules,
    kind: payload.kind,
  });
  return 0;
}

/** Execute `capsule verify <id>`. */
export async function capsuleVerify(id: string): Promise<number> {
  const result = await capsuleVerifyCommand.handler({ name: 'capsule.verify', args: { id } }, capsuleContext());
  if (result.status === 'failed') {
    emitError('capsule.verify', (result.payload as { error: string }).error);
    return result.exitCode ?? 1;
  }
  emit({
    status: 'ok',
    command: 'capsule.verify',
    timestamp: result.timestamp,
    capsuleId: (result.payload as { capsuleId: string }).capsuleId,
  });
  return 0;
}
