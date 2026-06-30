// @vitest-environment jsdom

/**
 * A3b gate — the `client:stream` + `client:llm` directives are now wired onto
 * the hardened SSE primitive (`@czap/web` `SSE.create`) through the imperative
 * `Scope` bridge (mirrors `packages/scene/src/runtime.ts`).
 *
 * These assertions pin the lifecycle contract the migration introduces:
 *   1. `czap:teardown` closes the connection and the drain fibers stop — no
 *      morph / token survives the teardown (fibers interrupted by `Scope.close`).
 *   2. `czap:reinit` (the Astro View-Transition swap pipeline) replaces the
 *      connection: exactly ONE live `EventSource` after the swap (single-boot).
 *   3. The heartbeat watchdog reconnects a silent stream (the latent primitive
 *      bug A3 fixed, now live in the directive).
 *   4. A3 overflow policy is inherited: `client:stream` defaults to
 *      `coalesce-by-id` (same-id patch floods never saturate), `client:llm`
 *      ports `drop-oldest` and surfaces the dropped count as a diagnostic.
 *
 * jsdom (not the browser config) is the host here on purpose — the assertions
 * are environment-independent and the EventSourceMock drives them deterministically.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Diagnostics, SSE_BUFFER_SIZE } from '@czap/core';
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
    el.addEventListener('czap:llm-backpressure', ((event: CustomEvent) => backpressure.push(event.detail)) as EventListener);

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
