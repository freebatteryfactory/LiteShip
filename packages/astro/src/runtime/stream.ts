import { Effect, Stream, Scope, Exit, Fiber } from 'effect';
import { wallClock } from '@czap/core';
import { Morph, Resumption, SSE, SlotAddressing, SlotRegistry, resolveHtmlString } from '@czap/web';
import type { ResumeResponse, SSEClient, SSEMessage, SSEState } from '@czap/web';
import { bootstrapSlots, rescanSlots } from './slots.js';
import { readRuntimeHtmlPolicy, readRuntimeEndpointPolicy } from './policy.js';
import { createStreamScheduler } from './stream-session.js';
import { allowRuntimeEndpointUrl } from './url-policy.js';

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
    target.getAttribute('data-czap-stream-url'),
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

  const artifactId = target.getAttribute('data-czap-stream-artifact') ?? undefined;
  const morphStyle = (target.getAttribute('data-czap-stream-morph') ?? 'innerHTML') as 'innerHTML' | 'outerHTML';
  const snapshotUrl =
    allowRuntimeEndpointUrl(
      target.getAttribute('data-czap-snapshot-url'),
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
      target.getAttribute('data-czap-replay-url'),
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
  // drains `messages` / `stateChanges` through `Effect.runFork` fibers running
  // on the live default runtime. (A `forkScoped` fiber registered inside a
  // `runSync(Scope.use(...))` block is NOT pumped by the ambient event loop once
  // `runSync` returns — the documented imperative-bridge alternative is a
  // top-level forked drain. `Scope.close` disposes the EventSource + Queue +
  // timers; the drain fibers are interrupted alongside it.) See ADR-0005
  // §Category 4 and the imperative-Scope bridge in `packages/scene/src/runtime.ts`.
  let scope: Scope.Closeable | null = null;
  let client: SSEClient | null = null;
  let drainFibers: Fiber.Fiber<void, never>[] = [];

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
      for (let index = 0; index < patchCount; index++) {
        target.dispatchEvent(
          new CustomEvent('czap:stream-morph', {
            bubbles: true,
          }),
        );
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
    if (response.type === 'snapshot') {
      await enqueueHtml(response.html);
      return;
    }

    const patches = response.patches
      .map((patch) => replayHtml(patch))
      .filter((html): html is string => html !== null)
      .map((html) => ({
        html,
        requiresRescan: patchCouldInvalidateSlots(targetLocator(target), morphStyle, html),
      }));

    await patchScheduler.enqueueBatch(patches);
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
      target.dispatchEvent(
        new CustomEvent('czap:stream-error', {
          detail: {
            reason: 'resume-failed',
            message: error instanceof Error ? error.message : String(error),
          },
          bubbles: true,
        }),
      );
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
      saveResumptionState(artifactId, currentEventId);
      if (recoveryPending && artifactId) {
        recoveryPending = false;
        void reconcileResumption(currentEventId);
      }
    }

    if (message.type === 'signal') {
      target.dispatchEvent(
        new CustomEvent('czap:signal', {
          detail: message.data,
          bubbles: true,
        }),
      );
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
        target.dispatchEvent(new CustomEvent('czap:stream-connected', { bubbles: true }));
        return;
      case 'reconnecting':
        recoveryPending = artifactId !== undefined && (client ? Effect.runSync(client.lastEventId) !== null : false);
        patchScheduler.beginReconnect();
        target.dispatchEvent(new CustomEvent('czap:stream-disconnected', { bubbles: true }));
        return;
      case 'error':
        target.dispatchEvent(
          new CustomEvent('czap:stream-error', {
            detail: { reason: 'max-reconnect-attempts' },
            bubbles: true,
          }),
        );
        return;
      default:
        // 'connecting' (initial) and 'disconnected' (intentional close) carry
        // no directive-level event.
        return;
    }
  };

  const openClient = (): void => {
    const next = Effect.runSync(Scope.make());
    scope = next;
    // `SSE.create` requires a Scope; `Scope.use` builds it and registers its
    // finalizer (EventSource close + Queue shutdown + timer clear) in `next`.
    const created = Effect.runSync(
      Scope.use(
        SSE.create({
          url: streamUrl,
          ...(artifactId ? { artifactId } : {}),
        }),
        next,
      ),
    );
    client = created;
    drainFibers = [
      Effect.runFork(Stream.runForEach(created.messages, (m) => Effect.sync(() => handleMessage(m)))),
      Effect.runFork(Stream.runForEach(created.stateChanges, (s) => Effect.sync(() => handleEdge(s)))),
    ];
  };

  const closeClient = (): void => {
    if (scope) {
      const closing = scope;
      const fibers = drainFibers;
      scope = null;
      client = null;
      drainFibers = [];
      for (const fiber of fibers) {
        Effect.runFork(Fiber.interrupt(fiber));
      }
      Effect.runFork(Scope.close(closing, Exit.void));
    }
  };

  function handleReinit(): void {
    closeClient();
    recoveryPending = false;
    openClient();
  }

  bindReinit(target);
  openClient();
  element.addEventListener('czap:teardown', () => {
    closeClient();
    patchScheduler.dispose();
  });
  load();
}
