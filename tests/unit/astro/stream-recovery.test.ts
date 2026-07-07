// @vitest-environment jsdom

/**
 * #133 — stream directive integrates graph-native recovery on reconnect + request-snapshot.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Effect } from 'effect';
import { Resumption } from '@czap/web';
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
});
