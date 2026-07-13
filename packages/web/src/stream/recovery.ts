/**
 * Graph-native stream recovery — wires `czap:request-snapshot` and supplements
 * HTML-only gap replay with snapshot re-sync for missed discrete crossings (#133).
 *
 * @module
 */

import { Effect } from 'effect';
import type {
  DiscreteStateTransition,
  DocumentGraph,
  GraphMutationClient,
  PatchReceiptEntry,
  StateCellStoreShape,
} from '@czap/core';
import { createGraphQueryRefreshBase, graphQueryEtag, runGraphNativeGapReplay } from '@czap/core';
import { filterDiscreteSnapshotSignals, replayDroppedSignals, validateSnapshotSignalsField } from '@czap/core';
import { ValidationError } from '@czap/error';
import type { LiteShipError } from '@czap/error';
import type { ResumptionConfig, ResumeResponse } from '../types.js';
import { onCzap, dispatchCzapEvent } from '../wire/dispatch.js';
import { Resumption } from './resumption.js';

type SnapshotResponse = Extract<ResumeResponse, { readonly type: 'snapshot' }>;

/** Optional graph-mutation substrate for `refreshBase`/`adopt` during recovery. */
export type StreamRecoveryMutationClient = Pick<GraphMutationClient, 'adopt' | 'base'> & {
  readonly refreshBase?: () => Promise<DocumentGraph>;
};

/** Host callbacks for applying a recovered snapshot. */
export interface StreamRecoveryHandlers {
  readonly applyHtml: (html: string) => Promise<void>;
  /**
   * SNAPSHOT-FLOOR discrete signal application: raw, pre-filtered discrete
   * payloads from the HTML snapshot re-sync (the permanent floor). These are NOT
   * attestation-checked transitions, so the payload is deliberately `unknown`.
   */
  readonly applyDiscreteSignal: (payload: unknown) => void;
  /**
   * TYPED gap-replay seam: reflect an attestation-checked
   * {@link DiscreteStateTransition} into the host (e.g. dispatch to the DOM).
   * The typed parameter is the uncompilable seam (Law 16) — a continuous cell /
   * raw signal is not a `DiscreteStateTransition`, so it cannot be passed here.
   * Optional: absent, the crossing still hydrates the cell store; only the host
   * DOM reflection is skipped (the latent, producer-less state).
   */
  readonly applyTransition?: (transition: DiscreteStateTransition) => void;
}

/**
 * Configuration for {@link bindRequestSnapshotRecovery} and {@link runGraphNativeRecovery}.
 *
 * When `graphQueryUrl`, `mutationClient`, `cellStore`, and `patchReceiptEntries` are all
 * present, recovery prefers `runGraphNativeGapReplay` from `@czap/core` (#133-full)
 * over the interim HTML snapshot path. Snapshot remains the permanent floor when any
 * of those are absent.
 */
export interface StreamRecoveryOptions {
  readonly artifactId: string;
  readonly snapshotUrl?: string;
  readonly graphQueryUrl?: string;
  readonly endpointPolicy?: ResumptionConfig['endpointPolicy'];
  readonly mutationClient?: StreamRecoveryMutationClient;
  readonly handlers: StreamRecoveryHandlers;
  /** StateCell store for discrete gap-replay (#133-full). Required with {@link patchReceiptEntries}. */
  readonly cellStore?: StateCellStoreShape;
  /** Transition/receipt chain spanning the missed gap (#133-full). */
  readonly patchReceiptEntries?: readonly PatchReceiptEntry[];
  /**
   * Whether the rendered DOM is KNOWN-STALE (F-REC-3). Recovery is usually
   * triggered by a rejected morph, which leaves the DOM stale even after
   * gap-replay corrects the graph + cell store. When this returns `true`,
   * {@link runGraphNativeRecovery} applies fresh snapshot HTML on a successful
   * QUERY (`ok`/`not_modified`) instead of early-returning — so a valid-graph or
   * 304 read still CONVERGES the DOM. Absent/`false` preserves the gap-replay
   * fast path (no snapshot fetch when the DOM is already fresh).
   */
  readonly domStale?: () => boolean;
  /**
   * Await any in-flight receipt-frame attestation before recovery reads the buffer.
   * `recordStreamPatchReceipt` is async — it recomputes the sha256 hash to attest a
   * frame BEFORE appending it — so a receipt that arrives just before a morph
   * rejection may still be hashing when recovery fires; gap replay would then run
   * against a buffer missing that just-received crossing. Draining first serializes
   * the two: every receipt received before the trigger is buffered before the QUERY
   * reads it. Absent, recovery proceeds immediately (the interim floor is unaffected).
   */
  readonly drainPendingReceipts?: () => Promise<void>;
}

