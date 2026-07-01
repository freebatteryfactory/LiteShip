// @vitest-environment jsdom

/**
 * A3b gate — the `client:stream` + `client:llm` directives consume the hardened
 * SSE primitive (`@czap/web` `SSE.create`) SYNCHRONOUSLY: `client:stream` through
 * its `onMessage`/`onStateChange` callbacks (keeping a `Scope` only for the
 * connection lifecycle, no drain fibers), `client:llm` through its own raw
 * `EventSource` + already-guarded decoder (no Effect runtime at all).
 *
 * These assertions pin the lifecycle contract:
 *   1. `czap:teardown` closes the connection synchronously — no morph / token
 *      survives the teardown.
 *   2. `czap:reinit` (the Astro View-Transition swap pipeline) replaces the
 *      connection: exactly ONE live `EventSource` after the swap (single-boot),
 *      and the new connection resumes from the last cursor.
 *   3. The heartbeat watchdog reconnects a silent stream (the latent primitive
 *      bug A3 fixed, now live in the directive).
 *   4. Overflow is a PRIMITIVE-only feature for buffered async consumers — a
 *      synchronous directive holds no buffer, so a same-id patch flood never
 *      engages the primitive's overflow path and an LLM token flood is processed
 *      in order with nothing dropped (no backpressure diagnostic). See ADR-0005's
 *      SSE addendum.
 *
 * jsdom (not the browser config) is the host here on purpose — the assertions
 * are environment-independent and the EventSourceMock drives them deterministically.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Effect } from 'effect';
import { Diagnostics, SSE_BUFFER_SIZE } from '@czap/core';
import { Resumption } from '@czap/web';
import streamDirective from '../../../packages/astro/src/client-directives/stream.js';
import llmDirective from '../../../packages/astro/src/client-directives/llm.js';
import { MockEventSource } from '../../helpers/mock-event-source.js';
import { _resetRuntimePolicyForTests } from '../../../packages/astro/src/runtime/policy.js';

const noop = (): Promise<void> => Promise.resolve();

// One real macrotask. The directive drains `SSE.create`'s message/state streams
// on `Effect.runFork` fibers that the live default runtime pumps on macrotasks
// (a `forkScoped` fiber registered through `runSync` is NOT pumped once `runSync`
// returns — hence the bridge forks the drain at top level). Awaiting a macrotask
// flushes the fiber AND the render scheduler's microtask flush.
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function makeEl(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  return el;
}

function latestSource(): MockEventSource {
  const source = MockEventSource.instances.at(-1);
  expect(source).toBeDefined();
  return source!;
}

function liveSourceCount(): number {
  return MockEventSource.instances.filter((s) => s.readyState !== MockEventSource.CLOSED).length;
}

function patchFrame(id: string, version: number): string {
  return JSON.stringify({ type: 'patch', data: `<div data-czap-id="${id}">v${version}</div>` });
}

function disposeTree(): void {
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.dispatchEvent(new CustomEvent('czap:teardown'));
  });
}

describe('A3b — client:stream Scope-bridged onto SSE.create', () => {
  let restoreES: () => void;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-czap-tier', 'reactive');
    _resetRuntimePolicyForTests();
    restoreES = MockEventSource.install();
  });

  afterEach(() => {
    disposeTree();
    restoreES();
    Diagnostics.reset();
    document.body.innerHTML = '';
    _resetRuntimePolicyForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('czap:teardown closes the EventSource and no morph survives it', async () => {
    const el = makeEl('div', { 'data-czap-stream-url': '/api/feed' });
    const morphs: string[] = [];
    el.addEventListener('czap:stream-morph', () => morphs.push('m'));

    streamDirective(noop, {}, el);
    const source = latestSource();

    source.simulateMessage(JSON.stringify({ type: 'patch', data: '<p>live</p>' }), 'evt-1');
    await tick();
    await tick();

    expect(morphs).toEqual(['m']);
    expect(el.innerHTML).toContain('live');

    el.dispatchEvent(new CustomEvent('czap:teardown'));
    await tick();
    expect(source.readyState).toBe(MockEventSource.CLOSED);

    // A late frame after teardown must not morph: the drain fiber is interrupted
    // and the bounded queue is shut down by Scope.close.
    source.simulateMessage(JSON.stringify({ type: 'patch', data: '<p>late</p>' }), 'evt-2');
    await tick();
    await tick();

    expect(morphs).toEqual(['m']);
    expect(el.innerHTML).not.toContain('late');
  });

  test('czap:reinit replaces the connection — exactly one live EventSource (VT-swap survival)', async () => {
    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'doc-1',
    });

    streamDirective(noop, {}, el);
    expect(MockEventSource.instances).toHaveLength(1);
    const first = latestSource();

    el.dispatchEvent(new CustomEvent('czap:reinit'));
    await tick();

    expect(MockEventSource.instances).toHaveLength(2);
    expect(first.readyState).toBe(MockEventSource.CLOSED);
    // Single-boot: the old generation is gone, exactly one connection is live.
    expect(liveSourceCount()).toBe(1);
  });

  test('czap:reinit reseeds the new connection with the last cursor (resumes the tail, not restart)', async () => {
    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'doc-1',
    });

    streamDirective(noop, {}, el);
    const first = latestSource();
    // A message advances the cursor on the live connection.
    first.simulateMessage(patchFrame('hero', 0), 'evt-7');

    el.dispatchEvent(new CustomEvent('czap:reinit'));
    await tick();

    const next = latestSource();
    expect(next).not.toBe(first);
    // The reinit'd connection resumes from the cursor rather than restarting from
    // the top: `SSE.create` tracks `lastEventId` per-connection, so the directive
    // carries it across the swap and re-seeds the replacement.
    expect(next.url).toContain('lastEventId=evt-7');
  });

  test('reconnect reconciles the gap against the PRE-disconnect cursor (persist after resume, not before)', async () => {
    // Regression (Codex P1): on the first post-reconnect frame, handleMessage must
    // reconcile the replay gap BEFORE persisting the new cursor. `Resumption.resume`
    // synchronously loads the persisted cursor (`loadState` is `Effect.sync`) to
    // size the gap `seq(current) - (persisted.lastSequence + 1)`. Persisting the
    // current cursor first would set `lastSequence` to the current sequence,
    // collapse the gap to `<= 0`, and silently drop every patch missed while
    // disconnected. We assert the cursor RESUME OBSERVES is the pre-disconnect one.
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // zero jitter → deterministic backoff

    let cursorSeenByResume: string | null | undefined;
    const resumeSpy = vi.spyOn(Resumption, 'resume').mockImplementation((artifactId: string) => {
      // What `loadState` would read at this instant IS the gap baseline.
      cursorSeenByResume = Effect.runSync(Resumption.loadState(artifactId))?.lastEventId ?? null;
      return Effect.succeed({ type: 'replay' as const, patches: [] });
    });

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'doc-9',
    });
    streamDirective(noop, {}, el);
    const first = latestSource();

    // Pre-disconnect frame at sequence 5 persists cursor 'evt-5' (not a recovery).
    first.simulateMessage(patchFrame('hero', 0), 'evt-5');
    expect(resumeSpy).not.toHaveBeenCalled();

    // Transport error → 'reconnecting' (arms recovery), backoff re-opens a source.
    first.simulateError();
    vi.advanceTimersByTime(2_000); // past the 1s backoff, well short of the heartbeat
    const next = latestSource();
    expect(next).not.toBe(first);

    // First post-reconnect frame at sequence 9 → handleMessage reconciles.
    next.simulateMessage(patchFrame('hero', 1), 'evt-9');

    expect(resumeSpy).toHaveBeenCalledWith('doc-9', 'evt-9', expect.anything());
    // resume saw the OLD cursor (5), so the real gap 9-(5+1)=3 is replayed — not
    // the collapsed gap a persist-first ordering would have produced.
    expect(cursorSeenByResume).toBe('evt-5');
  });

  test('heartbeat timeout reconnects a silent stream (watchdog → backoff re-open)', () => {
    vi.useFakeTimers();
    // Zero jitter so the backoff delay === initialDelay (1000ms).
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const el = makeEl('div', { 'data-czap-stream-url': '/api/feed' });
    streamDirective(noop, {}, el);
    expect(MockEventSource.instances).toHaveLength(1);

    // The watchdog fires at SSE_HEARTBEAT_MS * 2 (= 60s) with no message.
    vi.advanceTimersByTime(60_000);
    expect(MockEventSource.instances[0]!.readyState).toBe(MockEventSource.CLOSED);

    // Backoff re-opens the source rather than wedging in `error`.
    vi.advanceTimersByTime(1_000);
    expect(MockEventSource.instances).toHaveLength(2);
  });

  test('stream delivers messages synchronously, bypassing the primitive overflow buffer', () => {
    Diagnostics.reset();
    const captured = Diagnostics.createBufferSink();
    Diagnostics.setSink(captured.sink);

    const el = makeEl('div', { 'data-czap-stream-url': '/api/feed' });
    streamDirective(noop, {}, el);
    const source = latestSource();

    // The directive consumes via the synchronous `onMessage` callback, NOT the
    // async Stream + bounded Queue — so each patch is handled in-turn and the
    // primitive's receive buffer is never engaged. A flood far past capacity
    // therefore never saturates, whether or not the patches share a
    // `data-czap-id`. (Overflow is a primitive-only feature — see
    // `tests/property/sse-overflow.test.ts`; the directive's own rAF batching
    // owns render throttling.)
    for (let i = 0; i < SSE_BUFFER_SIZE * 2; i++) {
      source.simulateMessage(patchFrame('hero', i));
    }
    for (let i = 0; i < SSE_BUFFER_SIZE * 2; i++) {
      source.simulateMessage(patchFrame(`id-${i}`, i));
    }
    expect(captured.events.filter((e) => e.code === 'sse-buffer-saturated')).toHaveLength(0);
  });
});

describe('A3b — client:llm synchronous frame processing', () => {
  let restoreES: () => void;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-czap-tier', 'reactive');
    _resetRuntimePolicyForTests();
    restoreES = MockEventSource.install();
  });

  afterEach(() => {
    disposeTree();
    restoreES();
    Diagnostics.reset();
    document.body.innerHTML = '';
    _resetRuntimePolicyForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test('llm processes a token flood synchronously — every token rendered, nothing dropped', async () => {
    Diagnostics.reset();
    const captured = Diagnostics.createBufferSink();
    Diagnostics.setSink(captured.sink);

    const el = makeEl('section', { 'data-czap-llm-url': '/api/chat' });
    const backpressure: unknown[] = [];
    el.addEventListener('czap:llm-backpressure', ((event: CustomEvent) =>
      backpressure.push(event.detail)) as EventListener);

    llmDirective(noop, {}, el);
    const source = latestSource();
    source.simulateOpen();

    // Frames are decoded + morphed SYNCHRONOUSLY in `onmessage`; the browser
    // serialises delivery, so a burst far past the old buffer size is fully
    // processed in order with nothing dropped and no backpressure surfaced. The
    // token text accumulates as it arrives.
    const total = SSE_BUFFER_SIZE + 25;
    for (let i = 0; i < total; i++) {
      source.simulateMessage(JSON.stringify({ type: 'text', content: `t${i}` }));
    }

    expect(backpressure).toHaveLength(0);
    expect(captured.events.filter((e) => e.code === 'llm-buffer-saturated')).toHaveLength(0);
    // Non-vacuous: every frame was accepted in-turn (nothing dropped). The token
    // text is render-batched, so flush a microtask before reading the morph —
    // both the first and last token are then present, in order.
    await Promise.resolve();
    expect(el.textContent).toContain('t0');
    expect(el.textContent).toContain(`t${total - 1}`);
  });

  test('czap:teardown closes the EventSource and stops draining tokens', async () => {
    const el = makeEl('section', { 'data-czap-llm-url': '/api/chat', 'data-czap-llm-target': '.sink' });
    el.innerHTML = '<div class="sink"></div>';
    const tokens: unknown[] = [];
    el.addEventListener('czap:llm-token', ((event: CustomEvent) => tokens.push(event.detail)) as EventListener);

    llmDirective(noop, {}, el);
    const source = latestSource();
    source.simulateOpen();

    source.simulateMessage(JSON.stringify({ type: 'text', content: 'Hello' }));
    await tick();
    await tick();
    expect(tokens).toHaveLength(1);

    el.dispatchEvent(new CustomEvent('czap:teardown'));
    await tick();
    expect(source.readyState).toBe(MockEventSource.CLOSED);

    source.simulateMessage(JSON.stringify({ type: 'text', content: ' world' }));
    await tick();
    await tick();
    expect(tokens).toHaveLength(1);
  });

  test('czap:reinit reopens exactly one live llm connection', async () => {
    const el = makeEl('section', { 'data-czap-llm-url': '/api/chat' });
    llmDirective(noop, {}, el);
    expect(MockEventSource.instances).toHaveLength(1);
    const first = latestSource();

    el.dispatchEvent(new CustomEvent('czap:reinit'));
    await tick();

    expect(MockEventSource.instances).toHaveLength(2);
    expect(first.readyState).toBe(MockEventSource.CLOSED);
    expect(liveSourceCount()).toBe(1);
  });
});
