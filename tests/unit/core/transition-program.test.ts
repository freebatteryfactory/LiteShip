/**
 * TransitionProgram — the explicit multi-transition algebra (#141).
 *
 * RED-first: a per-node `routing` LABEL collapses `seq`/`par` to the SAME two
 * endpoint frames (the bug). These tests pin the window MATH of the real algebra —
 * `seq` total == Σ, `par` total == max, `choice` executes EXACTLY one branch — plus
 * the interrupt/replay/reduced-motion laws.
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import {
  sealNode,
  sealGraph,
  interpretTransition,
  lowerTransitionProgram,
  interpretProgram,
  sampleProgramWindows,
  lowerRevealChain,
  Stagger,
  lowerStaggerIntent,
  staggerProgram,
  StateCellStore,
  type CellMeta,
  type ContentAddress,
  type DocumentGraph,
  type DocumentGraphNode,
  type PoseNode,
  type TransitionNode,
  type EntityNode,
  type ComponentNode,
  type SignalNode,
  type TransitionProgram,
  type TypedValue,
} from '@czap/core';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

interface Step {
  readonly transitionId: ContentAddress;
  readonly nodes: DocumentGraphNode[];
}

const NODES: DocumentGraphNode[] = [];

const signal = sealNode({
  _tag: 'DocGraphSignalNode',
  _version: 1,
  family: 'signal',
  id: '',
  meta: META,
  input: 'scroll.progress',
} as unknown as SignalNode);

const component = sealNode({
  _tag: 'DocGraphComponentNode',
  _version: 1,
  family: 'component',
  id: '',
  meta: META,
  name: 'hero',
  thresholds: [0, 1],
  states: ['before', 'after'],
} as unknown as ComponentNode);

const entity = sealNode({
  _tag: 'DocGraphEntityNode',
  _version: 1,
  family: 'entity',
  id: '',
  meta: META,
  components: [component.id],
} as unknown as EntityNode);

/** Build a single transition step (from/to poses on the shared hero entity). */
function makeStep(
  from: Record<string, number | string>,
  to: Record<string, number | string>,
  durationMs: number,
  routing: 'seq' | 'par' = 'seq',
): Step {
  const fromPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'before',
    bindings: from,
  } as unknown as PoseNode);
  const toPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'after',
    bindings: to,
  } as unknown as PoseNode);
  const transition = sealNode({
    _tag: 'DocGraphTransitionNode',
    _version: 1,
    family: 'transition',
    id: '',
    meta: META,
    fromPose: fromPose.id,
    toPose: toPose.id,
    routing,
    durationMs,
    easing: { kind: 'linear' },
  } as unknown as TransitionNode);
  return { transitionId: transition.id, nodes: [fromPose, toPose, transition] };
}

// Two distinct-property steps: A opacity over 200ms, B --czap-hero-x over 600ms.
const stepA = makeStep({ opacity: 0 }, { opacity: 1 }, 200);
const stepB = makeStep({ '--czap-hero-x': '0px' }, { '--czap-hero-x': '100px' }, 600);
NODES.push(signal, component, entity, ...stepA.nodes, ...stepB.nodes);

const graph: DocumentGraph = sealGraph({
  _tag: 'DocumentGraph',
  _version: 1,
  meta: META,
  nodes: NODES,
  edges: [{ from: signal.id, to: component.id, type: 'seq' }],
} as Omit<DocumentGraph, 'id' | 'digest'>);

const seqProg: TransitionProgram = {
  kind: 'seq',
  children: [
    { kind: 'step', transitionId: stepA.transitionId },
    { kind: 'step', transitionId: stepB.transitionId },
  ],
};
const parProg: TransitionProgram = {
  kind: 'par',
  children: [
    { kind: 'step', transitionId: stepA.transitionId },
    { kind: 'step', transitionId: stepB.transitionId },
  ],
};

function num(v: TypedValue): number {
  if (v.k === 'number' || v.k === 'opacity' || v.k === 'length' || v.k === 'angle') return v.v;
  throw new Error('not scalar');
}
function sampleVar(prog: TransitionProgram, cssVar: string, t: number): number {
  const runtime = interpretProgram(graph, prog).runtime!;
  const sample = sampleProgramWindows(runtime.windows!, t).find((s) => s.cssVar === cssVar);
  return num(sample!.value);
}