const resolveRefreshBase = (
  options: Pick<StreamRecoveryOptions, 'graphQueryUrl' | 'mutationClient'>,
): (() => Promise<DocumentGraph>) | undefined => {
  if (options.graphQueryUrl) {
    return createGraphQueryRefreshBase(options.graphQueryUrl, {
      currentEtag: () => {
        const base = options.mutationClient?.base();
        return base ? graphQueryEtag(base) : undefined;
      },
      // F-REC-4: a conditional `not_modified` read is normal — resolve to the
      // base the caller already holds instead of throwing.
      currentBase: () => options.mutationClient?.base(),
    });
  }
  return options.mutationClient?.refreshBase;
};

const snapshotConfig = (
  options: Pick<StreamRecoveryOptions, 'snapshotUrl' | 'endpointPolicy'>,
): Partial<ResumptionConfig> => ({
  ...(options.snapshotUrl ? { snapshotUrl: options.snapshotUrl } : {}),
  ...(options.endpointPolicy ? { endpointPolicy: options.endpointPolicy } : {}),
});

/** Fetch a full snapshot (html + signals + cursor) for graph-native re-sync. */
export const fetchSnapshot = (
  artifactId: string,
  config?: Partial<Pick<ResumptionConfig, 'snapshotUrl' | 'endpointPolicy'>>,
): Effect.Effect<SnapshotResponse, LiteShipError> => Resumption.fetchSnapshot(artifactId, config);

/** Dispatch only replayable discrete signal payloads — continuous transients are skipped. */
export const applyDiscreteSnapshotSignals = (
  signals: unknown,
  applyDiscreteSignal: (payload: unknown) => void,
): void => {
  for (const payload of filterDiscreteSnapshotSignals(signals)) {
    applyDiscreteSignal(payload);
  }
};

/** Adopt a refreshed graph base when the host supplies a mutation client or graph query URL. */
export const adoptRefreshedGraphBase = async (
  client: StreamRecoveryMutationClient | undefined,
  graphQueryUrl?: string,
): Promise<void> => {
  const refreshBase = resolveRefreshBase({ mutationClient: client, graphQueryUrl });
  if (!refreshBase || !client) {
    return;
  }

  const next = await refreshBase();
  client.adopt(next);
};

/**
 * Full graph-native recovery (#133).
 *
 * Prefer QUERY + patch/receipt discrete replay when the host supplies the full
 * substrate (`graphQueryUrl` + `mutationClient` + `cellStore` + `patchReceiptEntries`).
 * Otherwise fall through to interim snapshot re-sync (permanent floor).
 */
