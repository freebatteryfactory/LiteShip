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
    // F-REC-3: request-snapshot fires from a REJECTED morph, so the DOM is stale.
    // Gap-replay corrects the graph + cells but NOT the rendered DOM, so a snapshot
    // is ALSO fetched (domStale) to converge it — provide one to apply.
    const snapshotSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({
        type: 'snapshot',
        html: '<main>dom-converged</main>',
        signals: { state: 'expanded' },
        lastEventId: 'evt-99',
      }),
    );

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
      el.innerHTML = '<main>stale-rejected</main>';
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
      // Gap-replay stays the graph/cell leg (typed + attested), but the DOM only
      // converges when the snapshot HTML is applied — the floor is NOT skipped for
      // the DOM after a rejected morph (F-REC-3).
      expect(snapshotSpy).toHaveBeenCalledOnce();
      await vi.waitFor(() => {
        expect(el.innerHTML).toContain('dom-converged');
      });
      expect(el.innerHTML).not.toContain('stale-rejected');
    } finally {
      dispose();
    }
  });

  test('a receipt still attesting when recovery fires is DRAINED before gap replay reads the buffer (F-133 race)', async () => {
    // The race: recordStreamPatchReceipt is async (it re-hashes to attest), so a
    // receipt frame received immediately before a morph rejection is still settling
    // when recovery fires. Without draining, gap replay reads an EMPTY buffer and
    // misses the just-received crossing. This test triggers recovery in the SAME tick
    // as the receipt frame — no wait for the buffer — and asserts the entry made it.
    const localBase = { id: 'czap:base' } as never;
    const gapReplay = vi.spyOn(core, 'runGraphNativeGapReplay').mockResolvedValue({
      query: { status: 'ok', graph: localBase, etag: 'sha256:ok' },
      replayedCells: [],
      discretePayloads: [],
    } as never);
    // domStale is wired, so recovery also fetches a snapshot — supply one.
    vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({ type: 'snapshot', html: '<main>x</main>', signals: {}, lastEventId: 'evt-99' }),
    );

    const dispose = registerStreamRecoverySubstrate('hero', {
      graphQueryUrl: '/api/graph',
      mutationClient: { base: () => localBase, adopt: vi.fn() },
      cellStore: { get: () => undefined, register: () => {}, applyDiscrete: () => {} } as never,
    });

    try {
      const el = makeEl('div', { 'data-czap-stream-url': '/api/feed', 'data-czap-stream-artifact': 'hero' });
      streamDirective(noop, {}, el);

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

      // Feed the receipt frame, then trigger recovery in the SAME tick — the async
      // attestation is still in flight (NOT awaited for the buffer as the other tests do).
      MockEventSource.instances[0]!.simulateMessage(
        JSON.stringify({ type: 'receipt', data: { receipt, transition } }),
        'evt-43',
      );
      el.dispatchEvent(
        new CustomEvent('czap:request-snapshot', { detail: { reason: 'preserve-missing' }, bubbles: true }),
      );

      await vi.waitFor(() => {
        expect(gapReplay).toHaveBeenCalledOnce();
      });
      // The drain awaited the in-flight attestation, so the buffer already carried the
      // crossing when gap replay read it — length 1, not the empty 0 of the race.
      const call = gapReplay.mock.calls[0]![0] as {
        entries: readonly { readonly transition: { readonly cell: string; readonly next: string } }[];
      };
      expect(call.entries).toHaveLength(1);
      expect(call.entries[0]!.transition).toMatchObject({ cell: 'workspace', next: 'expanded' });
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

    // Two fetch legs: the graph QUERY read (ok + sha256 etag) drives gap-replay; the
    // default /czap/snapshot/<id> endpoint converges the rejected-morph DOM (F-REC-3).
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('/czap/snapshot')) {
        return new Response(
          JSON.stringify({ html: '<main>dom-converged</main>', signals: { state: 'expanded' }, lastEventId: 'evt-99' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ status: 'ok', graph: g1, etag: g1.digest.integrity_digest }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
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

    el.innerHTML = '<main>stale-rejected</main>';
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

    // F-REC-3: the rejected-morph DOM ALSO converges — gap-replay fixes the graph +
    // cells, and the snapshot HTML leg replaces the stale rendered DOM.
    await vi.waitFor(() => {
      expect(el.innerHTML).toContain('dom-converged');
    });
    expect(el.innerHTML).not.toContain('stale-rejected');

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

  test('a receipt-only resume replay is attested AND drives recovery so the crossing applies (Codex P2)', async () => {
    // A discrete state crossing is emitted as a receipt-ONLY frame (no signal, no HTML). The
    // app-level replay comes back through applyResumeResponse, not handleMessage, so the resume
    // path must (1) route the receipt through the SAME attestation buffer the live path uses AND
    // (2) DRIVE recovery — replayHtml drops it and replayDroppedSignals ignores it, so `dropped`
    // is false and no snapshot floor runs; buffering alone records the attestation but applies
    // nothing, leaving the StateCell stale. This drives a reconnect whose replay is receipt-only
    // and asserts the buffered crossing is fed into a triggered graph-native recovery.
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

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

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ patches: [{ type: 'receipt', data: { receipt, transition } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    // The triggered recovery runs graph-native gap replay over the buffered receipt (and a
    // domStale snapshot to converge the DOM). Mock both so the test asserts recovery was DRIVEN
    // and fed the crossing, without needing live QUERY / snapshot endpoints.
    const gapReplay = vi.spyOn(core, 'runGraphNativeGapReplay').mockResolvedValue({
      query: { status: 'ok', graph: { id: 'czap:base' }, etag: 'sha256:ok' },
      replayedCells: [],
      discretePayloads: [],
    } as never);
    const fetchSnapshotSpy = vi
      .spyOn(Resumption, 'fetchSnapshot')
      .mockReturnValue(Effect.succeed({ type: 'snapshot', html: '<p>x</p>', signals: {}, lastEventId: 'evt-99' }));

    const dispose = registerStreamRecoverySubstrate('hero', {
      graphQueryUrl: '/api/graph',
      mutationClient: { base: () => ({ id: 'czap:base' }) as never, adopt: vi.fn() },
      cellStore: { get: () => undefined, register: () => {}, applyDiscrete: () => {} } as never,
    });

    try {
      const el = makeEl('div', {
        'data-czap-stream-url': '/api/feed',
        'data-czap-stream-artifact': 'hero',
      });
      const recoveries: Array<Record<string, unknown>> = [];
      el.addEventListener('czap:request-snapshot', ((e: CustomEvent) => recoveries.push(e.detail)) as EventListener);
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

      // Recovery was DRIVEN by the resume (not left for an unrelated future trigger), and it
      // marks the DOM FRESH (`domStale: false`) — no failed morph left the view stale.
      await vi.waitFor(() => {
        expect(recoveries).toContainEqual(expect.objectContaining({ reason: 'resume-receipts', domStale: false }));
        expect(gapReplay).toHaveBeenCalled();
      });
      // ...and the replayed receipt was attested + fed into that gap replay (buffered, not dropped).
      const call = gapReplay.mock.calls[0]![0] as {
        entries: readonly { readonly transition: { readonly cell: string; readonly next: string } }[];
      };
      expect(call.entries).toHaveLength(1);
      expect(call.entries[0]!.transition).toMatchObject({ cell: 'workspace', next: 'expanded' });
      // domStale:false ⇒ the gap replay applies the crossing WITHOUT the snapshot floor, so no
      // snapshot fetch (which would false-error absent a snapshot URL) is issued (Codex P2).
      await flushPromises();
      expect(fetchSnapshotSpy).not.toHaveBeenCalled();
    } finally {
      dispose();
      vi.useRealTimers();
    }
  });
});