describe('TransitionProgram — RED-first: seq/par no longer collapse to one label', () => {
  test('BUG (pre-W9): a per-node routing label gives IDENTICAL two-endpoint frames', () => {
    // A single TransitionNode cannot express "A THEN B" vs "A WITH B": the only knob
    // was `routing`, and seq/par produced the SAME two-frame [0→1] lowering. Proof:
    const seqNode = interpretTransition(graph, stepA.transitionId);
    const parStep = makeStep({ opacity: 0 }, { opacity: 1 }, 200, 'par');
    const g2 = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta: META,
      nodes: [signal, component, entity, ...parStep.nodes],
      edges: [],
    } as Omit<DocumentGraph, 'id' | 'digest'>);
    const parNode = interpretTransition(g2, parStep.transitionId);
    // Same two frames regardless of routing — no sequencing possible from one node.
    expect(seqNode.css!.keyframes.map((k) => k.offset)).toEqual([0, 1]);
    expect(parNode.css!.keyframes.map((k) => k.offset)).toEqual([0, 1]);
    expect(seqNode.css!.keyframes).toEqual(parNode.css!.keyframes);
  });

  test('FIX: the SAME two steps as seq vs par lower to DISTINCT multi-offset timelines', () => {
    const seq = lowerTransitionProgram(graph, seqProg);
    const par = lowerTransitionProgram(graph, parProg);

    // seq total == Σ (200+600); par total == max(200,600).
    expect(seq.totalMs).toBe(800);
    expect(par.totalMs).toBe(600);

    // seq windows are disjoint + contiguous; par windows both start at 0.
    expect(seq.entries.map((e) => [e.windowStart, e.windowEnd])).toEqual([
      [0, 0.25],
      [0.25, 1],
    ]);
    expect(par.entries.map((e) => [e.windowStart, e.windowEnd])).toEqual([
      [0, 200 / 600],
      [0, 1],
    ]);
    expect(seq.entries).not.toEqual(par.entries);
  });

  test('FIX: interpretProgram emits REAL multi-offset keyframes (a seam stop at 0.25)', () => {
    const plan = interpretProgram(graph, seqProg);
    const offsets = plan.css!.keyframes.map((k) => k.offset);
    // 0 / 0.25 (A done, B starts) / 1 — not the two-endpoint collapse.
    expect(offsets).toEqual([0, 0.25, 1]);
    // At the 0.25 seam: opacity fully 1 (A complete), x still 0px (B not started).
    const seam = plan.css!.keyframes.find((k) => k.offset === 0.25)!;
    expect(seam.properties.opacity).toBe('1');
    expect(seam.properties['--czap-hero-x']).toBe('0px');
  });
});

