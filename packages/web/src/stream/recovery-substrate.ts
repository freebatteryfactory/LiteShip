/**
 * Host-registered gap-replay substrate for graph-native stream recovery (#133-full).
 *
 * `runGraphNativeGapReplay` needs four things the stream DIRECTIVE cannot invent:
 * the QUERY endpoint, the host's mutation client (base + adopt), the StateCell
 * store, and the patch/receipt chain spanning the gap. The first three are
 * host-owned by design — so the host registers them here, keyed by
 * artifact id, and the `client:stream` directive looks them up when it binds
 * `liteship:request-snapshot` recovery. Receipt frames arriving on the SSE stream
 * are recorded through {@link recordStreamPatchReceipt}; the registry hands out
 * a LIVE (bounded) entries array so entries recorded after binding are still
 * visible at recovery time.
 *
 * Without a registration, recovery falls through to the interim snapshot
 * re-sync — the permanent floor, unchanged.
 *
 * @module
 */

import type {
  ChainValidationOptions,
  DiscreteStateTransition,
  PatchReceiptEntry,
  ReceiptEnvelope,
  StateCellStore,
} from '@liteship/core';
import {
  DAG,
  Diagnostics,
  Receipt,
  TypedRef,
  decodeDiscreteStateTransition,
  discreteTransitionPayload,
  discreteTransitionSubjectId,
} from '@liteship/core';
import { ValidationError } from '@liteship/error';
import type { StreamRecoveryMutationClient } from './recovery.js';

/** Host-supplied gap-replay substrate for one streamed artifact. */
export interface StreamRecoverySubstrate {
  /** The host's QUERY read-leg endpoint (`graphQueryRoute` mount point). */
  readonly graphQueryUrl: string;
  /** The host's mutation client — supplies the local base and receives the adopted graph. */
  readonly mutationClient: StreamRecoveryMutationClient;
  /** The host's StateCell store for discrete crossing replay. */
  readonly cellStore: StateCellStore;
}

/** Substrate plus the live receipt buffer, as consumed by the stream directive. */
export interface ResolvedStreamRecoverySubstrate extends StreamRecoverySubstrate {
  /** LIVE bounded buffer — receipt frames recorded after binding are visible at recovery time. */
  readonly patchReceiptEntries: readonly PatchReceiptEntry[];
  /**
   * Checkpoint-attestation retention (issue #150). Present after the bounded
   * buffer evicted a prefix: `base` is the evicted watermark receipt's hash (the
   * `previous` of the first retained entry) and `checkpoint` is the genesis-shaped
   * `DAG.checkpoint` attestation minted over the dropped region AT EVICTION TIME
   * (the only moment the dropped envelopes are still in hand). Threading it into
   * gap replay lets the retained suffix pass `validateChainDetailed` without its
   * dropped prefix — previously a long-lived session's replay failed `not_genesis`
   * and every missed crossing silently degraded to the snapshot floor.
   */
  readonly chainValidation?: ChainValidationOptions;
}

interface SubstrateRecord {
  readonly substrate: StreamRecoverySubstrate;
  readonly entries: PatchReceiptEntry[];
  /** Live retention state — replaced on every successful prefix compaction. */
  chainValidation?: ChainValidationOptions;
  /** Serializes compactions: concurrent overflows must chain, never interleave. */
  compaction: Promise<void>;
}

