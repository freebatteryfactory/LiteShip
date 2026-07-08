// @vitest-environment jsdom

/**
 * #133 — stream directive integrates graph-native recovery on reconnect + request-snapshot.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Effect } from 'effect';
import * as core from '@czap/core';
import { Resumption, registerStreamRecoverySubstrate } from '@czap/web';
import streamDirective from '../../../packages/astro/src/client-directives/stream.js';
import { MockEventSource } from '../../helpers/mock-event-source.js';
import { _resetRuntimePolicyForTests } from '../../../packages/astro/src/runtime/policy.js';

const noop = (): Promise<void> => Promise.resolve();

function makeEl(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  return el;
}

const flushPromises = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

describe('stream directive graph-native recovery (#133)', () => {
  let restoreES: () => void;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-czap-tier', 'reactive');
    _resetRuntimePolicyForTests();
    restoreES = MockEventSource.install();
    vi.stubGlobal('location', { origin: 'http://localhost:3000' });
    vi.stubGlobal(
      'sessionStorage',
      {
        getItem: vi.fn(() =>
          JSON.stringify({
            artifactId: 'hero',
            lastEventId: 'evt-42',
            lastSequence: 42,
            timestamp: 1,
          }),
        ),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(() => null),
      },
    );
  });

  afterEach(() => {
    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.dispatchEvent(new CustomEvent('czap:teardown'));
    });
    restoreES();
    document.body.innerHTML = '';
    _resetRuntimePolicyForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('small-gap replay supplements missed discrete signal via snapshot re-sync', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            patches: [
              '<p>html-patch</p>',
              { type: 'signal', data: { state: 'missed-discrete' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            html: '<p>unused</p>',
            signals: { state: 'recovered-discrete', width: 1024 },
            lastEventId: 'evt-45',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'hero',
    });

    const signals: unknown[] = [];
    el.addEventListener('czap:signal', ((event: CustomEvent) => signals.push(event.detail)) as EventListener);

    streamDirective(noop, {}, el);

    const firstSource = MockEventSource.instances[0]!;
    firstSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-42');
    firstSource.simulateError();

    await vi.advanceTimersByTimeAsync(1000);

    const secondSource = MockEventSource.instances.at(-1)!;
    secondSource.simulateOpen();
    secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-45');

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    await flushPromises();
    await flushPromises();

    expect(signals).toEqual([{ state: 'recovered-discrete' }]);
    expect(el.innerHTML).toContain('html-patch');

    vi.useRealTimers();
  });

  test('czap:request-snapshot listener recovers via full snapshot re-sync', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          html: '<main>snapshot-recovered</main>',
          signals: { state: 'from-morph-rejection' },
          lastEventId: 'evt-99',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'hero',
    });

    const signals: unknown[] = [];
    el.addEventListener('czap:signal', ((event: CustomEvent) => signals.push(event.detail)) as EventListener);

    streamDirective(noop, {}, el);

    el.dispatchEvent(
      new CustomEvent('czap:request-snapshot', {
        detail: { reason: 'preserve-missing' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });
    await flushPromises();
    await flushPromises();

    expect(el.innerHTML).toContain('snapshot-recovered');
    expect(signals).toEqual([{ state: 'from-morph-rejection' }]);
  });

  test('continuous transients from snapshot are NOT replayed on recovery', async () => {
    vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({
        type: 'snapshot',
        html: '<main>x</main>',
        signals: {
          state: 'discrete-ok',
          width: 800,
          'scroll.progress': 0.33,
        },
        lastEventId: 'evt-1',
      }),
    );

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'hero',
    });

    const signals: unknown[] = [];
    el.addEventListener('czap:signal', ((event: CustomEvent) => signals.push(event.detail)) as EventListener);

    streamDirective(noop, {}, el);

    el.dispatchEvent(
      new CustomEvent('czap:request-snapshot', {
        detail: { reason: 'test' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      expect(signals).toEqual([{ state: 'discrete-ok' }]);
    });
  });

  test('snapshot without signals field surfaces czap:stream-error and keeps stale discrete state', async () => {
    vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({
        type: 'snapshot',
        html: '<main>no-signals</main>',
        signals: undefined as unknown as Record<string, unknown>,
        lastEventId: 'evt-2',
      }),
    );

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'hero',
    });
    el.innerHTML = '<main>stale</main>';

    const signals: unknown[] = [];
    const errors: Array<{ reason: string; message?: string }> = [];
    el.addEventListener('czap:signal', ((event: CustomEvent) => signals.push(event.detail)) as EventListener);
    el.addEventListener('czap:stream-error', ((event: CustomEvent) => errors.push(event.detail)) as EventListener);

    streamDirective(noop, {}, el);

    el.dispatchEvent(
      new CustomEvent('czap:request-snapshot', {
        detail: { reason: 'test' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      expect(errors).toEqual([
        expect.objectContaining({
          reason: 'snapshot-recovery-failed',
          message: expect.stringContaining('missing required signals'),
        }),
      ]);
    });
    expect(signals).toEqual([]);
    expect(el.innerHTML).toContain('stale');
  });

  test('registered substrate routes czap:request-snapshot through gap-replay in PRODUCTION wiring (#133-full)', async () => {
    // The directive — not test-only glue — must look up the host-registered
    // substrate, feed SSE receipt frames into its live buffer, and prefer
    // runGraphNativeGapReplay over the snapshot floor.
    const localBase = { id: 'czap:base' } as never;
    const adopt = vi.fn();
    const gapReplay = vi.spyOn(core, 'runGraphNativeGapReplay').mockResolvedValue({
      query: { status: 'ok', graph: localBase, etag: 'sha256:ok' },
      replayedCells: [],
      discretePayloads: [],
    } as never);
    const snapshotSpy = vi.spyOn(Resumption, 'fetchSnapshot');

    const dispose = registerStreamRecoverySubstrate('hero', {
      graphQueryUrl: '/api/graph',
      mutationClient: { base: () => localBase, adopt },
      cellStore: { get: () => undefined, register: () => {}, applyDiscrete: () => {} } as never,
    });

    try {
      const el = makeEl('div', {
        'data-czap-stream-url': '/api/feed',
        'data-czap-stream-artifact': 'hero',
      });
      streamDirective(noop, {}, el);

      // A receipt frame on the SSE stream lands in the substrate's live buffer.
      const receiptEntry = {
        receipt: { kind: 'graph-patch' },
        patch: { _tag: 'GraphPatch', _version: 1, base: 'czap:base', ops: [], resultId: 'czap:next' },
      };
      const source = MockEventSource.instances[0]!;
      source.simulateMessage(JSON.stringify({ type: 'receipt', data: receiptEntry }), 'evt-43');

      el.dispatchEvent(
        new CustomEvent('czap:request-snapshot', { detail: { reason: 'preserve-missing' }, bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(gapReplay).toHaveBeenCalledOnce();
      });
      const call = gapReplay.mock.calls[0]![0] as { queryUrl: string; entries: readonly unknown[] };
      expect(call.queryUrl).toBe('/api/graph');
      expect(call.entries).toContainEqual(receiptEntry);
      expect(snapshotSpy).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  test('replay with dropped signals validates snapshot before applying HTML patches', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          patches: [
            '<p>should-not-apply</p>',
            { type: 'signal', data: { state: 'missed-discrete' } },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({
        type: 'snapshot',
        html: '<p>unused</p>',
        signals: undefined as unknown as Record<string, unknown>,
        lastEventId: 'evt-45',
      }),
    );

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'hero',
    });
    el.innerHTML = '<p>stale</p>';

    const errors: Array<{ reason: string; message?: string }> = [];
    el.addEventListener('czap:stream-error', ((event: CustomEvent) => errors.push(event.detail)) as EventListener);

    streamDirective(noop, {}, el);

    const firstSource = MockEventSource.instances[0]!;
    firstSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-42');
    firstSource.simulateError();

    await vi.advanceTimersByTimeAsync(1000);

    const secondSource = MockEventSource.instances.at(-1)!;
    secondSource.simulateOpen();
    secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-45');

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    await flushPromises();
    await flushPromises();

    await vi.waitFor(() => {
      expect(errors).toEqual([
        expect.objectContaining({
          reason: 'resume-failed',
          message: expect.stringContaining('missing required signals'),
        }),
      ]);
    });
    expect(el.innerHTML).toContain('stale');
    expect(el.innerHTML).not.toContain('should-not-apply');

    vi.useRealTimers();
  });

  test('replay with dropped signals still applies HTML patches when snapshot fetch fails', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          patches: [
            '<p>html-patch-applied</p>',
            { type: 'signal', data: { state: 'missed-discrete' } },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.fail(new Error('snapshot endpoint unreachable')),
    );

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/feed',
      'data-czap-stream-artifact': 'hero',
    });
    el.innerHTML = '<p>stale</p>';

    const errors: Array<{ reason: string; message?: string }> = [];
    el.addEventListener('czap:stream-error', ((event: CustomEvent) => errors.push(event.detail)) as EventListener);

    streamDirective(noop, {}, el);

    const firstSource = MockEventSource.instances[0]!;
    firstSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-42');
    firstSource.simulateError();

    await vi.advanceTimersByTimeAsync(1000);

    const secondSource = MockEventSource.instances.at(-1)!;
    secondSource.simulateOpen();
    secondSource.simulateMessage(JSON.stringify({ type: 'heartbeat' }), 'evt-45');

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    await flushPromises();
    await flushPromises();

    await vi.waitFor(() => {
      expect(errors).toEqual([
        expect.objectContaining({
          reason: 'resume-failed',
          message: expect.stringContaining('snapshot endpoint unreachable'),
        }),
      ]);
    });
    expect(el.innerHTML).not.toContain('html-patch-applied');

    vi.useRealTimers();
  });
});