describe('TransitionProgram — algebra LAWS', () => {
  test('seq: total == Σ children + delays, sub-window offsets exact (Plan-ordered)', () => {
    const withDelay: TransitionProgram = {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: stepA.transitionId, delayMs: 100 }, // 100 + 200
        { kind: 'step', transitionId: stepB.transitionId }, // 600
      ],
    };
    const t = lowerTransitionProgram(graph, withDelay);
    expect(t.totalMs).toBe(900); // 100 + 200 + 600
    // A: dead 100ms then tween → window [100/900, 300/900]; B: [300/900, 1].
    expect(t.entries[0]!.windowStart).toBeCloseTo(100 / 900, 10);
    expect(t.entries[0]!.windowEnd).toBeCloseTo(300 / 900, 10);
    expect(t.entries[1]!.windowStart).toBeCloseTo(300 / 900, 10);
    expect(t.entries[1]!.windowEnd).toBe(1);
  });

  test('seq: three steps keep deterministic ascending order (Plan.topoSort substrate)', () => {
    const s3 = makeStep({ '--czap-hero-z': '0px' }, { '--czap-hero-z': '9px' }, 100);
    const g3 = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta: META,
      nodes: [...NODES, ...s3.nodes],
      edges: [],
    } as Omit<DocumentGraph, 'id' | 'digest'>);
    const prog: TransitionProgram = {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: stepA.transitionId },
        { kind: 'step', transitionId: stepB.transitionId },
        { kind: 'step', transitionId: s3.transitionId },
      ],
    };
    const t = lowerTransitionProgram(g3, prog);
    const starts = t.entries.map((e) => e.windowStart);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(t.totalMs).toBe(900); // 200 + 600 + 100
  });

  test('par: total == max, and a SHORT child holds its final pose after completing', () => {
    // A (opacity, 200ms) finishes at global t = 200/600 ≈ 0.333; par total is 600.
    const par = lowerTransitionProgram(graph, parProg);
    expect(par.totalMs).toBe(600);
    // Past A's window, opacity holds `to` (=1) while B keeps moving.
    expect(sampleVar(parProg, 'opacity', 200 / 600)).toBeCloseTo(1, 10); // A just done
    expect(sampleVar(parProg, 'opacity', 0.9)).toBe(1); // A holds
    // B is only ~90% through at t=0.9 (linear): x ≈ 90px.
    expect(sampleVar(parProg, '--czap-hero-x', 0.9)).toBeCloseTo(90, 6);
  });

  test('choice: executes EXACTLY one branch — cover branch-0, otherwise, and unmatched', () => {
    const choiceProg: TransitionProgram = {
      kind: 'choice',
      branches: [
        {
          when: { op: 'gte', value: 768 },
          source: 'viewport.width' as never,
          body: { kind: 'step', transitionId: stepA.transitionId },
        },
      ],
      otherwise: { kind: 'step', transitionId: stepB.transitionId },
    };

    // Wide viewport → branch-0 (stepA, opacity), never the otherwise (stepB, x).
    const wide = lowerTransitionProgram(graph, choiceProg, { signals: { 'viewport.width': 1024 } });
    expect(wide.selectedBranchIds).toEqual(['branch-0']);
    expect(wide.entries).toHaveLength(1);
    expect(wide.entries[0]!.transitionId).toBe(stepA.transitionId);
    expect(wide.entries[0]!.branchGuard?.branchId).toBe('branch-0');
    // The unchosen branch's property is NEVER written.
    const wideRt = interpretProgram(graph, choiceProg, { signals: { 'viewport.width': 1024 } }).runtime!;
    expect(sampleProgramWindows(wideRt.windows!, 1).map((s) => s.cssVar)).toEqual(['opacity']);

    // Narrow viewport → otherwise (stepB).
    const narrow = lowerTransitionProgram(graph, choiceProg, { signals: { 'viewport.width': 320 } });
    expect(narrow.selectedBranchIds).toEqual(['otherwise']);
    expect(narrow.entries[0]!.transitionId).toBe(stepB.transitionId);

    // No signal + no match → unmatched: a loud diagnostic, no windows.
    const bare: TransitionProgram = { kind: 'choice', branches: choiceProg.branches };
    const none = lowerTransitionProgram(graph, bare, { signals: {} });
    expect(none.entries).toHaveLength(0);
    expect(none.diagnostics.some((d) => d.code === 'choice-unmatched')).toBe(true);
  });

  test('choice: interpretProgram records the selected branch as an auditable receipt', () => {
    const choiceProg: TransitionProgram = {
      kind: 'choice',
      branches: [
        {
          when: { op: 'gte', value: 768 },
          source: 'viewport.width' as never,
          body: { kind: 'step', transitionId: stepA.transitionId },
        },
      ],
      otherwise: { kind: 'step', transitionId: stepB.transitionId },
    };
    const plan = interpretProgram(graph, choiceProg, { signals: { 'viewport.width': 1024 } });
    const receipt = plan.diagnostics.find((d) => d.code === 'choice-selected');
    expect(receipt).toBeDefined();
    expect((receipt!.detail as { branchId: string }).branchId).toBe('branch-0');
  });

  test('cancel-at-0.5 → a DEFINED settled state (the interrupt-from-current point)', () => {
    // seq[A(0..0.25), B(0.25..1)] at global t=0.5: A holds `to`, B mid-flight.
    const plan = interpretProgram(graph, seqProg);
    const sample = sampleProgramWindows(plan.runtime!.windows!, 0.5);
    const opacity = sample.find((s) => s.cssVar === 'opacity')!;
    const x = sample.find((s) => s.cssVar === '--czap-hero-x')!;
    expect(num(opacity.value)).toBe(1); // A complete, holds
    // B local progress at t=0.5: (0.5-0.25)/0.75 = 1/3 → 33.33px (linear).
    expect(num(x.value)).toBeCloseTo(100 / 3, 6);
    // Deterministic — sampling twice gives the identical settled state.
    expect(sampleProgramWindows(plan.runtime!.windows!, 0.5)).toEqual(sample);
  });

  test('replay is idempotent — a duplicate crossing at the same generation is a no-op (guard)', () => {
    const plan = interpretProgram(graph, seqProg);
    const store = StateCellStore.create();
    store.register('prog', [plan.runtime!.fromState, plan.runtime!.toState], { authority: 'synthetic' });
    // First crossing to the terminal state at generation 1.
    const first = store.hydrateDiscrete('prog', plan.runtime!.toState, 1, 'synthetic');
    // Replay the SAME completed crossing at the SAME generation → byte-identical no-op.
    const replay = store.hydrateDiscrete('prog', plan.runtime!.toState, 1, 'synthetic');
    expect(replay.state).toBe(plan.runtime!.toState);
    expect(replay.generation).toBe(first.generation);
    expect(replay).toEqual(first);
  });

  test('reduced-motion → terminal pose: t=1 samples every window `to`, composite toState is last', () => {
    const plan = interpretProgram(graph, seqProg);
    // Terminal state is the LAST step's toPose state.
    expect(plan.runtime!.toState).toBe('after');
    expect(plan.runtime!.fromState).toBe('before');
    // Settling at t=1 pins each property to its window `to` (opacity 1, x 100px).
    const terminal = sampleProgramWindows(plan.runtime!.windows!, 1);
    expect(num(terminal.find((s) => s.cssVar === 'opacity')!.value)).toBe(1);
    expect(num(terminal.find((s) => s.cssVar === '--czap-hero-x')!.value)).toBe(100);
  });
});

