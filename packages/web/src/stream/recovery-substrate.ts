/**
 * Host-registered gap-replay substrate for graph-native stream recovery (#133-full).
 *
 * `runGraphNativeGapReplay` needs four things the stream DIRECTIVE cannot invent:
 * the QUERY endpoint, the host's mutation client (base + adopt), the StateCell
 * store, and the patch/receipt chain spanning the gap. The first three are
 * host-owned by design (ADR-0015) — so the host registers them here, keyed by
 * artifact id, and the `client:stream` directive looks them up when it binds
 * `czap:request-snapshot` recovery. Receipt frames arriving on the SSE stream
 * are recorded through {@link recordStreamPatchReceipt}; the registry hands out
 * a LIVE (bounded) entries array so entries recorded after binding are still
 * visible at recovery time.
 *
 * Without a registration, recovery falls through to the interim snapshot
 * re-sync — the permanent floor, unchanged.
 *
 * @module
 */

import type { PatchReceiptEntry, StateCellStoreShape } from '@czap/core';
import { Diagnostics } from '@czap/core';
import { ValidationError } from '@czap/error';
import type { StreamRecoveryMutationClient } from './recovery.js';

/** Host-supplied gap-replay substrate for one streamed artifact. */
export interface StreamRecoverySubstrate {
  /** The host's QUERY read-leg endpoint (`graphQueryRoute` mount point). */
  readonly graphQueryUrl: string;
  /** The host's mutation client — supplies the local base and receives the adopted graph. */
  readonly mutationClient: StreamRecoveryMutationClient;
  /** The host's StateCell store for discrete crossing replay. */
  readonly cellStore: StateCellStoreShape;
}

/** Substrate plus the live receipt buffer, as consumed by the stream directive. */
export interface ResolvedStreamRecoverySubstrate extends StreamRecoverySubstrate {
  /** LIVE bounded buffer — receipt frames recorded after binding are visible at recovery time. */
  readonly patchReceiptEntries: readonly PatchReceiptEntry[];
}

interface SubstrateRecord {
  readonly substrate: StreamRecoverySubstrate;
  readonly entries: PatchReceiptEntry[];
}

/**
 * Bounded receipt buffer per artifact. When the buffer overflows, the OLDEST
 * entries drop first: the QUERY read always re-adopts the authoritative graph,
 * so a truncated chain only degrades discrete-crossing replay (best-effort),
 * never graph correctness.
 */
const MAX_PATCH_RECEIPT_ENTRIES = 256;

const registry = new Map<string, SubstrateRecord>();

/**
 * Register the gap-replay substrate for a streamed artifact. Returns a disposer.
 * Re-registering an artifact id that is still registered throws — two substrates
 * for one artifact means one of them silently loses, and that must be loud.
 */
export function registerStreamRecoverySubstrate(artifactId: string, substrate: StreamRecoverySubstrate): () => void {
  if (registry.has(artifactId)) {
    throw ValidationError(
      'registerStreamRecoverySubstrate',
      `a recovery substrate is already registered for artifact "${artifactId}" — dispose the previous registration first`,
    );
  }

  const record: SubstrateRecord = { substrate, entries: [] };
  registry.set(artifactId, record);

  return () => {
    if (registry.get(artifactId) === record) {
      registry.delete(artifactId);
    }
  };
}

/** Look up the registered substrate (with its live receipt buffer) for an artifact. */
export function getStreamRecoverySubstrate(artifactId: string): ResolvedStreamRecoverySubstrate | undefined {
  const record = registry.get(artifactId);
  if (!record) {
    return undefined;
  }
  return {
    ...record.substrate,
    patchReceiptEntries: record.entries,
  };
}

const isPatchReceiptEntry = (value: unknown): value is PatchReceiptEntry => {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const receipt = record.receipt;
  const patch = record.patch;
  if (
    receipt === null ||
    typeof receipt !== 'object' ||
    typeof (receipt as Record<string, unknown>).kind !== 'string'
  ) {
    return false;
  }
  if (patch === null || typeof patch !== 'object') return false;
  const patchRecord = patch as Record<string, unknown>;
  return patchRecord._tag === 'GraphPatch' && typeof patchRecord.base === 'string' && Array.isArray(patchRecord.ops);
};

/**
 * Record a receipt frame from the SSE stream into the artifact's live buffer.
 * Returns `true` when recorded. Frames for unregistered artifacts are ignored
 * (no substrate → snapshot floor, nothing to feed); malformed frames warn loudly
 * — a server emitting `receipt` events that do not parse as patch/receipt pairs
 * is a wiring bug, not a condition to launder.
 */
export function recordStreamPatchReceipt(artifactId: string, frame: unknown): boolean {
  const record = registry.get(artifactId);
  if (!record) {
    return false;
  }

  if (!isPatchReceiptEntry(frame)) {
    Diagnostics.warnOnce({
      source: 'czap/web.stream-recovery',
      code: 'malformed-patch-receipt-frame',
      message:
        `SSE receipt frame for artifact "${artifactId}" does not parse as a { receipt, patch } pair, ` +
        'so it cannot feed graph-native gap replay (#133). Emit PatchReceiptEntry-shaped receipt events, ' +
        'or drop the receipt event type from the stream.',
    });
    return false;
  }

  record.entries.push(frame);
  if (record.entries.length > MAX_PATCH_RECEIPT_ENTRIES) {
    record.entries.splice(0, record.entries.length - MAX_PATCH_RECEIPT_ENTRIES);
  }
  return true;
}
