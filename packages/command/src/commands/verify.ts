/**
 * verify (CUT A1) — ADR-0011 local tarball-vs-capsule verifier. A finite
 * structured decision command: read the inputs, decode the capsule, recompute
 * the tarball manifest address, compare. The four verdicts + exit codes are the
 * structured logic and live here; the file reads + Effect-backed decode/recompute
 * are injected. No network, no pnpm, no git.
 *
 * @module
 */
import { wallClock, type CapsuleCommandResult, type CommandJsonSchema, type ContentAddress } from '@czap/core';
import type { CommandContext, HandledCommand } from '../registry.js';

type Verdict = 'Verified' | 'Mismatch' | 'Incomplete' | 'Unknown';

const SKIPPED_BASE = { lockfile: 'skipped', workspace_manifest: 'skipped', chain_link: 'skipped' } as const;

/**
 * The descriptor `outputSchema` — hand-written JSON-Schema, byte-parity-pinned
 * against the parity fixture. The four forward-compat `checks` are a nested struct
 * (only `tarball_manifest` is exercised in v0.1.0) so the validator recurses into
 * the real per-check enums, not a bare `{type:'object'}`.
 *
 * `capsule_id` is described as a nullable string (its on-the-wire shape — a
 * `ContentAddress` is a branded string with no JSON-Schema image); the exported
 * {@link VerifyPayload} re-tightens that single field to the `ContentAddress |
 * null` brand consumers expect.
 */
export const VerifyPayloadSchema = {
  type: 'object',
  properties: {
    tarball: { type: 'string' },
    capsule_id: { type: ['string', 'null'] },
    checks: {
      type: 'object',
      properties: {
        tarball_manifest: { enum: ['match', 'mismatch', 'skipped'] },
        lockfile: { const: 'skipped' },
        workspace_manifest: { const: 'skipped' },
        chain_link: { const: 'skipped' },
      },
      required: ['tarball_manifest', 'lockfile', 'workspace_manifest', 'chain_link'],
    },
    mismatches: { type: 'array', items: { type: 'string' } },
  },
  required: ['tarball', 'capsule_id', 'checks', 'mismatches'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned alongside a verdict. */
export type VerifyPayload = {
  readonly tarball: string;
  readonly capsule_id: ContentAddress | null;
  readonly checks: {
    readonly tarball_manifest: 'match' | 'mismatch' | 'skipped';
    readonly lockfile: 'skipped';
    readonly workspace_manifest: 'skipped';
    readonly chain_link: 'skipped';
  };
  readonly mismatches: readonly string[];
};

function verdictResult(
  verdict: Verdict,
  exitCode: number,
  payload: VerifyPayload,
): CapsuleCommandResult<VerifyPayload> {
  return {
    status: verdict === 'Verified' ? 'ok' : 'failed',
    command: 'verify',
    timestamp: new Date(wallClock.now()).toISOString(),
    verdict,
    exitCode,
    payload,
  };
}

function plainError(error: string): CapsuleCommandResult {
  return {
    status: 'failed',
    command: 'verify',
    timestamp: new Date(wallClock.now()).toISOString(),
    exitCode: 1,
    payload: { error },
  };
}

/** `verify <tarball> [--capsule <file>]` — emit one of four verdicts. */
export const verifyCommand: HandledCommand = {
  descriptor: {
    name: 'verify',
    summary: 'Locally verify a tarball against its ShipCapsule (ADR-0011; no network).',
    inputSchema: {
      type: 'object',
      properties: { tarball: { type: 'string' }, capsule: { type: 'string' } },
      required: ['tarball'],
    } as const satisfies CommandJsonSchema,
    outputSchema: VerifyPayloadSchema,
    annotations: { readOnly: true, group: 'ship' },
  },
  handler: async (invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    const tarball = typeof invocation.args.tarball === 'string' ? invocation.args.tarball : undefined;
    let capsule = typeof invocation.args.capsule === 'string' ? invocation.args.capsule : undefined;

    // No --capsule: ship mints the capsule as a tarball sibling
    // (`<slug>-<version>.shipcapsule.cbor`, see cli ship). Probe that
    // convention before falling back to Unknown — the verdict for the
    // genuinely-no-capsule case (ADR-0011: Unknown is first-class).
    if (capsule === undefined && tarball !== undefined) {
      const sibling = tarball.replace(/\.tgz$/, '.shipcapsule.cbor');
      if (sibling !== tarball && context.fileExists?.(sibling)) capsule = sibling;
    }
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
