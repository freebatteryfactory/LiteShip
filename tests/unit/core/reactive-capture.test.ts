/**
 * reactive-capture — EMPIRICAL capture of the CURRENT Effect-backed reactive
 * primitives (Wave 5.5 transition cage, FOUNDATION-A).
 *
 * This suite drives a seeded op-history corpus over Cell / Derived / Store /
 * Signal / Timeline / LiveCell through `tests/support/reactive-capture.ts` and
 * PINS the observations as committed golden fixtures
 * (`tests/fixtures/reactive-capture/*.json`). It is a CAPTURE, not a product
 * law — Wave 6 chooses the law; this wave records what the primitives do today
 * so the migration can prove it is behavior-preserving (or a deliberate change).
 *
 * TWO GATES:
 *  1. DETERMINISM (the capture-harness's own red/green — "double-run diff"): each
 *     history is captured TWICE and the two observations must be byte-identical
 *     (equal `observationDigest`). A nondeterministic harness reds here. This is
 *     what makes the golden fixtures trustworthy.
 *  2. GOLDEN-FIXTURE MATCH (the byte-law cage): the captured observation must
 *     equal the committed fixture. Regenerate deliberately with
 *     `LITESHIP_CAPTURE_UPDATE=1`.
 *
 * THE DEDUP QUESTION is answered here by CAPTURE (the `duplicate-consecutive`
 * seeds + the explicit "dedup verdict" describe): does today's primitive suppress
 * consecutive-equal emissions? The observed deliveries are the authority.
 *
 * @module
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, test } from 'vitest';
import { AVBridge, Signal } from '@liteship/core';
import { capture } from '../../support/reactive-capture.js';
import {
  captureEntry,
  observationDigest,
  op,
  traceDigest,
} from '../../support/reactive-trace.js';
import type { CaptureEntry, OpHistory, ReactionSpec } from '../../support/reactive-trace.js';

// ---------------------------------------------------------------------------
// The seeded op-history corpus — the nine enumerated behaviors, per primitive,
// expressed only with the ops that primitive supports.
// ---------------------------------------------------------------------------

interface CorpusEntry {
  readonly seed: string;
  readonly history: OpHistory;
}

const setOn = (onValue: number, value: number): ReactionSpec => ({ kind: 'set', onValue, value });
const subOn = (onValue: number, newSink: string): ReactionSpec => ({ kind: 'subscribe', onValue, newSink });
const unsubOn = (onValue: number, target: string): ReactionSpec => ({ kind: 'unsubscribe', onValue, target });
const throwOn = (onValue: number): ReactionSpec => ({ kind: 'throw', onValue });

const cellCorpus: readonly CorpusEntry[] = [
  { seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()] },
  { seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  { seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.subscribe('c'), op.set(5)] },
  {
    seed: 'nested-write',
    history: [op.subscribe('a', [setOn(1, 99)]), op.subscribe('b'), op.set(1), op.read()],
  },
  {
    seed: 'subscribe-during-publish',
    history: [op.subscribe('a', [subOn(5, 'late')]), op.set(5), op.set(6), op.read()],
  },
  {
    seed: 'unsubscribe-during-publish',
    history: [op.subscribe('a', [unsubOn(5, 'b')]), op.subscribe('b'), op.set(5), op.set(6)],
  },
  {
    seed: 'listener-failure',
    history: [op.subscribe('a', [throwOn(3)]), op.subscribe('b'), op.set(3), op.set(4), op.read()],
  },
  { seed: 'disposal-completion', history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()] },
  {
    seed: 'update-path',
    history: [op.subscribe('a'), op.update({ kind: 'add', n: 10 }), op.update({ kind: 'mul', n: 2 }), op.read()],
  },
];

const storeCorpus: readonly CorpusEntry[] = [
  { seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()] },
  { seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  { seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.subscribe('c'), op.set(5)] },
  {
    seed: 'nested-dispatch',
    history: [op.subscribe('a', [setOn(1, 99)]), op.subscribe('b'), op.set(1), op.read()],
  },
  {
    seed: 'listener-failure',
    history: [op.subscribe('a', [throwOn(3)]), op.subscribe('b'), op.set(3), op.set(4), op.read()],
  },
  { seed: 'disposal', history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()] },
];

const derivedCorpus: readonly CorpusEntry[] = [
  { seed: 'initial-value', history: [op.subscribe('a'), op.read()] },
  { seed: 'recompute-on-source', history: [op.subscribe('a'), op.set(5), op.read()] },
  { seed: 'duplicate-source', history: [op.subscribe('a'), op.set(5), op.set(5), op.set(8), op.read()] },
  { seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.set(5)] },
  { seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(5), op.subscribe('b'), op.read()] },
  { seed: 'disposal', history: [op.subscribe('a'), op.set(5), op.dispose(), op.set(9), op.read()] },
];

const signalCorpus: readonly CorpusEntry[] = [
  { seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  { seed: 'pause-gate', history: [op.subscribe('a'), op.pause(), op.set(5), op.resume(), op.set(6), op.read()] },
  { seed: 'subscriber-order', history: [op.subscribe('a'), op.subscribe('b'), op.set(5)] },
  { seed: 'late-subscriber-replay', history: [op.subscribe('a'), op.set(3), op.set(5), op.subscribe('b'), op.read()] },
  { seed: 'disposal', history: [op.subscribe('a'), op.set(1), op.dispose(), op.set(2), op.read()] },
];

const timelineCorpus: readonly CorpusEntry[] = [
  { seed: 'initial-state', history: [op.subscribe('a'), op.read()] },
  { seed: 'play-advance', history: [op.subscribe('a'), op.play(), op.tick(1), op.tick(1), op.tick(1), op.read()] },
  {
    seed: 'seek-across-thresholds',
    history: [op.subscribe('a'), op.set(150), op.set(50), op.set(150), op.read()],
  },
  { seed: 'duplicate-state-seek', history: [op.subscribe('a'), op.set(150), op.set(160), op.read()] },
  { seed: 'scrub', history: [op.subscribe('a'), op.scrub(0.5), op.scrub(1), op.read()] },
  {
    seed: 'pause-resume-advance',
    history: [op.subscribe('a'), op.play(), op.tick(1), op.pause(), op.tick(1), op.tick(1), op.read()],
  },
  { seed: 'disposal', history: [op.subscribe('a'), op.play(), op.tick(1), op.dispose(), op.tick(1), op.read()] },
];

const liveCellCorpus: readonly CorpusEntry[] = [
  { seed: 'initial-replay', history: [op.subscribe('a'), op.read()] },
  { seed: 'duplicate-consecutive', history: [op.subscribe('a'), op.set(7), op.set(7), op.set(7), op.read()] },
  {
    seed: 'crossings-and-identity',
    history: [op.subscribe('a'), op.set(150), op.set(50), op.set(150), op.read()],
  },
  {
    seed: 'update-crossing',
    history: [op.subscribe('a'), op.update({ kind: 'add', n: 150 }), op.read()],
  },
  {
    seed: 'manual-crossing-fanout',
    history: [op.subscribe('a'), op.publishCrossing('idle', 'active', 120), op.read()],
  },
  { seed: 'disposal', history: [op.subscribe('a'), op.set(150), op.dispose(), op.set(50), op.read()] },
];

const CORPUS: Readonly<Record<string, readonly CorpusEntry[]>> = {
  cell: cellCorpus,
  store: storeCorpus,
  derived: derivedCorpus,
  signal: signalCorpus,
  timeline: timelineCorpus,
  'live-cell': liveCellCorpus,
};

// ---------------------------------------------------------------------------
// Golden fixture I/O
// ---------------------------------------------------------------------------

const FIXTURE_DIR = fileURLToPath(new URL('../../fixtures/reactive-capture/', import.meta.url));
const UPDATE = process.env.LITESHIP_CAPTURE_UPDATE === '1';

const fixturePath = (primitive: string): string => `${FIXTURE_DIR}${primitive}.json`;

const readGolden = (primitive: string): readonly CaptureEntry[] => {
  const p = fixturePath(primitive);
  if (!existsSync(p)) return [];
  const parsed: unknown = JSON.parse(readFileSync(p, 'utf8'));
  return Array.isArray(parsed) ? (parsed as CaptureEntry[]) : [];
};

const goldenBySeed = (primitive: string): Map<string, CaptureEntry> => {
  const map = new Map<string, CaptureEntry>();
  for (const entry of readGolden(primitive)) map.set(entry.seed, entry);
  return map;
};

// Accumulates freshly captured entries for the LITESHIP_CAPTURE_UPDATE write pass.
const generated = new Map<string, CaptureEntry[]>();
const recordGenerated = (primitive: string, entry: CaptureEntry): void => {
  const list = generated.get(primitive) ?? [];
  list.push(entry);
  generated.set(primitive, list);
};

afterAll(() => {
  if (!UPDATE) return;
  mkdirSync(FIXTURE_DIR, { recursive: true });
  for (const [primitive, entries] of generated) {
    writeFileSync(fixturePath(primitive), `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  }
});

// ---------------------------------------------------------------------------
// Per-primitive capture + determinism + golden match
// ---------------------------------------------------------------------------

for (const [primitive, corpus] of Object.entries(CORPUS)) {
  describe(`reactive-capture — ${primitive}`, () => {
    const golden = goldenBySeed(primitive);

    for (const { seed, history } of corpus) {
      test(`${seed} — deterministic + golden`, async () => {
        // Gate 1: determinism (double-run diff) — the harness's own red/green.
        const obs1 = await capture(primitive, history);
        const obs2 = await capture(primitive, history);
        expect(observationDigest(obs2)).toBe(observationDigest(obs1));
        expect(obs2).toEqual(obs1);

        const entry = captureEntry(primitive, seed, history, obs1);
        // The trace digest is a pure fold over the history bytes (stable key).
        expect(entry.traceDigest).toBe(traceDigest(history));

        if (UPDATE) {
          recordGenerated(primitive, entry);
          return;
        }

        // Gate 2: golden-fixture match (the byte-law cage).
        const pinned = golden.get(seed);
        expect(pinned, `missing golden fixture for ${primitive}/${seed} — regenerate with LITESHIP_CAPTURE_UPDATE=1`).toBeDefined();
        if (pinned === undefined) return;
        expect(entry.observationDigest).toBe(pinned.observationDigest);
        expect(entry.observation).toEqual(pinned.observation);
        expect(entry.traceDigest).toBe(pinned.traceDigest);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// THE DEDUP QUESTION — answered by capture, asserted explicitly per primitive.
// ---------------------------------------------------------------------------

describe('reactive-capture — dedup verdict (does today suppress consecutive-equal emissions?)', () => {
  test('Cell: NO dedup — set(7)x3 delivers [7,7,7]', async () => {
    const obs = await capture('cell', [op.subscribe('a'), op.set(7), op.set(7), op.set(7)]);
    const a = obs.subscribers.find((s) => s.sink === 'a');
    // initial 0 replayed, then every set delivered — no suppression.
    expect(a?.deliveries).toEqual([0, 7, 7, 7]);
  });

  test('Store: NO dedup — dispatch to a reference-equal state still publishes', async () => {
    const obs = await capture('store', [op.subscribe('a'), op.set(7), op.set(7), op.set(7)]);
    const a = obs.subscribers.find((s) => s.sink === 'a');
    expect(a?.deliveries).toEqual([0, 7, 7, 7]);
  });

  test('Derived: NO dedup — equal recomputes re-publish (plus an extra initial republish from source replay)', async () => {
    const obs = await capture('derived', [op.subscribe('a'), op.set(5), op.set(5), op.set(8)]);
    const a = obs.subscribers.find((s) => s.sink === 'a');
    // [initial 100, source-replay republish 100, 105, 105 (dup), 108]
    expect(a?.deliveries).toEqual([100, 100, 105, 105, 108]);
  });

  test('Signal (controllable): NO dedup on the value channel — every seek publishes', async () => {
    const obs = await capture('signal', [op.subscribe('a'), op.set(7), op.set(7), op.set(7)]);
    const a = obs.subscribers.find((s) => s.sink === 'a');
    expect(a?.deliveries).toEqual([0, 7, 7, 7]);
  });

  test('LiveCell (value channel): NO dedup — inherits the Cell replay-1 emit-every-set policy', async () => {
    const obs = await capture('live-cell', [op.subscribe('a'), op.set(7), op.set(7), op.set(7)]);
    const a = obs.subscribers.find((s) => s.sink === 'a');
    expect(a?.deliveries).toEqual([0, 7, 7, 7]);
  });

  test('Timeline (state channel): DEDUP — two seeks into the SAME state publish the state ONCE', async () => {
    // 150 and 160 both resolve to boundary state "active"; the state channel
    // publishes only on newState !== oldState (hand-rolled reference-identity distinct).
    const obs = await capture('timeline', [op.subscribe('a'), op.set(150), op.set(160)]);
    const a = obs.subscribers.find((s) => s.sink === 'a');
    expect(a?.deliveries).toEqual(['idle', 'active']);
  });
});

// ---------------------------------------------------------------------------
// Signal.audio — the EAGER-THROW construction-time fault edge (deterministic).
// ---------------------------------------------------------------------------

describe('reactive-capture — Signal.audio eager-throw (construction-time fault)', () => {
  const bridge = AVBridge.make({ sampleRate: 48000, fps: 60 });

  test('normalized mode without a positive duration throws SYNCHRONOUSLY, before returning the Effect', () => {
    expect(() => Signal.audio(bridge, 'normalized')).toThrow();
  });

  test('normalized mode with a positive duration does NOT throw (returns an Effect)', () => {
    expect(() => Signal.audio(bridge, 'normalized', 120)).not.toThrow();
  });

  test('sample mode never requires a duration', () => {
    expect(() => Signal.audio(bridge, 'sample')).not.toThrow();
  });
});
