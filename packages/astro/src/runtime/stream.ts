import { Effect, Scope, Exit, ManagedRuntime, Layer } from 'effect';
import { wallClock, validateSnapshotSignalsField, replayDroppedSignals } from '@czap/core';
import {
  Morph,
  Resumption,
  SSE,
  SlotAddressing,
  SlotRegistry,
  resolveHtmlString,
  dispatchCzapEvent,
  streamWireAttr,
  bindRequestSnapshotRecovery,
  fetchSnapshot,
  applyDiscreteSnapshotSignals,
} from '@czap/web';
import type { ResumeResponse, SSEClient, SSEMessage, SSEState } from '@czap/web';
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
  const slot = element.getAttribute('data-czap-slot');
  if (slot) {
    return { type: 'slot', value: slot };
  }

  if (element.id) {
    return { type: 'id', value: element.id };
  }

  const semanticId = element.getAttribute('data-czap-id');
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
      if (root.getAttribute('data-czap-id') === locator.value) {
        return root;
      }

      for (const candidate of Array.from(root.querySelectorAll('[data-czap-id]'))) {
        if (candidate.getAttribute('data-czap-id') === locator.value && candidate instanceof HTMLElement) {
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
    html.includes('data-czap-slot') ||
    html.includes('data-czap-id') ||
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
  Effect.runSync(
    Resumption.saveState({
      artifactId,
      lastEventId,
      lastSequence: parsed.sequence,
      // Epoch wall-clock stamp for the resumption record — routed through
      // `wallClock` (the epoch entropy boundary), not the monotonic systemClock,
      // since the timestamp is a real point in time consumers read as epoch ms.
      timestamp: wallClock.now(),
    }),
  );
}

function hasCustomEndpointPolicy(policy: ReturnType<typeof readRuntimeEndpointPolicy>): boolean {
  return (
    policy.mode !== 'same-origin' ||
    policy.allowOrigins.length > 0 ||
    Object.values(policy.byKind).some((allowlist) => allowlist.length > 0)
  );
}

/**
 * Entry point for the `client:stream` directive. Opens an SSE client
 * to the `data-czap-stream-url` endpoint, funnels incoming HTML
 * patches through a {@link createStreamScheduler}, and triggers slot
 * rescans when necessary. Honors `czap:reinit` (re-read) / `czap:teardown`
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
    'czap/astro.stream',
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
      'czap/astro.stream',
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
      'czap/astro.stream',
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

  // The hardened SSE primitive (`@czap/web` `SSE.create`) now owns the
  // `EventSource`, exponential-backoff reconnect, the heartbeat watchdog, and
  // the bounded overflow buffer (default `coalesce-by-id` — stream patches are
  // `data-czap-id`-addressed). This directive owns an explicit `Scope` and
  // drains `messages` / `stateChanges` through an owned ManagedRuntime, not the
  // process-global Effect runtime. Teardown explicitly interrupts the drain
  // fibers, closes the connection Scope (EventSource + Queue + timers), then
  // disposes the owned runtime.
  // See ADR-0005 §Category 4 and the imperative-Scope bridge in
  // `packages/scene/src/runtime.ts`.
  let runtime: ManagedRuntime.ManagedRuntime<never, never> | null = null;
  let scope: Scope.Closeable | null = null;
  let client: SSEClient | null = null;
  // Cursor carried ACROSS connections (reinit / VT-swap). `SSE.create` tracks
  // `lastEventId` per-connection, so a fresh connection opened on reinit must be
  // re-seeded with the last message's cursor — otherwise the tail restarts from
  // the top instead of resuming where the swapped-out connection left off.
  let lastCursor: string | null = null;

  const bindReinit = (nextTarget: HTMLElement): void => {
    if (reinitTarget === nextTarget) {
      return;
    }

    reinitTarget?.removeEventListener('czap:reinit', handleReinit);
    reinitTarget = nextTarget;
    reinitTarget.addEventListener('czap:reinit', handleReinit);
  };

  const patchScheduler = createStreamScheduler({
    applyHtml: (html) => {
      const locator = targetLocator(target);
      pendingLocator = locator;
      Effect.runSync(
        Morph.morphWithState(target, html, {
          morphStyle,
          preserveFocus: true,
          preserveScroll: true,
          preserveSelection: true,
        }),
      );

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
        dispatchCzapEvent(target, 'czap:stream-morph');
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
        dispatchCzapEvent(target, 'czap:stream-error', {
          reason: 'snapshot-signals-invalid',
          message: signalsError,
        });
        return;
      }

      await enqueueHtml(response.html);
      applyDiscreteSnapshotSignals(response.signals, (payload) => {
        dispatchCzapEvent(target, 'czap:signal', payload);
      });
      return;
    }

    const dropped = artifactId !== undefined && replayDroppedSignals(response.patches);
    let recoveredSignals: unknown = null;

    if (dropped) {
      try {
        const snapshot = await Effect.runPromise(
          fetchSnapshot(artifactId!, {
            ...(snapshotUrl ? { snapshotUrl } : {}),
            ...(hasCustomEndpointPolicy(endpointPolicy) ? { endpointPolicy } : {}),
          }),
        );
        const signalsError = validateSnapshotSignalsField(snapshot.signals);
        if (signalsError) {
          throw new Error(signalsError);
        }
        recoveredSignals = snapshot.signals;
      } catch (error) {
        dispatchCzapEvent(target, 'czap:stream-error', {
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

    if (recoveredSignals !== null) {
      applyDiscreteSnapshotSignals(recoveredSignals, (payload) => {
        dispatchCzapEvent(target, 'czap:signal', payload);
      });
    }
  };

  const reconcileResumption = async (currentEventId: string): Promise<void> => {
    const resolvedArtifactId = artifactId!;
    try {
      const response = await Effect.runPromise(
        Resumption.resume(resolvedArtifactId, currentEventId, {
          ...(snapshotUrl ? { snapshotUrl } : {}),
          ...(replayUrl ? { replayUrl } : {}),
          ...(hasCustomEndpointPolicy(endpointPolicy) ? { endpointPolicy } : {}),
        }),
      );
      await applyResumeResponse(response);
    } catch (error) {
      dispatchCzapEvent(target, 'czap:stream-error', {
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
    const currentEventId = client ? Effect.runSync(client.lastEventId) : null;
    if (currentEventId) {
      lastCursor = currentEventId;
      // Reconcile the disconnect gap BEFORE persisting the current cursor. On the
      // first post-reconnect frame, `Resumption.resume` synchronously loads the
      // PRE-disconnect persisted cursor (`loadState` is `Effect.sync`) to size the
      // replay gap `parsed.sequence - (prevState.lastSequence + 1)`. Persisting
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
      dispatchCzapEvent(target, 'czap:signal', message.data);
      return;
    }

    if (message.type === 'heartbeat' || message.type === 'receipt') {
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
        dispatchCzapEvent(target, 'czap:stream-connected');
        return;
      case 'reconnecting':
        recoveryPending = artifactId !== undefined && (client ? Effect.runSync(client.lastEventId) !== null : false);
        patchScheduler.beginReconnect();
        dispatchCzapEvent(target, 'czap:stream-disconnected');
        return;
      case 'error':
        dispatchCzapEvent(target, 'czap:stream-error', { reason: 'max-reconnect-attempts' });
        return;
      default:
        // 'connecting' (initial) and 'disconnected' (intentional close) carry
        // no directive-level event.
        return;
    }
  };

  const openClient = (): void => {
    const nextRuntime = ManagedRuntime.make(Layer.empty);
    const next = nextRuntime.runSync(Scope.make());
    runtime = nextRuntime;
    scope = next;
    // `SSE.create` requires a Scope; `Scope.provide` builds it and registers its
    // finalizer (EventSource close + Queue shutdown + timer clear) in `next`.
    //
    // Messages and connection edges are delivered SYNCHRONOUSLY via callbacks,
    // not an async Stream drain fiber — so a patch/snapshot/signal is handled
    // within the same dispatch turn as its `onmessage`. The directive's own rAF
    // render batching (`enqueueHtml`/`patchScheduler`) owns throttling; an async
    // buffer would only add latency and could reorder relative to that scheduler.
    const created = nextRuntime.runSync(
      Scope.provide(
        SSE.create({
          url: streamUrl,
          ...(artifactId ? { artifactId } : {}),
          ...(lastCursor ? { lastEventId: lastCursor } : {}),
          onMessage: handleMessage,
          onStateChange: handleEdge,
        }),
        next,
      ),
    );
    client = created;
  };

  const closeClient = (): void => {
    if (scope && runtime) {
      const closing = scope;
      const closingRuntime = runtime;
      scope = null;
      runtime = null;
      client = null;
      // Close the Scope SYNCHRONOUSLY before the replacement opens: its finalizer
      // closes the EventSource, nulls the primitive's `source`, and shuts the
      // queues in one pass, so a frame from the old generation cannot morph stale
      // HTML into the new one on reinit (P1) and SSE.create's onmessage ignores
      // any straggler whose source is no longer current (P2). All finalizers are
      // synchronous; the owned runtime is then disposed asynchronously. (Running
      // both `client.close()` AND `Scope.close` would double-shut the queues and
      // surface an async rejection in a later turn.)
      closingRuntime.runSync(Scope.close(closing, Exit.void));
      void closingRuntime.dispose().catch(() => undefined);
    }
  };

  function handleReinit(): void {
    closeClient();
    recoveryPending = false;
    openClient();
  }

  bindReinit(target);

  let unbindSnapshotRecovery: (() => void) | null = null;
  const bindSnapshotRecovery = (nextTarget: HTMLElement): void => {
    if (artifactId === undefined) {
      return;
    }

    unbindSnapshotRecovery?.();
    unbindSnapshotRecovery = bindRequestSnapshotRecovery(nextTarget, {
      artifactId,
      ...(snapshotUrl ? { snapshotUrl } : {}),
      ...(hasCustomEndpointPolicy(endpointPolicy) ? { endpointPolicy } : {}),
      handlers: {
        applyHtml: enqueueHtml,
        applyDiscreteSignal: (payload) => {
          dispatchCzapEvent(target, 'czap:signal', payload);
        },
      },
    });
  };

  bindSnapshotRecovery(target);

  openClient();
  element.addEventListener('czap:teardown', () => {
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
