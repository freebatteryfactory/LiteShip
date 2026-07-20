import {
  wallClock,
  validateSnapshotSignalsField,
  replayDroppedSignals,
  Diagnostics,
  Lifetime,
  StateCellStore,
  createGraphMutationClient,
  decodeDocumentGraph,
  sealGraph,
} from '@liteship/core';
import type { DocumentGraph, StateAuthority, StateCellKind, StateCellStoreShape } from '@liteship/core';
import {
  Morph,
  Resumption,
  SSE,
  SlotAddressing,
  SlotRegistry,
  resolveHtmlString,
  dispatchLiteshipEvent,
  streamWireAttr,
  bindRequestSnapshotRecovery,
  fetchSnapshot,
  applyDiscreteSnapshotSignals,
  getStreamRecoverySubstrate,
  recordStreamPatchReceipt,
  registerStreamRecoverySubstrate,
} from '@liteship/web';
import type { ResumeResponse, SSEClient, SSEMessage, SSEState } from '@liteship/web';
import { bootstrapSlots, rescanSlots } from './slots.js';
import { readRuntimeHtmlPolicy, readRuntimeEndpointPolicy } from './policy.js';
import { createStreamScheduler } from './stream-session.js';
import { allowRuntimeEndpointUrl } from './url-policy.js';
import { bootDirectiveEntry } from './directive-bound.js';

type Locator =
  | { readonly type: 'slot'; readonly value: string }
  | { readonly type: 'id'; readonly value: string }
  | { readonly type: 'semantic-id'; readonly value: string };

function targetLocator(element: HTMLElement): Locator | null {
  const slot = element.getAttribute('data-liteship-slot');
  if (slot) {
    return { type: 'slot', value: slot };
  }

  if (element.id) {
    return { type: 'id', value: element.id };
  }

  const semanticId = element.getAttribute('data-liteship-id');
  if (semanticId) {
    return { type: 'semantic-id', value: semanticId };
  }

  return null;
}

function findTarget(locator: Locator | null): HTMLElement | null {
  if (!locator) {
    return null;
  }

  switch (locator.type) {
    case 'slot': {
      const el = SlotRegistry.findElement(SlotAddressing.brand(locator.value));
      /* v8 ignore next — slot elements are always HTML host elements (divs/sections/etc.);
         this narrows SlotRegistry.findElement's generic `Element | null` return so SVG-like
         non-HTML descendants are rejected if they ever leak into the slot registry. */
      return el instanceof HTMLElement ? el : null;
    }
    case 'id':
      return document.getElementById(locator.value);
    case 'semantic-id': {
      const root = document.documentElement;
      if (root.getAttribute('data-liteship-id') === locator.value) {
        return root;
      }

      for (const candidate of Array.from(root.querySelectorAll('[data-liteship-id]'))) {
        if (candidate.getAttribute('data-liteship-id') === locator.value && candidate instanceof HTMLElement) {
          return candidate;
        }
      }

      return null;
    }
  }
}

function messageHtml(message: SSEMessage): string | null {
  if ((message.type === 'patch' || message.type === 'batch') && typeof message.data === 'string') {
    return message.data;
  }

  if (message.type === 'snapshot' && message.data !== null && typeof message.data === 'object') {
    if ('html' in message.data && typeof message.data.html === 'string') {
      return message.data.html;
    }
    return null;
  }

  return null;
}

function replayHtml(patch: unknown): string | null {
  if (typeof patch === 'string') {
    return patch;
  }

  if (patch !== null && typeof patch === 'object') {
    if ('html' in patch && typeof patch.html === 'string') {
      return patch.html;
    }
    if ('data' in patch && typeof patch.data === 'string') {
      return patch.data;
    }
  }

  return null;
}

/**
 * A `{ type: 'receipt', data }` frame in a resume-replay batch. The app-level replay
 * comes back through `applyResumeResponse`, not `handleMessage`, so a receipt missed
 * during the disconnect arrives HERE — and `replayHtml` (drops non-HTML) / `replayDroppedSignals`
 * (notices only `signal`) would silently discard it, leaving QUERY gap replay with no
 * entry and state-only crossings stale after reconnect (Codex P2). This lets the resume
 * path route receipts through the SAME attestation buffer the live path uses.
 */
