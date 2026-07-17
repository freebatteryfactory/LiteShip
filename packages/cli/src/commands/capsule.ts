/**
 * capsule inspect / verify / list (CLI adapter) — thin projections over
 * `@czap/command`'s capsule commands, routed through {@link runCliCommand}. The
 * manifest read (path resolution honoring CZAP_CAPSULE_MANIFEST) and the vitest
 * run are provided by the shared host context (`createNodeCommandContext`); the
 * structured decisions live in `@czap/command`. This adapter renders the exact
 * JSON receipts to stdout and errors to stderr.
 *
 * The capsule payload types are not yet in `CommandMap` (still `unknown`), so the
 * projections read them through narrow structural casts; those drop once the
 * [SCH] capsule payload slice lands their types.
 *
 * @module
 */

import { runCliCommand } from '../lib/run-command.js';
import { emit } from '../receipts.js';

/** Execute `capsule inspect <id>`. */
export async function capsuleInspect(id: string): Promise<number> {
  return runCliCommand('capsule.inspect', { id }, {}, (rawPayload, result) => {
    emit({
      status: 'ok',
      command: 'capsule.inspect',
      timestamp: result.timestamp,
      capsule: (rawPayload as { capsule: unknown }).capsule,
    });
    return 0;
  });
}

/** Execute `capsule list [--kind=<kind>]`. */
export async function capsuleList(kind?: string): Promise<number> {
  const args = kind ? { kind } : {};
  return runCliCommand('capsule.list', args, {}, (rawPayload, result) => {
    const payload = rawPayload as { capsules: unknown; kind: string | null };
    emit({
      status: 'ok',
      command: 'capsule.list',
      timestamp: result.timestamp,
      capsules: payload.capsules,
      kind: payload.kind,
    });
    return 0;
  });
}

/** Execute `capsule verify <id>`. */
export async function capsuleVerify(id: string): Promise<number> {
  return runCliCommand('capsule.verify', { id }, {}, (rawPayload, result) => {
    emit({
      status: 'ok',
      command: 'capsule.verify',
      timestamp: result.timestamp,
      capsuleId: (rawPayload as { capsuleId: string }).capsuleId,
    });
    return 0;
  });
}
