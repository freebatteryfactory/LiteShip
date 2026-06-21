/**
 * verify (CUT A1) — ADR-0011 local tarball-vs-capsule verifier. A finite
 * structured decision command: read the inputs, decode the capsule, recompute
 * the tarball manifest address, compare. The four verdicts + exit codes are the
 * structured logic and live here; the file reads + Effect-backed decode/recompute
 * are injected. No network, no pnpm, no git.
 *
 * @module
 */
import { Schema } from 'effect';
import { schemaToJsonSchema, wallClock, type CapsuleCommandResult, type ContentAddress } from '@czap/core';
import type { CommandContext, HandledCommand } from '../registry.js';

type Verdict = 'Verified' | 'Mismatch' | 'Incomplete' | 'Unknown';

/**
 * The four forward-compat checks; only tarball_manifest is exercised in v0.1.0.
 * Modelled as a nested struct so the derived `outputSchema` carries the real
 * per-check enums (the structural validator recurses into nested objects), not a
 * bare `{type:'object'}`. The `checks` field of {@link VerifyPayload} is the
 * derived `Schema.Type` of this struct.
 */
const VerifyChecksSchema = Schema.Struct({
  tarball_manifest: Schema.Union([
    Schema.Literal('match'),
    Schema.Literal('mismatch'),
    Schema.Literal('skipped'),
  ]),
  lockfile: Schema.Literal('skipped'),
  workspace_manifest: Schema.Literal('skipped'),
  chain_link: Schema.Literal('skipped'),
});

const SKIPPED_BASE = { lockfile: 'skipped', workspace_manifest: 'skipped', chain_link: 'skipped' } as const;

/**
 * Structured payload returned alongside a verdict — ONE Effect Schema is the
 * source of both {@link VerifyPayload} and the descriptor's `outputSchema`.
 *
 * `capsule_id` is modelled as a nullable string (its on-the-wire shape — a
 * `ContentAddress` is a branded string, and the brand is a phantom with no
 * JSON-Schema image), then the exported {@link VerifyPayload} re-tightens that
 * single field to the `ContentAddress | null` brand consumers expect. There is
 * still exactly ONE schema; only the static type of the one branded field
 * narrows — no hand-written JSON-Schema lives beside it.
 */
export const VerifyPayloadSchema = Schema.Struct({
  tarball: Schema.String,
  capsule_id: Schema.NullOr(Schema.String),
  checks: VerifyChecksSchema,
  mismatches: Schema.Array(Schema.String),
});

/** Structured payload returned alongside a verdict. */
export type VerifyPayload = Omit<Schema.Schema.Type<typeof VerifyPayloadSchema>, 'capsule_id'> & {
  readonly capsule_id: ContentAddress | null;
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
  return { status: 'failed', command: 'verify', timestamp: new Date(wallClock.now()).toISOString(), exitCode: 1, payload: { error } };
}

/** `verify <tarball> [--capsule <file>]` — emit one of four verdicts. */
export const verifyCommand: HandledCommand = {
  descriptor: {
    name: 'verify',
    summary: 'Locally verify a tarball against its ShipCapsule (ADR-0011; no network).',
    inputSchema: schemaToJsonSchema(
      Schema.Struct({ tarball: Schema.String, capsule: Schema.optional(Schema.String) }),
    ),
    outputSchema: schemaToJsonSchema(VerifyPayloadSchema),
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