describe('TransitionProgram — same-key sequential windows (Codex P2 / Greptile P1 regression)', () => {
  // A seq chain that animates the SAME key across BOTH steps — the case the algebra
  // tests above never hit (they use opacity for A, --czap-hero-x for B). A future
  // window, clamped to its `from` before it starts, must NOT clobber the earlier
  // ACTIVE window on last-window-wins, or an in-progress tween freezes at the next
  // step's start value.
  const rampA = makeStep({ '--czap-hero-x': '0px' }, { '--czap-hero-x': '100px' }, 400);
  const rampB = makeStep({ '--czap-hero-x': '100px' }, { '--czap-hero-x': '200px' }, 400);
  const rampGraph = sealGraph({
    _tag: 'DocumentGraph',
    _version: 1,
    meta: META,
    nodes: [signal, component, entity, ...rampA.nodes, ...rampB.nodes],
    edges: [],
  } as Omit<DocumentGraph, 'id' | 'digest'>);
  const ramp: TransitionProgram = {
    kind: 'seq',
    children: [
      { kind: 'step', transitionId: rampA.transitionId },
      { kind: 'step', transitionId: rampB.transitionId },
    ],
  };

  test('the runtime sampler shows the FIRST leg in progress, not the second leg`s start value', () => {
    const plan = interpretProgram(rampGraph, ramp);
    const windows = plan.runtime!.windows!;
    const x = (t: number): number =>
      num(sampleProgramWindows(windows, t).find((s) => s.cssVar === '--czap-hero-x')!.value);
    // seq windows: rampA [0,0.5], rampB [0.5,1]. Mid the FIRST leg the value is the
    // in-progress 0→100 tween (≈50 at t=0.25) — NOT 100 frozen by rampB.from.
    expect(x(0.25)).toBeCloseTo(50, 6);
    expect(x(0.5)).toBeCloseTo(100, 6); // seam: both legs agree at 100
    expect(x(0.75)).toBeCloseTo(150, 6); // second leg in progress 100→200
    expect(x(1)).toBeCloseTo(200, 6); // terminal
  });

  test('the CSS keyframes seed 0% from the FIRST window and settle 100% at the TERMINAL', () => {
    const plan = interpretProgram(rampGraph, ramp);
    const kf = plan.css!.keyframes;
    expect(kf.map((k) => k.offset)).toEqual([0, 0.5, 1]);
    // 0% is rampA.from (0px) — a not-yet-started rampB must not overwrite it to 100px.
    expect(kf.find((k) => k.offset === 0)!.properties['--czap-hero-x']).toBe('0px');
    expect(kf.find((k) => k.offset === 0.5)!.properties['--czap-hero-x']).toBe('100px');
    // 100% is the program terminal (rampB.to), not the first step`s 100px.
    expect(kf.find((k) => k.offset === 1)!.properties['--czap-hero-x']).toBe('200px');
  });

  test('the flat CSS `properties` fold keeps FIRST `from` (init) but LAST `to` (terminal)', () => {
    const plan = interpretProgram(rampGraph, ramp);
    const tween = plan.css!.properties.find((p) => p.property === '--czap-hero-x')!;
    expect(num(tween.from)).toBe(0); // first occurrence — @property initial-value
    expect(num(tween.to)).toBe(200); // last occurrence — terminal, not the first step`s 100
  });

  test('a fade-in-then-out chain is not masked: opacity rises before it falls', () => {
    // The concrete case Codex flagged: opacity 0→1 then 1→0. Before the fix the
    // future 1→0 window (from=1) clobbered the fade-in throughout its window.
    const fadeIn = makeStep({ opacity: 0 }, { opacity: 1 }, 400);
    const fadeOut = makeStep({ opacity: 1 }, { opacity: 0 }, 400);
    const fadeGraph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta: META,
      nodes: [signal, component, entity, ...fadeIn.nodes, ...fadeOut.nodes],
      edges: [],
    } as Omit<DocumentGraph, 'id' | 'digest'>);
    const fade: TransitionProgram = {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: fadeIn.transitionId },
        { kind: 'step', transitionId: fadeOut.transitionId },
      ],
    };
    const windows = interpretProgram(fadeGraph, fade).runtime!.windows!;
    const op = (t: number): number => num(sampleProgramWindows(windows, t).find((s) => s.cssVar === 'opacity')!.value);
    expect(op(0)).toBeCloseTo(0, 6); // fade-in start (NOT frozen at 1)
    expect(op(0.25)).toBeCloseTo(0.5, 6); // fade-in halfway
    expect(op(0.5)).toBeCloseTo(1, 6); // peak
    expect(op(0.75)).toBeCloseTo(0.5, 6); // fade-out halfway
    expect(op(1)).toBeCloseTo(0, 6); // fade-out complete
  });
});

