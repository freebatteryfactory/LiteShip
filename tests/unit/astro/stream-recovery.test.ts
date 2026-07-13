// @vitest-environment jsdom

/**
 * #133 — stream directive integrates graph-native recovery on reconnect + request-snapshot.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Effect } from 'effect';
import * as core from '@czap/core';
import { Resumption, getStreamRecoverySubstrate, registerStreamRecoverySubstrate } from '@czap/web';
import streamDirective from '../../../packages/astro/src/client-directives/stream.js';
import { MockEventSource } from '../../helpers/mock-event-source.js';
import { _resetRuntimePolicyForTests } from '../../../packages/astro/src/runtime/policy.js';
import { graph, node } from '../../helpers/graph-fixtures.js';

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
    vi.stubGlobal('sessionStorage', {
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
    });
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
            patches: ['<p>html-patch</p>', { type: 'signal', data: { state: 'missed-discrete' } }],
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

      // An AUTHORITY-MINTED, attested transition receipt frame — the ONLY shape the
      // substrate now buffers (Law 15: attest before apply). The receipt hash
      // self-verifies and its subject is the `${base}#${cell}` transition subject law;
      // a hand-rolled unattested frame is (correctly) refused with a loud diagnostic
      // and never reaches replay. This exercises the real attestation over a serialized
      // frame end to end.
      const transition = {
        _tag: 'DiscreteStateTransition' as const,
        _version: 1 as const,
        cell: 'workspace',
        next: 'expanded',
        generation: 1,
        authority: 'quantizer' as const,
        base: 'czap:base',
        kind: 'discrete' as const,
      };
      const receipt = await Effect.runPromise(core.transitionReceipt(transition));
      const receiptEntry = { receipt, transition };
      const source = MockEventSource.instances[0]!;
      source.simulateMessage(JSON.stringify({ type: 'receipt', data: receiptEntry }), 'evt-43');

      // recordStreamPatchReceipt is async (it recomputes the sha256 hash to attest);
      // wait for the attested entry to land in the live buffer before triggering recovery.
      await vi.waitFor(() => {
        expect(getStreamRecoverySubstrate('hero')?.patchReceiptEntries).toHaveLength(1);
      });

      el.dispatchEvent(
        new CustomEvent('czap:request-snapshot', { detail: { reason: 'preserve-missing' }, bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(gapReplay).toHaveBeenCalledOnce();
      });
      const call = gapReplay.mock.calls[0]![0] as {
        queryUrl: string;
        entries: readonly { readonly transition: { readonly cell: string; readonly next: string } }[];
      };
      expect(call.queryUrl).toBe('/api/graph');
      expect(call.entries).toHaveLength(1);
      expect(call.entries[0]!.transition).toMatchObject({ cell: 'workspace', next: 'expanded' });
      expect(snapshotSpy).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  test('graph-backed directive constructs + registers the substrate and a REAL crossing converges the cell (retires LATENT)', async () => {
    // No mock of runGraphNativeGapReplay: the crossing must replay through the REAL
    // core path (QUERY → adopt → applyTransition → hydrateDiscrete), driven by the
    // production directive that constructs StateCellStore.create() + a mutation
    // client + registerStreamRecoverySubstrate from the graph-backed attributes.
    const ARTIFACT = 'graph-native-hero';

    // G0 = the client's SSR-inlined local base; G1 = the server graph after the
    // crossing recast (distinct ids). The transition chains G0.id → G1.id.
    const g0 = graph([node('workspace.collapsed')]);
    const g1 = graph([node('workspace.collapsed'), node('workspace.expanded')]);
    expect(g0.id).not.toBe(g1.id);

    // QUERY read leg returns the server graph (ok) with its sha256 etag.
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ status: 'ok', graph: g1, etag: g1.digest.integrity_digest }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    // Mint the AUTHORITY transition receipt for a real StateCellStore crossing
    // (collapsed → expanded, generation 0 → 1), exactly as the emit route does.
    const authorityStore = core.StateCellStore.create();
    authorityStore.register('workspace', ['collapsed', 'expanded']);
    const previous = authorityStore.snapshot('workspace');
    const next = authorityStore.applyDiscrete('workspace', 'expanded');
    expect(next.generation).toBe(1);
    const { receipt, transition } = await Effect.runPromise(
      core.mintTransition(previous, next, { base: g0.id, resultId: g1.id }),
    );

    const el = makeEl('div', {
      'data-czap-stream-url': '/api/graph-feed',
      'data-czap-stream-artifact': ARTIFACT,
      'data-czap-stream-graph': '/api/graph',
      'data-czap-stream-graph-base': JSON.stringify(g0),
      'data-czap-stream-cells': JSON.stringify([{ name: 'workspace', states: ['collapsed', 'expanded'] }]),
    });

    streamDirective(noop, {}, el);

    // The directive registered a substrate from the attributes (not test glue),
    // with its OWN store carrying the inlined 'workspace' registration at genesis.
    const registered = getStreamRecoverySubstrate(ARTIFACT);
    expect(registered).toBeDefined();
    expect(registered!.cellStore.snapshot('workspace')?.state).toBe('collapsed');
    expect(registered!.cellStore.snapshot('workspace')?.generation).toBe(0);

    // Feed the attested receipt frame over SSE; it attests + lands in the live buffer.
    const source = MockEventSource.instances[0]!;
    source.simulateMessage(JSON.stringify({ type: 'receipt', data: { receipt, transition } }), 'evt-43');
    await vi.waitFor(() => {
      expect(getStreamRecoverySubstrate(ARTIFACT)?.patchReceiptEntries).toHaveLength(1);
    });

    // Recover: request-snapshot drives graph-native gap replay through the wiring.
    el.dispatchEvent(
      new CustomEvent('czap:request-snapshot', { detail: { reason: 'preserve-missing' }, bubbles: true }),
    );

    // The CELL converged — state AND generation — through the production path.
    await vi.waitFor(() => {
      const cell = getStreamRecoverySubstrate(ARTIFACT)?.cellStore.snapshot('workspace');
      expect(cell?.state).toBe('expanded');
      expect(cell?.generation).toBe(1);
    });
    expect(fetchMock).toHaveBeenCalled();

    // Disposal: teardown removes the registration — no leak. A re-register (which
    // THROWS if the slot were still held) proves the slot is free again.
    el.dispatchEvent(new CustomEvent('czap:teardown'));
    expect(getStreamRecoverySubstrate(ARTIFACT)).toBeUndefined();
    const redispose = registerStreamRecoverySubstrate(ARTIFACT, {
      graphQueryUrl: '/api/graph',
      mutationClient: { base: () => g1, adopt: () => {} },
      cellStore: core.StateCellStore.create(),
    });
    redispose();
  });

  test('replay with dropped signals validates snapshot before applying HTML patches', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          patches: ['<p>should-not-apply</p>', { type: 'signal', data: { state: 'missed-discrete' } }],
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
          patches: ['<p>html-patch-applied</p>', { type: 'signal', data: { state: 'missed-discrete' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(Effect.fail(new Error('snapshot endpoint unreachable')));

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
