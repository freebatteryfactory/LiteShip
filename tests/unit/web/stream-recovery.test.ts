// @vitest-environment jsdom

/**
 * #133 — graph-native recovery wiring: request-snapshot listener + replay supplement.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as core from '@liteship/core';
import {
  applyDiscreteSnapshotSignals,
  adoptRefreshedGraphBase,
  bindRequestSnapshotRecovery,
  runGraphNativeRecovery,
  supplementReplayIfSignalsDropped,
} from '@liteship/web';
import { Resumption } from '@liteship/web';
import { graph, node } from '../../helpers/graph-fixtures.js';

describe('web stream recovery (#133)', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { origin: 'http://localhost:3000' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('applyDiscreteSnapshotSignals dispatches discrete only — continuous transients NOT replayed', () => {
    const applied: unknown[] = [];
    applyDiscreteSnapshotSignals(
      {
        state: 'open',
        width: 1280,
        'scroll.progress': 0.5,
      },
      (payload) => applied.push(payload),
    );

    expect(applied).toEqual([{ state: 'open' }]);
  });

  test('adoptRefreshedGraphBase calls refreshBase then adopt on the mutation client', async () => {
    const graph = { id: 'fresh-graph' } as never;
    const adopt = vi.fn();
    const refreshBase = vi.fn(async () => graph);

    await adoptRefreshedGraphBase({ base: () => graph, adopt, refreshBase });

    expect(refreshBase).toHaveBeenCalledOnce();
    expect(adopt).toHaveBeenCalledWith(graph);
  });

  test('adoptRefreshedGraphBase uses graphQueryUrl when provided', async () => {
    const fresh = graph([node('scroll.y')]);
    const adopt = vi.fn();
    const queryRefresh = vi.fn(async () => fresh);
    vi.spyOn(core, 'createGraphQueryRefreshBase').mockReturnValue(queryRefresh);

    await adoptRefreshedGraphBase({ base: () => fresh, adopt }, '/api/graph');

    expect(core.createGraphQueryRefreshBase).toHaveBeenCalledWith('/api/graph', expect.any(Object));
    expect(queryRefresh).toHaveBeenCalledOnce();
    expect(adopt).toHaveBeenCalledWith(fresh);
  });

  test('bindRequestSnapshotRecovery wires a real listener for liteship:request-snapshot', async () => {
    const fetchSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockResolvedValue({
      type: 'snapshot',
      html: '<main>fresh</main>',
      signals: { state: 'recovered' },
      lastEventId: 'evt-9',
    });

    const host = document.createElement('div');
    const htmlApplied: string[] = [];
    const signals: unknown[] = [];

    const dispose = bindRequestSnapshotRecovery(host, {
      artifactId: 'doc-1',
      handlers: {
        applyHtml: async (html) => {
          htmlApplied.push(html);
        },
        applyDiscreteSignal: (payload) => signals.push(payload),
      },
    });

    host.dispatchEvent(
      new CustomEvent('liteship:request-snapshot', {
        detail: { reason: 'preserve-missing' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      expect(htmlApplied).toEqual(['<main>fresh</main>']);
    });
    expect(fetchSpy).toHaveBeenCalledWith('doc-1', expect.any(Object));
    expect(signals).toEqual([{ state: 'recovered' }]);

    dispose();
  });

  test('bindRequestSnapshotRecovery ignores overlapping snapshot requests while recovery is in flight', async () => {
    let resolveFetch: (() => void) | undefined;
    const pending = new Promise<{ type: 'snapshot'; html: string; signals: unknown; lastEventId: string }>(
      (resolve) => {
        resolveFetch = () =>
          resolve({ type: 'snapshot', html: '<main>once</main>', signals: { state: 'ok' }, lastEventId: 'evt-1' });
      },
    );
    const fetchSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(pending);

    const host = document.createElement('div');
    const htmlApplied: string[] = [];

    const dispose = bindRequestSnapshotRecovery(host, {
      artifactId: 'doc-1',
      handlers: {
        applyHtml: async (html) => {
          htmlApplied.push(html);
        },
        applyDiscreteSignal: () => undefined,
      },
    });

    host.dispatchEvent(
      new CustomEvent('liteship:request-snapshot', {
        detail: { reason: 'preserve-missing' },
        bubbles: true,
      }),
    );
    host.dispatchEvent(
      new CustomEvent('liteship:request-snapshot', {
        detail: { reason: 'preserve-missing' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    resolveFetch?.();

    await vi.waitFor(() => {
      expect(htmlApplied).toEqual(['<main>once</main>']);
    });

    dispose();
  });

  test('bindRequestSnapshotRecovery dispatches liteship:stream-error when recovery fails', async () => {
    vi.spyOn(Resumption, 'fetchSnapshot').mockRejectedValue({ _tag: 'NetworkError', message: 'offline' });

    const host = document.createElement('div');
    const errors: Array<{ reason: string; message?: string }> = [];
    host.addEventListener('liteship:stream-error', ((event: CustomEvent) => errors.push(event.detail)) as EventListener);

    const dispose = bindRequestSnapshotRecovery(host, {
      artifactId: 'doc-1',
      handlers: {
        applyHtml: async () => undefined,
        applyDiscreteSignal: () => undefined,
      },
    });

    host.dispatchEvent(
      new CustomEvent('liteship:request-snapshot', {
        detail: { reason: 'preserve-missing' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      expect(errors).toEqual([
        expect.objectContaining({
          reason: 'snapshot-recovery-failed',
        }),
      ]);
    });

    dispose();
  });

  test('supplementReplayIfSignalsDropped recovers missed discrete crossing after HTML-only replay', async () => {
    const fetchSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockResolvedValue({
      type: 'snapshot',
      html: '<main>ignored</main>',
      signals: { state: 'gap-recovered', width: 999 },
      lastEventId: 'evt-5',
    });

    const signals: unknown[] = [];
    let htmlCalls = 0;

    await supplementReplayIfSignalsDropped(['<p>43</p>', { type: 'signal', data: { state: 'missed' } }], {
      artifactId: 'doc-1',
      handlers: {
        applyHtml: async () => {
          htmlCalls += 1;
        },
        applyDiscreteSignal: (payload) => signals.push(payload),
      },
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(htmlCalls).toBe(0);
    expect(signals).toEqual([{ state: 'gap-recovered' }]);
  });

  test('supplementReplayIfSignalsDropped is a no-op when replay is HTML-only', async () => {
    const fetchSpy = vi.spyOn(Resumption, 'fetchSnapshot');

    await supplementReplayIfSignalsDropped(['<p>only-html</p>'], {
      artifactId: 'doc-1',
      handlers: {
        applyHtml: async () => undefined,
        applyDiscreteSignal: () => undefined,
      },
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('runGraphNativeRecovery performs refreshBase/adopt then snapshot re-sync', async () => {
    const graph = { id: 'refreshed' } as never;
    const adopt = vi.fn();
    const refreshBase = vi.fn(async () => graph);

    vi.spyOn(Resumption, 'fetchSnapshot').mockResolvedValue({
      type: 'snapshot',
      html: '<section>sync</section>',
      signals: [{ state: 'synced' }],
      lastEventId: 'evt-1',
    });

    const htmlApplied: string[] = [];
    const signals: unknown[] = [];

    await runGraphNativeRecovery({
      artifactId: 'doc-1',
      mutationClient: { base: () => graph, adopt, refreshBase },
      handlers: {
        applyHtml: async (html) => {
          htmlApplied.push(html);
        },
        applyDiscreteSignal: (payload) => signals.push(payload),
      },
    });

    expect(refreshBase).toHaveBeenCalledOnce();
    expect(adopt).toHaveBeenCalledWith(graph);
    expect(htmlApplied).toEqual(['<section>sync</section>']);
    expect(signals).toEqual([{ state: 'synced' }]);
  });

  test('runGraphNativeRecovery prefers gap-replay when QUERY substrate is complete (#133-full)', async () => {
    const local = graph([node('scroll.y')]);
    const adopt = vi.fn();
    const applyDiscrete = vi.fn();
    const gapReplay = vi.spyOn(core, 'runGraphNativeGapReplay').mockResolvedValue({
      query: { status: 'ok', graph: local, etag: 'etag' },
      replayedCells: [],
      discretePayloads: [],
    } as never);
    const snapshotSpy = vi.spyOn(Resumption, 'fetchSnapshot');

    await runGraphNativeRecovery({
      artifactId: 'doc-1',
      graphQueryUrl: '/api/graph',
      mutationClient: { base: () => local, adopt },
      cellStore: { get: () => undefined, register: () => {}, applyDiscrete: () => {} } as never,
      patchReceiptEntries: [],
      handlers: {
        applyHtml: async () => {},
        applyDiscreteSignal: applyDiscrete,
      },
    });

    expect(gapReplay).toHaveBeenCalledOnce();
    expect(snapshotSpy).not.toHaveBeenCalled();
  });

  test('F-REC-3: valid-graph gap-replay + STALE DOM converges to fresh DOM (applies snapshot HTML)', async () => {
    const local = graph([node('scroll.y')]);
    const adopt = vi.fn();
    vi.spyOn(core, 'runGraphNativeGapReplay').mockResolvedValue({
      query: { status: 'ok', graph: local, etag: 'etag' },
      replayedCells: [],
      transitions: [],
    } as never);
    const snapshotSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockResolvedValue({
      type: 'snapshot',
      html: '<main>fresh</main>',
      signals: { state: 'converged' },
      lastEventId: 'evt-3',
    });

    const htmlApplied: string[] = [];
    await runGraphNativeRecovery({
      artifactId: 'doc-1',
      graphQueryUrl: '/api/graph',
      mutationClient: { base: () => local, adopt },
      cellStore: { register: () => {}, hydrateDiscrete: () => ({}) } as never,
      patchReceiptEntries: [],
      // The morph was rejected → the rendered DOM is known-stale.
      domStale: () => true,
      handlers: {
        applyHtml: async (html) => {
          htmlApplied.push(html);
        },
        applyDiscreteSignal: () => undefined,
      },
    });

    expect(snapshotSpy).toHaveBeenCalledOnce();
    expect(htmlApplied).toEqual(['<main>fresh</main>']);
  });

  test('F-REC-3/4: 304 gap-replay + STALE DOM converges to fresh DOM AND does not throw', async () => {
    const local = graph([node('scroll.y')]);
    const adopt = vi.fn();
    vi.spyOn(core, 'runGraphNativeGapReplay').mockResolvedValue({
      query: { status: 'not_modified', etag: 'sha256:x' },
      replayedCells: [],
      transitions: [],
    } as never);
    const snapshotSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockResolvedValue({
      type: 'snapshot',
      html: '<main>converged-304</main>',
      signals: { state: 'ok' },
      lastEventId: 'evt-4',
    });

    const htmlApplied: string[] = [];
    await expect(
      runGraphNativeRecovery({
        artifactId: 'doc-1',
        graphQueryUrl: '/api/graph',
        mutationClient: { base: () => local, adopt },
        cellStore: { register: () => {}, hydrateDiscrete: () => ({}) } as never,
        patchReceiptEntries: [],
        domStale: () => true,
        handlers: {
          applyHtml: async (html) => {
            htmlApplied.push(html);
          },
          applyDiscreteSignal: () => undefined,
        },
      }),
    ).resolves.toBeUndefined();

    expect(snapshotSpy).toHaveBeenCalledOnce();
    expect(htmlApplied).toEqual(['<main>converged-304</main>']);
  });

  test('F-REC-3: gap-replay ok + FRESH DOM keeps the fast path (no snapshot fetch)', async () => {
    const local = graph([node('scroll.y')]);
    const adopt = vi.fn();
    vi.spyOn(core, 'runGraphNativeGapReplay').mockResolvedValue({
      query: { status: 'ok', graph: local, etag: 'etag' },
      replayedCells: [],
      transitions: [],
    } as never);
    const snapshotSpy = vi.spyOn(Resumption, 'fetchSnapshot');

    await runGraphNativeRecovery({
      artifactId: 'doc-1',
      graphQueryUrl: '/api/graph',
      mutationClient: { base: () => local, adopt },
      cellStore: { register: () => {}, hydrateDiscrete: () => ({}) } as never,
      patchReceiptEntries: [],
      domStale: () => false,
      handlers: { applyHtml: async () => {}, applyDiscreteSignal: () => undefined },
    });

    expect(snapshotSpy).not.toHaveBeenCalled();
  });

  test('F-REC-4: createGraphQueryRefreshBase resolves not_modified to the current base (no throw)', async () => {
    const base = graph([node('a')]);
    const fetchImpl: typeof fetch = async () =>
      ({
        status: 304,
        headers: new Headers({ etag: `"${core.graphQueryEtag(base)}"` }),
        json: async () => null,
      }) as Response;

    const refreshBase = core.createGraphQueryRefreshBase('/api/graph', {
      fetchImpl,
      currentEtag: () => core.graphQueryEtag(base),
      currentBase: () => base,
    });

    await expect(refreshBase()).resolves.toBe(base);
  });
});