export const runGraphNativeRecovery = async (options: StreamRecoveryOptions): Promise<void> => {
  // Serialize with receipt attestation: a receipt frame received just before this
  // trigger may still be hashing (F-133 race). Drain it so gap replay reads a buffer
  // that already includes every crossing received before recovery fired.
  await options.drainPendingReceipts?.();

  const localBase = options.mutationClient?.base();
  const canGapReplay =
    options.graphQueryUrl !== undefined &&
    options.mutationClient !== undefined &&
    options.cellStore !== undefined &&
    options.patchReceiptEntries !== undefined &&
    localBase !== undefined;

  if (canGapReplay) {
    const result = await runGraphNativeGapReplay({
      queryUrl: options.graphQueryUrl!,
      localBase: localBase!,
      entries: options.patchReceiptEntries!,
      cellStore: options.cellStore!,
      adopt: (graph) => options.mutationClient!.adopt(graph),
      ...(options.handlers.applyTransition !== undefined ? { applyTransition: options.handlers.applyTransition } : {}),
    });
    if (result.query.status === 'ok' || result.query.status === 'not_modified') {
      // F-REC-3: gap-replay corrected the graph + cell store, but a rejected
      // morph leaves the RENDERED DOM stale. A valid-graph read (or a 304) does
      // not converge the DOM on its own — apply fresh snapshot HTML when the DOM
      // is known-stale so both `ok`+stale-DOM and `not_modified`+stale-DOM reach
      // a fresh DOM (and the 304 no longer early-returns a stale view).
      if (options.domStale?.() === true) {
        const snapshot = await Effect.runPromise(fetchSnapshot(options.artifactId, snapshotConfig(options)));
        await applyGraphNativeSnapshot(snapshot, options.handlers);
      }
      return;
    }
    // QUERY refused/error — still attempt a conditional refresh before the
    // snapshot floor so the host's base is as current as the read-leg allows.
    await adoptRefreshedGraphBase(options.mutationClient, options.graphQueryUrl);
  } else {
    await adoptRefreshedGraphBase(options.mutationClient, options.graphQueryUrl);
  }

  const snapshot = await Effect.runPromise(fetchSnapshot(options.artifactId, snapshotConfig(options)));

  await applyGraphNativeSnapshot(snapshot, options.handlers);
};

/** Apply snapshot html and replayable discrete signals only. */
export const applyGraphNativeSnapshot = async (
  snapshot: SnapshotResponse,
  handlers: StreamRecoveryHandlers,
): Promise<void> => {
  const signalsError = validateSnapshotSignalsField(snapshot.signals);
  if (signalsError) {
    throw ValidationError('StreamRecovery', signalsError);
  }

  await handlers.applyHtml(snapshot.html);
  applyDiscreteSnapshotSignals(snapshot.signals, handlers.applyDiscreteSignal);
};

/**
 * After HTML gap replay, supplement missed discrete crossings via snapshot re-sync
 * when the replay payload dropped non-HTML signal frames.
 */
export const supplementReplayIfSignalsDropped = async (
  patches: readonly unknown[],
  options: StreamRecoveryOptions,
): Promise<void> => {
  if (!replayDroppedSignals(patches)) {
    return;
  }

  await adoptRefreshedGraphBase(options.mutationClient, options.graphQueryUrl);

  const snapshot = await Effect.runPromise(fetchSnapshot(options.artifactId, snapshotConfig(options)));

  const signalsError = validateSnapshotSignalsField(snapshot.signals);
  if (signalsError) {
    throw ValidationError('StreamRecovery', signalsError);
  }

  applyDiscreteSnapshotSignals(snapshot.signals, options.handlers.applyDiscreteSignal);
};

/**
 * Wire the production listener for `czap:request-snapshot` (morph rejection recovery).
 * Returns a disposer for teardown.
 */
export const bindRequestSnapshotRecovery = (target: EventTarget, options: StreamRecoveryOptions): (() => void) => {
  let inFlight = false;

  return onCzap(target, 'czap:request-snapshot', (detail) => {
    if (inFlight) {
      return;
    }

    inFlight = true;
    // A trigger can declare the DOM FRESH via `detail.domStale: false` (e.g. a receipt-only
    // resume that applies a state crossing with no failed morph). Honor it for this invocation
    // so gap replay applies the crossing WITHOUT the post-replay snapshot floor. Absent → the
    // binding's own `domStale` (morph-rejection recovery treats the rendered DOM as stale).
    const effective = detail?.domStale !== undefined ? { ...options, domStale: () => detail.domStale! } : options;
    void runGraphNativeRecovery(effective)
      .catch((error) => {
        dispatchCzapEvent(target, 'czap:stream-error', {
          reason: 'snapshot-recovery-failed',
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        inFlight = false;
      });
  });
};