function isReceiptFrame(patch: unknown): patch is { readonly type: 'receipt'; readonly data: unknown } {
  return (
    patch !== null &&
    typeof patch === 'object' &&
    'type' in patch &&
    (patch as { readonly type?: unknown }).type === 'receipt'
  );
}

function patchCouldInvalidateSlots(
  locator: Locator | null,
  morphStyle: 'innerHTML' | 'outerHTML',
  html: string,
): boolean {
  if (morphStyle === 'outerHTML') {
    return true;
  }

  if (locator?.type === 'slot') {
    return true;
  }

  return (
    html.includes('data-liteship-slot') ||
    html.includes('data-liteship-id') ||
    html.includes(' id=') ||
    html.includes(' id="') ||
    html.includes(" id='")
  );
}

function saveResumptionState(artifactId: string | undefined, lastEventId: string): void {
  if (!artifactId || !lastEventId) {
    return;
  }

  const parsed = Resumption.parseEventId(lastEventId);
  // `Resumption.saveState` is a synchronous localStorage write — call it directly.
  Resumption.saveState({
    artifactId,
    lastEventId,
    lastSequence: parsed.sequence,
    // Epoch wall-clock stamp for the resumption record — routed through
    // `wallClock` (the epoch entropy boundary), not the monotonic systemClock,
    // since the timestamp is a real point in time consumers read as epoch ms.
    timestamp: wallClock.now(),
  });
}

function hasCustomEndpointPolicy(policy: ReturnType<typeof readRuntimeEndpointPolicy>): boolean {
  return (
    policy.mode !== 'same-origin' ||
    policy.allowOrigins.length > 0 ||
    Object.values(policy.byKind).some((allowlist) => allowlist.length > 0)
  );
}

/**
 * Graph-native recovery opt-in attributes (#133-full). Read DIRECTLY off the host
 * element (like `client:graph`'s `data-liteship-graph`), not through the stream wire
 * registry: they configure the host-owned recovery SUBSTRATE, not the SSE
 * transport. A plain stream (no `data-liteship-stream-graph`) keeps the snapshot floor
 * unchanged — the graph-native path is strictly additive and never the default.
 *
 * - `data-liteship-stream-graph`   — the host's QUERY read-leg (and mutation POST)
 *   endpoint. Its presence GATES the whole substrate.
 * - `data-liteship-stream-graph-base` — the SSR-inlined, sealed {@link DocumentGraph}
 *   the client starts from (the local base the QUERY re-adopts against). Inlined,
 *   not fetched, so registration is synchronous and cannot race a reinit.
 * - `data-liteship-stream-cells`   — the SSR-inlined StateCell registrations the
 *   crossings replay INTO. Gap replay skips a cell the store never registered
 *   (host owns the registry), so the host must declare them here.
 */
const STREAM_GRAPH_QUERY_ATTR = 'data-liteship-stream-graph';
const STREAM_GRAPH_BASE_ATTR = 'data-liteship-stream-graph-base';
const STREAM_GRAPH_CELLS_ATTR = 'data-liteship-stream-cells';

/** One SSR-inlined StateCell registration for the graph-native recovery store. */
interface StreamCellRegistration {
  readonly name: string;
  readonly states: readonly string[];
  readonly kind?: StateCellKind;
  readonly authority?: StateAuthority;
}

const isStreamCellRegistration = (value: unknown): value is StreamCellRegistration => {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === 'string' &&
    record.name.length > 0 &&
    Array.isArray(record.states) &&
    record.states.length > 0 &&
    record.states.every((state) => typeof state === 'string') &&
    (record.kind === undefined || record.kind === 'discrete' || record.kind === 'continuous') &&
    (record.authority === undefined || typeof record.authority === 'string')
  );
};

/**
 * Decode the SSR-inlined base graph through the FAIL-CLOSED reader
 * ({@link decodeDocumentGraph}) and re-seal it so its `id`/`digest` are the
 * program's own addresses (a stale inlined digest cannot smuggle a wrong etag
 * into the conditional QUERY read). Returns `null` — loudly — on any malformed
 * payload so the substrate is NOT registered and recovery keeps the snapshot floor.
 */
