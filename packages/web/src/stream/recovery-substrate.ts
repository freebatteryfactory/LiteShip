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

import { Effect } from 'effect';
import type { DiscreteStateTransition, PatchReceiptEntry, ReceiptEnvelope, StateCellStoreShape } from '@czap/core';
import {
  Diagnostics,
  Receipt,
  TypedRef,
  decodeDiscreteStateTransition,
  discreteTransitionPayload,
  discreteTransitionSubjectId,
} from '@czap/core';
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

const warnRejectedFrame = (artifactId: string, reason: string, cause?: unknown): void => {
  Diagnostics.warnOnce({
    source: 'czap/web.stream-recovery',
    code: 'unattested-patch-receipt-frame',
    message:
      `SSE receipt frame for artifact "${artifactId}" was REFUSED (${reason}). A frame must be a ` +
      '{ receipt, transition } pair whose receipt hash self-verifies (Receipt.hashEnvelope) and whose ' +
      'subject.id is the `${base}#${cell}` transition subject law. A frame that does not attest cannot ' +
      'feed graph-native gap replay (#133) — emit authority-minted transition receipts, or drop the event.',
    ...(cause !== undefined ? { cause } : {}),
  });
};

const isEnvelopeShape = (value: unknown): value is ReceiptEnvelope => {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.kind === 'string' &&
    typeof record.hash === 'string' &&
    typeof record.subject === 'object' &&
    record.subject !== null &&
    record.payload !== undefined &&
    record.timestamp !== undefined &&
    record.previous !== undefined
  );
};

/**
 * ATTESTATION-CHECK a candidate frame BEFORE buffering (Law 15: validate before
 * apply). A shape-only guard would buffer a forged frame — the recovery path
 * later trusts these entries, so the trust must be earned at the door:
 *   1. `decodeDiscreteStateTransition` — fail-closed tag/version/kind gate.
 *   2. `Receipt.hashEnvelope` self-consistency — the stored hash must be the
 *      sha256 of the envelope's own bytes (catches tamper / forgery).
 *   3. subject-law match — `receipt.subject` must be the `${base}#${cell}`
 *      effect subject of THIS transition, so a receipt cannot be replayed
 *      against another cell or graph.
 * Returns the typed entry, or `null` (with a loud diagnostic) on any failure.
 */
const attestPatchReceiptEntry = async (artifactId: string, frame: unknown): Promise<PatchReceiptEntry | null> => {
  if (frame === null || typeof frame !== 'object') {
    warnRejectedFrame(artifactId, 'frame is not an object');
    return null;
  }
  const record = frame as Record<string, unknown>;

  if (!isEnvelopeShape(record.receipt)) {
    warnRejectedFrame(artifactId, 'receipt is not a well-formed envelope');
    return null;
  }
  const receipt = record.receipt;

  let transition: DiscreteStateTransition;
  try {
    transition = decodeDiscreteStateTransition(record.transition);
  } catch (cause) {
    warnRejectedFrame(artifactId, 'transition failed fail-closed decode', cause);
    return null;
  }

  const computedHash = await Effect.runPromise(Receipt.hashEnvelope(receipt));
  if (computedHash !== receipt.hash) {
    warnRejectedFrame(artifactId, `receipt hash mismatch (stored ${receipt.hash}, computed ${computedHash})`);
    return null;
  }

  const expectedSubjectId = discreteTransitionSubjectId(transition);
  if (receipt.subject.type !== 'effect' || receipt.subject.id !== expectedSubjectId) {
    warnRejectedFrame(
      artifactId,
      `subject-law mismatch (expected effect:${expectedSubjectId}, got ${receipt.subject.type}:${receipt.subject.id})`,
    );
    return null;
  }

  // 4. PAYLOAD binding — the subject law binds the receipt to `(base, cell)`, but a
  //    self-consistent receipt for that subject could otherwise be re-paired with a
  //    DIFFERENT `next`/`generation`/`resultId`. Recompute the DiscreteStateTransition@1
  //    payload ref from the DECODED transition (the SAME `discreteTransitionPayload` law
  //    the mint used, Law 6) and require it to equal `receipt.payload`, so the receipt
  //    attests the exact value gap replay will apply — not merely its subject.
  const expectedPayload = await Effect.runPromise(discreteTransitionPayload(transition));
  if (!TypedRef.equals(receipt.payload, expectedPayload)) {
    warnRejectedFrame(
      artifactId,
      `payload-law mismatch (receipt.payload ${receipt.payload.content_hash} does not attest this transition value ${expectedPayload.content_hash})`,
    );
    return null;
  }

  return { receipt, transition };
};

/**
 * Record a receipt frame from the SSE stream into the artifact's live buffer.
 * Async because the attestation-check recomputes the sha256 receipt hash
 * (`crypto.subtle`). Returns `true` when recorded. Frames for unregistered
 * artifacts are ignored (no substrate → snapshot floor, nothing to feed);
 * frames that fail attestation warn loudly and are NOT buffered.
 */
export async function recordStreamPatchReceipt(artifactId: string, frame: unknown): Promise<boolean> {
  const record = registry.get(artifactId);
  if (!record) {
    return false;
  }

  const entry = await attestPatchReceiptEntry(artifactId, frame);
  if (!entry) {
    return false;
  }

  // Re-check the registration after the async attestation gap: a reconnect /
  // dispose mid-check must not resurrect a stale buffer (leak / double-apply).
  const live = registry.get(artifactId);
  if (!live || live !== record) {
    return false;
  }

  live.entries.push(entry);
  if (live.entries.length > MAX_PATCH_RECEIPT_ENTRIES) {
    live.entries.splice(0, live.entries.length - MAX_PATCH_RECEIPT_ENTRIES);
  }
  return true;
}
