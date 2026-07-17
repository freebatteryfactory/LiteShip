/**
 * asset verify (CLI adapter) — thin projection over `@czap/command`'s
 * asset.verify command, routed through {@link runCliCommand}. The manifest read,
 * the file-exists check, and the vitest runner are provided by the shared host
 * context (`createNodeCommandContext`); the decision (no test → ok/0; pass →
 * ok/1; fail → 2) lives in `@czap/command`.
 *
 * The `asset.verify` payload type has not been extracted into `CommandMap` yet
 * (still `unknown`), so the projection reads it through a narrow structural cast;
 * that cast drops once the [SCH] asset-verify payload slice lands its type.
 *
 * @module
 */

import { runCliCommand } from '../lib/run-command.js';
import { emit } from '../receipts.js';

/** Execute the asset verify command. */
export async function assetVerify(assetId: string): Promise<number> {
  return runCliCommand('asset.verify', { asset: assetId }, {}, (rawPayload, result) => {
    const payload = rawPayload as { assetId: string; invariantsChecked: number };
    emit({
      status: 'ok',
      command: 'asset.verify',
      timestamp: result.timestamp,
      assetId: payload.assetId,
      invariantsChecked: payload.invariantsChecked,
    });
    return 0;
  });
}
