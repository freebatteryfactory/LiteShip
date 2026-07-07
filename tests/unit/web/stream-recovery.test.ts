// @vitest-environment jsdom

/**
 * #133 — graph-native recovery wiring: request-snapshot listener + replay supplement.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Effect } from 'effect';
import {
  applyDiscreteSnapshotSignals,
  adoptRefreshedGraphBase,
  bindRequestSnapshotRecovery,
  runGraphNativeRecovery,
  supplementReplayIfSignalsDropped,
} from '@czap/web';
import { Resumption } from '@czap/web';

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

  test('bindRequestSnapshotRecovery wires a real listener for czap:request-snapshot', async () => {
    const fetchSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({
        type: 'snapshot',
        html: '<main>fresh</main>',
        signals: { state: 'recovered' },
        lastEventId: 'evt-9',
      }),
    );

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
      new CustomEvent('czap:request-snapshot', {
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

  test('supplementReplayIfSignalsDropped recovers missed discrete crossing after HTML-only replay', async () => {
    const fetchSpy = vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({
        type: 'snapshot',
        html: '<main>ignored</main>',
        signals: { state: 'gap-recovered', width: 999 },
        lastEventId: 'evt-5',
      }),
    );

    const signals: unknown[] = [];
    let htmlCalls = 0;

    await supplementReplayIfSignalsDropped(
      [
        '<p>43</p>',
        { type: 'signal', data: { state: 'missed' } },
      ],
      {
        artifactId: 'doc-1',
        handlers: {
          applyHtml: async () => {
            htmlCalls += 1;
          },
          applyDiscreteSignal: (payload) => signals.push(payload),
        },
      },
    );

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

    vi.spyOn(Resumption, 'fetchSnapshot').mockReturnValue(
      Effect.succeed({
        type: 'snapshot',
        html: '<section>sync</section>',
        signals: [{ state: 'synced' }],
        lastEventId: 'evt-1',
      }),
    );

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
});
