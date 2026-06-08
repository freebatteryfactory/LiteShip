/**
 * verify (CUT A1) — ADR-0011 local tarball-vs-capsule verifier. A finite
 * structured decision command: read the inputs, decode the capsule, recompute
 * the tarball manifest address, compare. The four verdicts + exit codes are the
 * structured logic and live here; the file reads + Effect-backed decode/recompute
 * are injected. No network, no pnpm, no git.
 *
 * @module
 */
import type { CapsuleCommandResult, ContentAddress } from '@czap/core';
import type { CommandContext, HandledCommand } from '../registry.js';

type Verdict = 'Verified' | 'Mismatch' | 'Incomplete' | 'Unknown';

/** The four forward-compat checks; only tarball_manifest is exercised in v0.1.0. */
interface VerifyChecks {
  readonly tarball_manifest: 'match' | 'mismatch' | 'skipped';
  readonly lockfile: 'skipped';
  readonly workspace_manifest: 'skipped';
  readonly chain_link: 'skipped';
}

const SKIPPED_BASE = { lockfile: 'skipped', workspace_manifest: 'skipped', chain_link: 'skipped' } as const;

/** Structured payload returned alongside a verdict. */
export interface VerifyPayload {
  readonly tarball: string;
  readonly capsule_id: ContentAddress | null;
  readonly checks: VerifyChecks;
  readonly mismatches: readonly string[];
}

function verdictResult(
  verdict: Verdict,
  exitCode: number,
  payload: VerifyPayload,
): CapsuleCommandResult<VerifyPayload> {
  return {
    status: verdict === 'Verified' ? 'ok' : 'failed',
    command: 'verify',
    timestamp: new Date().toISOString(),
    verdict,
    exitCode,
    payload,
  };
}

function plainError(error: string): CapsuleCommandResult {
  return { status: 'failed', command: 'verify', timestamp: new Date().toISOString(), exitCode: 1, payload: { error } };
}

/** `verify <tarball> --capsule <file>` — emit one of four verdicts. */
export const verifyCommand: HandledCommand = {
  descriptor: {
    name: 'verify',
    summary: 'Locally verify a tarball against its ShipCapsule (ADR-0011; no network).',
    inputSchema: {
      type: 'object',
      required: ['tarball', 'capsule'],
      properties: { tarball: { type: 'string' }, capsule: { type: 'string' } },
    },
    outputSchema: {
      type: 'object',
      required: ['tarball', 'capsule_id', 'checks', 'mismatches'],
      properties: {
        tarball: { type: 'string' },
        capsule_id: { type: ['string', 'null'] },
        checks: { type: 'object' },
        mismatches: { type: 'array' },
      },
    },
    annotations: { readOnly: true, group: 'ship' },
  },
  handler: async (invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    const tarball = typeof invocation.args.tarball === 'string' ? invocation.args.tarball : undefined;
    const capsule = typeof invocation.args.capsule === 'string' ? invocation.args.capsule : undefined;

    // Unknown — no capsule supplied. Honest: we cannot tell.
    if (capsule === undefined) {
      return verdictResult('Unknown', 4, {
        tarball: tarball ?? '',
        capsule_id: null,
        checks: { tarball_manifest: 'skipped', ...SKIPPED_BASE },
        mismatches: [],
      });
    }
    if (tarball === undefined) return plainError('missing positional <tarball>');
    if (!context.fileExists?.(tarball)) return plainError(`tarball not found: ${tarball}`);
    if (!context.fileExists?.(capsule)) return plainError(`capsule not found: ${capsule}`);

    const tarballBytes = context.readFileBytes?.(tarball);
    const capsuleBytes = context.readFileBytes?.(capsule);
    if (!tarballBytes || !capsuleBytes) return plainError('failed to read input files');

    const decoded = await context.decodeShipCapsule?.(capsuleBytes);
    if (!decoded || !decoded.ok) {
      // All decode errors collapse to Incomplete per ADR-0011 §Decision.
      return verdictResult('Incomplete', 3, {
        tarball,
        capsule_id: null,
        checks: { tarball_manifest: 'skipped', ...SKIPPED_BASE },
        mismatches: [`decode:${decoded?.error ?? 'decoder unavailable'}`],
      });
    }

    const recomputed = await context.recomputeTarballAddress?.(tarballBytes);
    if (!recomputed || !recomputed.ok) {
      return verdictResult('Incomplete', 3, {
        tarball,
        capsule_id: decoded.id,
        checks: { tarball_manifest: 'skipped', ...SKIPPED_BASE },
        mismatches: [`recompute:${recomputed && !recomputed.ok ? recomputed.error : 'recompute unavailable'}`],
      });
    }

    const claimed = decoded.tarballManifestAddress;
    const mismatches: string[] = [];
    if (recomputed.display_id !== claimed.display_id) mismatches.push('tarball_manifest_address.display_id');
    if (recomputed.integrity_digest !== claimed.integrity_digest)
      mismatches.push('tarball_manifest_address.integrity_digest');

    if (mismatches.length > 0) {
      return verdictResult('Mismatch', 2, {
        tarball,
        capsule_id: decoded.id,
        checks: { tarball_manifest: 'mismatch', ...SKIPPED_BASE },
        mismatches,
      });
    }

    return verdictResult('Verified', 0, {
      tarball,
      capsule_id: decoded.id,
      checks: { tarball_manifest: 'match', ...SKIPPED_BASE },
      mismatches: [],
    });
  },
};