function decodeStreamGraphBase(raw: string): DocumentGraph | null {
  try {
    return sealGraph(decodeDocumentGraph(JSON.parse(raw) as unknown));
  } catch (cause) {
    Diagnostics.warnOnce({
      source: 'liteship/astro.stream',
      code: 'stream-graph-base-malformed',
      message:
        `The ${STREAM_GRAPH_BASE_ATTR} inlined base graph did not decode as a well-formed DocumentGraph — ` +
        'graph-native recovery is NOT armed for this stream; recovery falls back to the snapshot floor. ' +
        'Serialize a sealed DocumentGraph (e.g. `JSON.stringify(currentGraph())`).',
      cause,
    });
    return null;
  }
}

/** Parse the SSR-inlined cell registrations; `null` (loudly) when malformed. */
function parseStreamCellRegistrations(raw: string): readonly StreamCellRegistration[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    Diagnostics.warnOnce({
      source: 'liteship/astro.stream',
      code: 'stream-graph-cells-malformed',
      message: `The ${STREAM_GRAPH_CELLS_ATTR} inlined cell registrations were not valid JSON — graph-native recovery is NOT armed.`,
      cause,
    });
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isStreamCellRegistration)) {
    Diagnostics.warnOnce({
      source: 'liteship/astro.stream',
      code: 'stream-graph-cells-malformed',
      message:
        `The ${STREAM_GRAPH_CELLS_ATTR} inlined cell registrations must be a non-empty array of ` +
        '`{ name: string, states: string[], kind?, authority? }` — graph-native recovery is NOT armed.',
    });
    return null;
  }
  return parsed;
}

/**
 * Entry point for the `client:stream` directive. Opens an SSE client
 * to the `data-liteship-stream-url` endpoint, funnels incoming HTML
 * patches through a {@link createStreamScheduler}, and triggers slot
 * rescans when necessary. Honors `liteship:reinit` (re-read) / `liteship:teardown`
 * (final tear-down) to survive Astro view transitions.
 */