describe('TransitionProgram — authoring sugar (Reveal.chain / staggerProgram)', () => {
  test('lowerRevealChain builds a seq + trailing choice program that lowers to windows', () => {
    const chain = lowerRevealChain({
      target: 'hero',
      trigger: { type: 'scroll', axis: 'progress' },
      steps: [
        {
          from: { opacity: 0, translateY: '24px' },
          to: { opacity: 1, translateY: '0px' },
          transition: { durationMs: 300, easing: 'linear' },
        },
      ],
      choice: {
        branches: [
          {
            when: { op: 'gte', value: 768 },
            source: 'viewport.width' as never,
            step: {
              from: { color: '#000000' },
              to: { color: '#2dd4bf' },
              transition: { durationMs: 200, easing: 'linear' },
            },
          },
        ],
        otherwise: {
          from: { color: '#000000' },
          to: { color: '#f59e0b' },
          transition: { durationMs: 200, easing: 'linear' },
        },
      },
      policy: { reducedMotion: 'settle', motionTier: 'transitions' },
    });
    expect(chain.program.kind).toBe('seq');
    expect(chain.transitionIds).toHaveLength(3); // 1 step + 2 choice arms

    // Wide → the teal branch runs after the rise; total = 300 + 200.
    const wide = lowerTransitionProgram(chain.graph, chain.program, { signals: { 'viewport.width': 1200 } });
    expect(wide.totalMs).toBe(500);
    expect(wide.selectedBranchIds).toEqual(['branch-0']);
    const plan = interpretProgram(chain.graph, chain.program, { signals: { 'viewport.width': 1200 } });
    // Teal (not amber) at the terminal pose — the otherwise arm never wrote.
    const color = sampleProgramWindows(plan.runtime!.windows!, 1).find((s) => s.cssVar === '--czap-hero-color');
    expect(color).toBeDefined();
  });

  test('a choice branch step carries its delayMs into the lowered timeline (Codex P2)', () => {
    const build = (branchDelayMs?: number, otherwiseDelayMs?: number) =>
      lowerRevealChain({
        target: 'hero',
        trigger: { type: 'scroll', axis: 'progress' },
        steps: [{ from: { opacity: 0 }, to: { opacity: 1 }, transition: { durationMs: 300, easing: 'linear' } }],
        choice: {
          branches: [
            {
              when: { op: 'gte', value: 768 },
              source: 'viewport.width' as never,
              step: {
                from: { color: '#000000' },
                to: { color: '#2dd4bf' },
                transition: { durationMs: 200, easing: 'linear' },
                ...(branchDelayMs !== undefined ? { delayMs: branchDelayMs } : {}),
              },
            },
          ],
          otherwise: {
            from: { color: '#000000' },
            to: { color: '#f59e0b' },
            transition: { durationMs: 200, easing: 'linear' },
            ...(otherwiseDelayMs !== undefined ? { delayMs: otherwiseDelayMs } : {}),
          },
        },
        policy: { reducedMotion: 'settle', motionTier: 'transitions' },
      });

    const wideSignals = { signals: { 'viewport.width': 1200 } };
    const narrowSignals = { signals: { 'viewport.width': 320 } };

    // Selected branch delay lengthens the timeline by EXACTLY the delay (300 rise + 150
    // dead + 200 tween = 650), where the dropped-delay bug produced 500.
    const withDelay = build(150, 90);
    const wide = lowerTransitionProgram(withDelay.graph, withDelay.program, wideSignals);
    expect(wide.selectedBranchIds).toEqual(['branch-0']);
    expect(wide.totalMs).toBe(650);

    // The otherwise arm carries ITS delay too (300 + 90 + 200 = 590).
    const narrow = lowerTransitionProgram(withDelay.graph, withDelay.program, narrowSignals);
    expect(narrow.selectedBranchIds).toEqual(['otherwise']);
    expect(narrow.totalMs).toBe(590);

    // Falsifier: with no branch delay the same chain totals 300 + 200 = 500.
    const noDelay = build();
    expect(lowerTransitionProgram(noDelay.graph, noDelay.program, wideSignals).totalMs).toBe(500);
  });

  test('staggerProgram composes a par program whose child windows carry the stagger delays', () => {
    const intent = Stagger.intent({
      trigger: { type: 'view', range: ['entry 0%', 'cover 50%'] },
      children: [
        { target: 'a', from: { opacity: 0 }, to: { opacity: 1 } },
        { target: 'b', from: { opacity: 0 }, to: { opacity: 1 } },
      ],
      stepMs: 100,
      transition: { durationMs: 300, easing: 'linear' },
      policy: { reducedMotion: 'settle', motionTier: 'transitions' },
    });
    const lowered = lowerStaggerIntent(intent);
    const program = staggerProgram(lowered);
    expect(program.kind).toBe('par');

    const timeline = lowerTransitionProgram(lowered.graph, program);
    // par total == max child total == max(0+300, 100+300) == 400.
    expect(timeline.totalMs).toBe(400);
    // Child a: window [0, 300/400]; child b: staggered [100/400, 400/400].
    expect(timeline.entries[0]!.windowStart).toBe(0);
    expect(timeline.entries[1]!.windowStart).toBeCloseTo(100 / 400, 10);
    expect(timeline.entries[1]!.windowEnd).toBe(1);
  });

  test('interpretProgram REJECTS a multi-target program instead of collapsing to one boundary', () => {
    // A stagger over distinct children (`a`, `b`) is a MULTI-TARGET program. One
    // LoweredMotionPlan drives one host, so interpreting it would silently write every
    // window to the first boundary — reject it loudly instead (Codex P2).
    const intent = Stagger.intent({
      trigger: { type: 'view', range: ['entry 0%', 'cover 50%'] },
      children: [
        { target: 'a', from: { opacity: 0 }, to: { opacity: 1 } },
        { target: 'b', from: { opacity: 0 }, to: { opacity: 1 } },
      ],
      stepMs: 100,
      transition: { durationMs: 300, easing: 'linear' },
      policy: { reducedMotion: 'settle', motionTier: 'transitions' },
    });
    const lowered = lowerStaggerIntent(intent);
    const plan = interpretProgram(lowered.graph, staggerProgram(lowered));

    // No runtime/css plan (nothing collapsed onto boundary `a`); a loud diagnostic instead.
    expect(plan.runtime).toBeUndefined();
    expect(plan.css).toBeUndefined();
    expect(plan.diagnostics.some((d) => d.code === 'multi-target-program')).toBe(true);
  });

  test('interpretProgram accepts a SINGLE-target program (the reveal chain) unchanged', () => {
    // Guard the reject above does not fire for the common single-boundary chain.
    const chain = lowerRevealChain({
      target: 'hero',
      trigger: { type: 'scroll', axis: 'progress' },
      steps: [
        { from: { opacity: 0 }, to: { opacity: 1 }, transition: { durationMs: 200, easing: 'linear' } },
        { from: { translateY: '24px' }, to: { translateY: '0px' }, transition: { durationMs: 200, easing: 'linear' } },
      ],
      policy: { reducedMotion: 'settle', motionTier: 'transitions' },
    });
    const plan = interpretProgram(chain.graph, chain.program);
    expect(plan.runtime).toBeDefined();
    expect(plan.diagnostics.some((d) => d.code === 'multi-target-program')).toBe(false);
  });
});