/**
 * Bounded receipt buffer per artifact. When the buffer overflows, the OLDEST
 * entries drop first: the QUERY read always re-adopts the authoritative graph,
 * so a truncated chain only degrades discrete-crossing replay (best-effort),
 * never graph correctness. Eviction MINTS a checkpoint attestation over the
 * dropped prefix (issue #150) so the retained suffix stays replayable.
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

  const record: SubstrateRecord = { substrate, entries: [], compaction: Promise.resolve() };
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
  const resolved = {
    ...record.substrate,
    patchReceiptEntries: record.entries,
  };
  // LIVE like the buffer: the substrate is resolved at BIND time but evictions
  // happen later — a snapshot here would hand recovery a stale (or absent)
  // retention. The getter always reads the record's current state.
  Object.defineProperty(resolved, 'chainValidation', {
    enumerable: true,
    get: () => record.chainValidation,
  });
  return resolved as ResolvedStreamRecoverySubstrate;
}

const warnRejectedFrame = (artifactId: string, reason: string, cause?: unknown): void => {
  Diagnostics.warnOnceRegistered({
    source: 'liteship/web.stream-recovery',
    code: 'web/stream/unattested-patch-receipt-frame',
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

  const computedHash = await Receipt.hashEnvelope(receipt);
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
  const expectedPayload = await discreteTransitionPayload(transition);
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
    // Serialize compactions: minting the checkpoint hashes via crypto.subtle, and
    // two overflowing records interleaving at that await would double-drop or
    // attest against a moved watermark. The chain makes each compaction see the
    // buffer its predecessor left.
    live.compaction = live.compaction.then(() => compactBufferPrefix(artifactId, live));
    await live.compaction;
  }
  return true;
}

/**
 * Evict the buffer's oldest prefix, minting checkpoint-attestation retention
 * over the dropped region (issue #150).
 *
 * The watermark is the dropped receipt the first RETAINED entry's `previous`
 * names — the exact hash `validateChainDetailed`'s widened genesis predicate
 * will compare against. The attestation is minted by `DAG.checkpoint` over the
 * dropped envelopes (watermark + its buffered ancestors) BEFORE the prefix is
 * spliced away: eviction is the only moment the dropped set is still in hand.
 *
 * DEGRADATION IS FAIL-SAFE, never fail-wrong: when the watermark cannot be
 * established (a merge-parent first-retained entry, a fork prefix the watermark
 * does not dominate, an out-of-buffer `previous`), the prefix is still evicted
 * but retention is CLEARED — replay then refuses `not_genesis` exactly as
 * before this feature, and the QUERY/snapshot floor corrects the view.
 */
async function compactBufferPrefix(artifactId: string, record: SubstrateRecord): Promise<void> {
  const overflow = record.entries.length - MAX_PATCH_RECEIPT_ENTRIES;
  if (overflow <= 0) return;
  const dropped = record.entries.slice(0, overflow);
  const firstRetained = record.entries[overflow];

  const evictWithoutRetention = (reason: string): void => {
    record.entries.splice(0, overflow);
    record.chainValidation = undefined;
    Diagnostics.warnOnceRegistered({
      source: 'liteship/web.stream-recovery',
      code: 'web/stream/receipt-buffer-compaction-unattested',
      message:
        `receipt buffer for artifact "${artifactId}" evicted ${overflow} entr(y/ies) WITHOUT checkpoint ` +
        `retention (${reason}). Gap replay across this eviction will refuse the truncated chain ` +
        '(not_genesis) and recovery degrades to the QUERY/snapshot floor — safe, but the discrete ' +
        'crossings in the dropped prefix will not replay.',
    });
  };

  const previous = firstRetained?.receipt.previous;
  const watermark = typeof previous === 'string' ? previous : undefined;
  if (watermark === undefined || !dropped.some((entry) => entry.receipt.hash === watermark)) {
    evictWithoutRetention(
      watermark === undefined
        ? 'the first retained entry has a merge-parent `previous`, so no single watermark exists'
        : 'the first retained entry chains to a receipt outside the dropped prefix',
    );
    return;
  }

  try {
    // Mint over the watermark's OWN lineage (its `previous`-chain within the
    // dropped prefix), not the whole prefix: a dead fork sibling being evicted
    // alongside the chain is not an ancestor of the watermark, and including it
    // would trip `dag.checkpoint`'s dominance precondition for a region the
    // retained buffer never chains through.
    const byHash = new Map(dropped.map((entry) => [entry.receipt.hash, entry.receipt]));
    const lineage: ReceiptEnvelope[] = [];
    for (let cursor: string | undefined = watermark; cursor !== undefined;) {
      const envelope: ReceiptEnvelope | undefined = byHash.get(cursor);
      if (envelope === undefined) break; // pre-buffer ancestor (or prior watermark) — the lineage root.
      lineage.push(envelope);
      cursor = typeof envelope.previous === 'string' ? envelope.previous : undefined;
    }
    const dag = DAG.fromReceipts(lineage);
    const minted = await DAG.checkpoint(dag, { below: watermark });
    record.entries.splice(0, overflow);
    record.chainValidation = { base: watermark, checkpoint: minted.checkpoint };
  } catch (cause) {
    evictWithoutRetention(cause instanceof Error ? cause.message : String(cause));
  }
}