export function initStreamDirective(load: () => Promise<unknown>, element: HTMLElement): void {
  bootstrapSlots();
  const endpointPolicy = readRuntimeEndpointPolicy();
  const htmlPolicy = readRuntimeHtmlPolicy();
  const prepareHtml = (html: string): string =>
    resolveHtmlString(html, {
      policy: htmlPolicy.streamDefault,
      allowTrustedHtml: htmlPolicy.allowTrustedHtml,
    });

  let target = element;
  let reinitTarget: HTMLElement | null = null;
  const streamUrl = allowRuntimeEndpointUrl(
    target.getAttribute(streamWireAttr('url')),
    'stream',
    'liteship/astro.stream',
    {
      crossOriginRejected: 'stream-cross-origin-url-rejected',
      malformedUrl: 'stream-malformed-url-rejected',
      originNotAllowed: 'stream-origin-not-allowed',
      endpointKindNotPermitted: 'stream-endpoint-kind-not-permitted',
    },
    endpointPolicy,
  );
  if (!streamUrl) {
    return;
  }

  const artifactId = target.getAttribute(streamWireAttr('artifact')) ?? undefined;
  const morphStyle = (target.getAttribute(streamWireAttr('morph')) ?? 'innerHTML') as 'innerHTML' | 'outerHTML';
  const snapshotUrl =
    allowRuntimeEndpointUrl(
      target.getAttribute(streamWireAttr('snapshotUrl')),
      'snapshot',
      'liteship/astro.stream',
      {
        crossOriginRejected: 'snapshot-cross-origin-url-rejected',
        malformedUrl: 'snapshot-malformed-url-rejected',
        originNotAllowed: 'snapshot-origin-not-allowed',
        endpointKindNotPermitted: 'snapshot-endpoint-kind-not-permitted',
      },
      endpointPolicy,
    ) ?? undefined;
  const replayUrl =
    allowRuntimeEndpointUrl(
      target.getAttribute(streamWireAttr('replayUrl')),
      'replay',
      'liteship/astro.stream',
      {
        crossOriginRejected: 'replay-cross-origin-url-rejected',
        malformedUrl: 'replay-malformed-url-rejected',
        originNotAllowed: 'replay-origin-not-allowed',
        endpointKindNotPermitted: 'replay-endpoint-kind-not-permitted',
      },
      endpointPolicy,
    ) ?? undefined;

  let recoveryPending = false;
  let pendingLocator: Locator | null = null;

  // The hardened SSE primitive (`@liteship/web` `SSE.create`) now owns the
  // `EventSource`, exponential-backoff reconnect, the heartbeat watchdog, and
  // the bounded overflow buffer (default `coalesce-by-id` — stream patches are
  // `data-liteship-id`-addressed). Messages and connection edges are delivered
  // SYNCHRONOUSLY via `onMessage` / `onStateChange` callbacks, so this directive
  // owns just ONE `Lifetime` per connection (replacing the former per-connection
  // ManagedRuntime+Scope): the client's transport teardown (EventSource close +
  // source null + queue shutdown) is registered as a synchronous finalizer on it.
  // Teardown disposes the Lifetime, which runs that finalizer synchronously so a
  // straggler frame from a dead generation cannot morph the fresh one on reinit.
  let lifetime: Lifetime | null = null;
  let client: SSEClient | null = null;
  // Cursor carried ACROSS connections (reinit / VT-swap). `SSE.create` tracks
  // `lastEventId` per-connection, so a fresh connection opened on reinit must be
  // re-seeded with the last message's cursor — otherwise the tail restarts from
  // the top instead of resuming where the swapped-out connection left off.
  let lastCursor: string | null = null;

  // In-flight receipt attestations (F-133 race): `recordStreamPatchReceipt` is async
  // (it re-hashes to attest before buffering), so a receipt frame received just before
  // a morph rejection may still be settling when recovery fires. Recovery drains this
  // set first (see `drainPendingReceipts` below), so gap replay reads a buffer that
  // already includes every crossing received before the trigger.
  const inFlightReceipts = new Set<Promise<unknown>>();

  const bindReinit = (nextTarget: HTMLElement): void => {
    if (reinitTarget === nextTarget) {
      return;
    }

    reinitTarget?.removeEventListener('liteship:reinit', handleReinit);
    reinitTarget = nextTarget;
    reinitTarget.addEventListener('liteship:reinit', handleReinit);
  };

  const patchScheduler = createStreamScheduler({
    applyHtml: (html) => {
      const locator = targetLocator(target);
      pendingLocator = locator;
      // `Morph.morphWithState` applies the DOM morph synchronously — call it directly.
      Morph.morphWithState(target, html, {
        morphStyle,
        preserveFocus: true,
        preserveScroll: true,
        preserveSelection: true,
      });

      if (locator && locator.type !== 'slot') {
        target = findTarget(locator) ?? target;
      }
    },
    onFlush: ({ patchCount, requiresRescan }) => {
      if (requiresRescan) {
        rescanSlots(document.documentElement);
      }

      target = findTarget(pendingLocator) ?? target;
      bindReinit(target);
      bindSnapshotRecovery(target);
      for (let index = 0; index < patchCount; index++) {
        dispatchLiteshipEvent(target, 'liteship:stream-morph');
      }
      pendingLocator = null;
    },
  });

  const enqueueHtml = (html: string): Promise<void> => {
    const normalizedHtml = prepareHtml(html);
    return patchScheduler.enqueue({
      html: normalizedHtml,
      requiresRescan: patchCouldInvalidateSlots(targetLocator(target), morphStyle, normalizedHtml),
    });
  };

  const applyResumeResponse = async (response: ResumeResponse): Promise<void> => {
    const locator = targetLocator(target);
    if (locator) {
      target = findTarget(locator) ?? target;
    }

    if (response.type === 'snapshot') {
      const signalsError = validateSnapshotSignalsField(response.signals);
      if (signalsError) {
        dispatchLiteshipEvent(target, 'liteship:stream-error', {
          reason: 'snapshot-signals-invalid',
          message: signalsError,
        });
        return;
      }

      await enqueueHtml(response.html);
      applyDiscreteSnapshotSignals(response.signals, (payload) => {
        dispatchLiteshipEvent(target, 'liteship:signal', payload);
      });
      return;
    }

    // Attest any receipt frames the resumption returned through the SAME buffer the live
    // path uses (handleMessage's receipt branch). Without this the missed crossing is
    // dropped by the HTML/signal filters below and QUERY gap replay has no entry, so
    // state-only crossings stay stale after reconnect (Codex P2). Track each in
    // `inFlightReceipts` so a recovery firing before it settles drains it first.
    let bufferedReceipts = false;
    if (artifactId !== undefined) {
      for (const patch of response.patches) {
        if (!isReceiptFrame(patch)) continue;
        bufferedReceipts = true;
        const pending = recordStreamPatchReceipt(artifactId, patch.data).catch(() => false);
        inFlightReceipts.add(pending);
        void pending.finally(() => inFlightReceipts.delete(pending));
      }
    }

    const dropped = artifactId !== undefined && replayDroppedSignals(response.patches);
    let recoveredSignals: unknown = undefined;

    if (dropped) {
      try {
        // `fetchSnapshot` is Promise-first (rejects with a tagged @liteship/error on
        // failure) — await it directly; the surrounding catch handles rejection.
        const snapshot = await fetchSnapshot(artifactId!, {
          ...(snapshotUrl ? { snapshotUrl } : {}),
          ...(hasCustomEndpointPolicy(endpointPolicy) ? { endpointPolicy } : {}),
        });
        const signalsError = validateSnapshotSignalsField(snapshot.signals);
        if (signalsError) {
          dispatchLiteshipEvent(target, 'liteship:stream-error', {
            reason: 'resume-failed',
            message: signalsError,
          });
          return;
        }
        recoveredSignals = snapshot.signals;
      } catch (error) {
        dispatchLiteshipEvent(target, 'liteship:stream-error', {
          reason: 'resume-failed',
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }
    }

    const patches = response.patches
      .map((patch) => replayHtml(patch))
      .filter((html): html is string => html !== null)
      .map((html) => ({
        html,
        requiresRescan: patchCouldInvalidateSlots(targetLocator(target), morphStyle, html),
      }));

    await patchScheduler.enqueueBatch(patches);

    if (recoveredSignals !== undefined) {
      applyDiscreteSnapshotSignals(recoveredSignals, (payload) => {
        dispatchLiteshipEvent(target, 'liteship:signal', payload);
      });
    }

    // A discrete state crossing is emitted as a receipt-ONLY frame (no paired signal, no HTML) —
    // the receipt IS the carrier. Such a missed crossing was just buffered above, but nothing has
    // APPLIED it: replayHtml dropped it and `dropped` was false, so no snapshot floor ran. Without
    // a trigger it stays buffered-but-unapplied and the StateCell/semantic state remains stale
    // until some unrelated recovery fires (Codex P2). Drive the graph-native recovery now — but
    // ONLY when a QUERY substrate exists (the only path that can gap-replay a buffered receipt),
    // and mark the DOM FRESH (`domStale: false`): unlike a morph rejection, no failed morph left
    // the view stale, so recovery must apply the crossing to the cell store WITHOUT a snapshot
    // floor (which would false-error absent a snapshot URL, or needlessly replace fresh DOM).
    // When `dropped`, the snapshot floor above already converged the state, so this is skipped.
    if (
      bufferedReceipts &&
      !dropped &&
      artifactId !== undefined &&
      getStreamRecoverySubstrate(artifactId) !== undefined
    ) {
      dispatchLiteshipEvent(target, 'liteship:request-snapshot', { reason: 'resume-receipts', domStale: false });
    }
  };

  const reconcileResumption = async (currentEventId: string): Promise<void> => {
    const resolvedArtifactId = artifactId!;
    try {
      // `Resumption.resume` is Promise-first (rejects with a tagged @liteship/error on
      // failure) — await it directly; the surrounding catch handles rejection.
      const response = await Resumption.resume(resolvedArtifactId, currentEventId, {
        ...(snapshotUrl ? { snapshotUrl } : {}),
        ...(replayUrl ? { replayUrl } : {}),
        ...(hasCustomEndpointPolicy(endpointPolicy) ? { endpointPolicy } : {}),
      });
      await applyResumeResponse(response);
    } catch (error) {
      dispatchLiteshipEvent(target, 'liteship:stream-error', {
        reason: 'resume-failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Consumer side: fold each pulled SSE message into the render scheduler. The
  // cursor is read from the primitive (`client.lastEventId`) rather than a raw
  // `event.lastEventId` — `SSE.create` tracks it internally and re-sends it on
  // reconnect. `saveResumptionState`/`reconcileResumption` are driven exactly
  // as before, but resumption is now armed by the `reconnecting` edge instead
  // of `onerror` (see `handleEdge`).
  const handleMessage = (message: SSEMessage): void => {
    const currentEventId = client ? client.lastEventId : null;
    if (currentEventId) {
      lastCursor = currentEventId;
      // Reconcile the disconnect gap BEFORE persisting the current cursor. On the
      // first post-reconnect frame, `Resumption.resume` loads the PRE-disconnect
      // persisted cursor (`loadState` is a synchronous localStorage read) to size
      // the replay gap `parsed.sequence - (prevState.lastSequence + 1)`. Persisting
      // `currentEventId` first would set `lastSequence` to the current sequence,
      // collapsing the gap to `<= 0` and silently dropping every patch missed
      // while disconnected. Reconcile first (reads the old cursor), then persist.
      if (recoveryPending && artifactId) {
        recoveryPending = false;
        void reconcileResumption(currentEventId);
      }
      saveResumptionState(artifactId, currentEventId);
    }

    if (message.type === 'signal') {
      dispatchLiteshipEvent(target, 'liteship:signal', message.data);
      return;
    }

    if (message.type === 'receipt') {
      // Feed the gap-replay receipt buffer (#133-full) when the host registered
      // a recovery substrate; without one the frame has no consumer. Track the
      // in-flight attestation so a recovery firing before it settles drains it first.
      if (artifactId !== undefined) {
        const pending = recordStreamPatchReceipt(artifactId, message.data).catch(() => false);
        inFlightReceipts.add(pending);
        void pending.finally(() => inFlightReceipts.delete(pending));
      }
      return;
    }

    if (message.type === 'heartbeat') {
      return;
    }

    const html = messageHtml(message);
    if (html) {
      void enqueueHtml(html);
    }
  };

  // Edge side: map connection-state transitions onto the directive's public
  // lifecycle CustomEvents. `connected` fires once per `connecting/reconnecting
  // -> connected` transition (first message after (re)open), `reconnecting`
  // once per lost connection (transport `onerror` OR the heartbeat watchdog),
  // and `error` only when the primitive exhausts its backoff budget.
  const handleEdge = (state: SSEState): void => {
    switch (state) {
      case 'connected':
        patchScheduler.activate();
        dispatchLiteshipEvent(target, 'liteship:stream-connected');
        return;
      case 'reconnecting':
        recoveryPending = artifactId !== undefined && (client ? client.lastEventId !== null : false);
        patchScheduler.beginReconnect();
        dispatchLiteshipEvent(target, 'liteship:stream-disconnected');
        return;
      case 'error':
        dispatchLiteshipEvent(target, 'liteship:stream-error', { reason: 'max-reconnect-attempts' });
        return;
      default:
        // 'connecting' (initial) and 'disconnected' (intentional close) carry
        // no directive-level event.
        return;
    }
  };

  const openClient = (): void => {
    // One `Lifetime` per connection replaces the former ManagedRuntime+Scope.
    // `SSE.create` builds the EventSource + timers synchronously (AbortController-
    // first) and returns the client directly — no Scope to provide, no runtime to
    // run. Its transport teardown is registered as a synchronous finalizer on the
    // Lifetime below.
    //
    // Messages and connection edges are delivered SYNCHRONOUSLY via callbacks —
    // so a patch/snapshot/signal is handled within the same dispatch turn as its
    // `onmessage`. The directive's own rAF render batching (`enqueueHtml`/
    // `patchScheduler`) owns throttling; an async buffer would only add latency
    // and could reorder relative to that scheduler.
    const next = Lifetime.make();
    const created = SSE.create({
      url: streamUrl,
      ...(artifactId ? { artifactId } : {}),
      ...(lastCursor ? { lastEventId: lastCursor } : {}),
      onMessage: handleMessage,
      onStateChange: handleEdge,
    });
    // The client's `close()` (EventSource close + source null + queue shutdown) is
    // a synchronous disposer — register it as the Lifetime's finalizer.
    next.add(() => created.close());
    lifetime = next;
    client = created;
  };

  const closeClient = (): void => {
    if (lifetime) {
      const closing = lifetime;
      lifetime = null;
      client = null;
      // Dispose SYNCHRONOUSLY before the replacement opens: the client's `close`
      // finalizer closes the EventSource, nulls the primitive's `source`, and
      // shuts the queues in one pass — all synchronous, so it lands inside this
      // `dispose()` call. A frame from the old generation therefore cannot morph
      // stale HTML into the new one on reinit (P1), and SSE.create's onmessage
      // ignores any straggler whose source is no longer current (P2). The promise
      // `dispose()` returns settles once any async finalizer settles; teardown is
      // fire-and-forget (the sync close has already landed), so it is not awaited.
      void closing.dispose();
    }
  };

  // Host-owned graph-native recovery substrate (#133-full). Registered here — in
  // the PRODUCTION directive, not test glue — when the element opts in via
  // `data-liteship-stream-graph`. The registry THROWS on double-registration (Law 1),
  // so `setupGraphSubstrate` DISPOSES any prior registration before re-registering:
  // it is safe to call repeatedly (init and every reinit).
  let unbindGraphSubstrate: (() => void) | null = null;
  const setupGraphSubstrate = (): void => {
    // Dispose first so a reinit re-reads the (possibly freshly-rendered) base and
    // cells without the registry rejecting a second registration for this artifact.
    unbindGraphSubstrate?.();
    unbindGraphSubstrate = null;

    // Read from the CURRENT stream host (`target`), not the original `element`: after an
    // outerHTML morph / Astro view-transition swap, `target` is the freshly-rendered host
    // carrying the up-to-date base graph + cell registrations. Reading `element` would
    // re-register the substrate from the stale (pre-swap) base and miss the new branch.
    const rawGraphUrl = target.getAttribute(STREAM_GRAPH_QUERY_ATTR);
    if (rawGraphUrl === null) {
      return;
    }
    if (artifactId === undefined) {
      Diagnostics.warnOnce({
        source: 'liteship/astro.stream',
        code: 'stream-graph-without-artifact',
        message:
          `${STREAM_GRAPH_QUERY_ATTR} requires ${streamWireAttr('artifact')} — graph-native recovery is keyed by ` +
          'artifact id. Add the artifact attribute or drop the graph attribute; recovery keeps the snapshot floor.',
      });
      return;
    }

    // The graph endpoint is a same-origin recovery read leg by default — resolve it
    // under the runtime endpoint policy (reusing the `snapshot` recovery kind).
    const graphQueryUrl = allowRuntimeEndpointUrl(rawGraphUrl, 'snapshot', 'liteship/astro.stream', {
      crossOriginRejected: 'stream-graph-cross-origin-url-rejected',
      malformedUrl: 'stream-graph-malformed-url-rejected',
      originNotAllowed: 'stream-graph-origin-not-allowed',
      endpointKindNotPermitted: 'stream-graph-endpoint-kind-not-permitted',
    });
    if (!graphQueryUrl) {
      return;
    }

    const rawBase = target.getAttribute(STREAM_GRAPH_BASE_ATTR);
    const rawCells = target.getAttribute(STREAM_GRAPH_CELLS_ATTR);
    if (rawBase === null || rawCells === null) {
      Diagnostics.warnOnce({
        source: 'liteship/astro.stream',
        code: 'stream-graph-substrate-incomplete',
        message:
          `${STREAM_GRAPH_QUERY_ATTR} is set but ${STREAM_GRAPH_BASE_ATTR} and/or ${STREAM_GRAPH_CELLS_ATTR} are missing — ` +
          'graph-native recovery needs the SSR-inlined base graph and cell registrations. Recovery keeps the snapshot floor.',
      });
      return;
    }

    const base = decodeStreamGraphBase(rawBase);
    const cells = parseStreamCellRegistrations(rawCells);
    if (!base || !cells) {
      return;
    }

    const cellStore: StateCellStoreShape = StateCellStore.create();
    for (const cell of cells) {
      cellStore.register(cell.name, cell.states, {
        ...(cell.kind !== undefined ? { kind: cell.kind } : {}),
        ...(cell.authority !== undefined ? { authority: cell.authority } : {}),
      });
    }

    // The mutation client tracks the local base + adopts the QUERY-refreshed graph;
    // recovery reads `base()`/`adopt()` off it. `submit` (the write leg) is unused
    // by recovery, so the same endpoint serves as its POST url.
    const mutationClient = createGraphMutationClient({ url: graphQueryUrl, base });

    unbindGraphSubstrate = registerStreamRecoverySubstrate(artifactId, {
      graphQueryUrl,
      mutationClient,
      cellStore,
    });
  };

  function handleReinit(): void {
    // Dispose + re-arm the substrate BEFORE re-opening the connection so the
    // registry never holds two registrations for this artifact across the swap.
    setupGraphSubstrate();
    closeClient();
    recoveryPending = false;
    openClient();
    bindSnapshotRecovery(target);
  }

  bindReinit(target);

  let unbindSnapshotRecovery: (() => void) | null = null;
  const bindSnapshotRecovery = (nextTarget: HTMLElement): void => {
    if (artifactId === undefined) {
      return;
    }

    unbindSnapshotRecovery?.();
    // Prefer graph-native gap replay (#133-full) when the host registered a
    // QUERY substrate for this artifact (registerStreamRecoverySubstrate);
    // the snapshot path below remains the permanent floor without one. The
    // substrate's patchReceiptEntries is a LIVE buffer fed by SSE receipt
    // frames, so entries arriving after this bind are visible at recovery time.
    const substrate = getStreamRecoverySubstrate(artifactId);
    unbindSnapshotRecovery = bindRequestSnapshotRecovery(nextTarget, {
      artifactId,
      ...(snapshotUrl ? { snapshotUrl } : {}),
      ...(hasCustomEndpointPolicy(endpointPolicy) ? { endpointPolicy } : {}),
      // `liteship:request-snapshot` is dispatched by `Morph.morphWithState` ONLY after a
      // preserve-hint rejection (packages/web/src/morph/diff.ts) — the morph already
      // clobbered the DOM, so the rendered view is KNOWN-STALE. Mark it so, so the
      // graph-native gap-replay path (below) does not early-return on an `ok`/`304`
      // QUERY: it must also apply fresh snapshot HTML to CONVERGE the DOM (F-REC-3).
      // Without a substrate the snapshot floor applies HTML unconditionally anyway.
      domStale: () => true,
      ...(substrate
        ? {
            graphQueryUrl: substrate.graphQueryUrl,
            mutationClient: substrate.mutationClient,
            cellStore: substrate.cellStore,
            patchReceiptEntries: substrate.patchReceiptEntries,
            // Drain any receipt frame still attesting so gap replay never reads a
            // buffer missing a crossing that arrived before this recovery (F-133 race).
            drainPendingReceipts: () => Promise.all([...inFlightReceipts]).then(() => undefined),
          }
        : {}),
      handlers: {
        applyHtml: enqueueHtml,
        applyDiscreteSignal: (payload) => {
          dispatchLiteshipEvent(target, 'liteship:signal', payload);
        },
        // Reflect each gap-replayed crossing back to the host as the SAME discrete signal the
        // snapshot floor emits (`{ [cell]: next }`). The morph-rejection path converges the host
        // via fresh snapshot HTML + signals, but a receipt-only resume (`domStale: false`) skips
        // that floor — without this the crossing would hydrate ONLY the private recovery cell
        // store, dispatching no `liteship:signal` and leaving downstream listeners / rendered state
        // stale even though it was attested and replayed (Codex P2).
        applyTransition: (transition) => {
          dispatchLiteshipEvent(target, 'liteship:signal', { [transition.cell]: transition.next });
        },
      },
    });
  };

  // Arm the graph-native substrate (if opted in) BEFORE binding recovery, so the
  // request-snapshot listener resolves it and prefers gap replay over the floor.
  setupGraphSubstrate();
  bindSnapshotRecovery(target);

  openClient();
  element.addEventListener('liteship:teardown', () => {
    unbindGraphSubstrate?.();
    unbindSnapshotRecovery?.();
    closeClient();
    patchScheduler.dispose();
  });
  load();
}

/** Astro client directive entry that marks the host before starting the stream runtime. */
export const streamDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  bootDirectiveEntry('stream', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initStreamDirective(runtimeLoad, runtimeEl);
  });
};
