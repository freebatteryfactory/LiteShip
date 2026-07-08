/**
 * Graph-native stream recovery — wires `czap:request-snapshot` and supplements
 * HTML-only gap replay with snapshot re-sync for missed discrete crossings (#133).
 *
 * @module
 */

import { Effect } from 'effect';
import type { DocumentGraph, GraphMutationClient, PatchReceiptEntry, StateCellStoreShape } from '@czap/core';
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
  readonly applyDiscreteSignal: (payload: unknown) => void;
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
  /** Patch/receipt chain spanning the missed gap (#133-full). */
  readonly patchReceiptEntries?: readonly PatchReceiptEntry[];
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
      applyDiscrete: options.handlers.applyDiscreteSignal,
    });
    if (result.query.status === 'ok' || result.query.status === 'not_modified') {
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

  return onCzap(target, 'czap:request-snapshot', () => {
    if (inFlight) {
      return;
    }

    inFlight = true;
    void runGraphNativeRecovery(options)
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
