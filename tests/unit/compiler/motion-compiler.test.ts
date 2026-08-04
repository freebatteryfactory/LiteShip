/**
 * MotionCompiler — native-CSS motion backend (#130 child 4).
 *
 * @module
 */

import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import {
  sealNode,
  sealGraph,
  interpretTransition,
  interpretProgram,
  type CellMeta,
  type ContentAddress,
  type DocumentGraph,
  type DocumentGraphNode,
  type DocumentGraphEdge,
  type PoseNode,
  type TransitionNode,
  type EntityNode,
  type ComponentNode,
  type SignalNode,
  type CssMotionPlan,
  type RuntimeEasing,
} from '@liteship/core';
import { MotionCompiler, dispatch } from '@liteship/compiler';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

function graph(nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraph {
  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);
}

function revealCssPlan(target = 'hero'): CssMotionPlan {
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
    name: target,
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

  const fromPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'before',
    bindings: { opacity: 0, '--liteship-hero-y': '24px' },
  } as unknown as PoseNode);

  const toPose = sealNode({
    _tag: 'DocGraphPoseNode',
    _version: 1,
    family: 'pose',
    id: '',
    meta: META,
    entityRef: entity.id,
    state: 'after',
    bindings: { opacity: 1, '--liteship-hero-y': '0px' },
  } as unknown as PoseNode);

  const transition = sealNode({
    _tag: 'DocGraphTransitionNode',
    _version: 1,
    family: 'transition',
    id: '',
    meta: META,
    fromPose: fromPose.id,
    toPose: toPose.id,
    routing: 'seq',
    durationMs: 420,
  } as unknown as TransitionNode);

  const g = graph(
    [signal, component, entity, fromPose, toPose, transition],
    [{ from: signal.id, to: component.id, type: 'seq' }],
  );

  const plan = interpretTransition(g, transition.id);
  if (!plan.css) throw new Error('expected css plan');
  return plan.css;
}

describe('MotionCompiler', () => {
  test('emits @property, @keyframes, @starting-style, and state-keyed transition', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({ plan });

    expect(result.propertyRegistrations).toContain('@property --liteship-hero-y');
    expect(result.propertyRegistrations).toContain('syntax: "<length>"');
    expect(result.keyframes).toContain('@keyframes liteship-motion-hero-before-after');
    expect(result.keyframes).toContain('0% {');
    expect(result.keyframes).toContain('opacity: 0');
    expect(result.keyframes).toContain('100% {');
    expect(result.keyframes).toContain('opacity: 1');
    expect(result.startingStyle).toContain('@starting-style');
    expect(result.startingStyle).toContain('[data-liteship-boundary="hero"]');
    expect(result.transition).toContain('[data-liteship-state="after"]');
    expect(result.transition).toContain('opacity: 1');
    expect(result.transition).toContain('420ms');
    expect(result.raw).toContain(result.keyframes);
  });

  test('spring easing uses springToLinearCSS linear()', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      easing: 'spring',
      spring: { stiffness: 200, damping: 15 },
    });

    expect(result.transition).toMatch(/linear\(/);
  });

  test('@supports-gated animation-timeline when viewTimeline is provided', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });

    expect(result.scrollTimeline).toContain('@supports (animation-timeline: view())');
    expect(result.scrollTimeline).toContain('animation-timeline: view()');
    expect(result.scrollTimeline).toContain('animation-range: entry 0% cover 60%');
    expect(result.scrollTimeline).toContain('@supports not (animation-timeline: view())');
  });

  test('view-timeline fallback emits per-property transition durations', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });

    expect(result.scrollTimeline).toContain('opacity 420ms ease');
    expect(result.scrollTimeline).toContain('--liteship-hero-y 420ms ease');
    expect(result.scrollTimeline).not.toMatch(/opacity, --liteship-hero-y 420ms/);
  });

  test('view-timeline supported path declares explicit animation-duration (not iteration-count shorthand)', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      easing: 'spring',
      spring: { stiffness: 200, damping: 15 },
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });

    const supportedBlock = result.scrollTimeline.split('@supports not')[0] ?? '';
    expect(supportedBlock).toContain('animation-duration: auto');
    expect(supportedBlock).toContain('animation-timing-function:');
    expect(supportedBlock).not.toMatch(/animation:\s*liteship-motion/);
    expect(supportedBlock).toMatch(/animation-timing-function:\s*linear\(/);
  });

  test('percent endpoints register @property with length-percentage syntax', () => {
    const base = revealCssPlan();
    const plan: CssMotionPlan = {
      ...base,
      properties: [
        {
          property: '--liteship-hero-y',
          from: { k: 'length', v: 0, unit: '%' },
          to: { k: 'length', v: 100, unit: '%' },
        },
      ],
    };
    const result = MotionCompiler.compile({ plan });
    expect(result.propertyRegistrations).toContain('syntax: "<length-percentage>"');
    expect(result.propertyRegistrations).not.toMatch(/syntax: "<length>"/);
  });

  test('from-state persists in base rule outside @starting-style only', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({ plan });
    expect(result.raw).toMatch(/\[data-liteship-boundary="hero"\] \{[^}]*opacity: 0/);
    expect(result.startingStyle).toContain('opacity: 0');
    expect(result.transition).toContain('[data-liteship-state="after"]');
    expect(result.transition).toContain('opacity: 1');
  });

  test('view-timeline block includes animation-fill-mode: both', () => {
    const plan = revealCssPlan();
    const result = MotionCompiler.compile({
      plan,
      viewTimeline: { range: ['entry 0%', 'cover 60%'] },
    });
    const supportedBlock = result.scrollTimeline.split('@supports not')[0] ?? '';
    expect(supportedBlock).toContain('animation-fill-mode: both');
  });

  test('distinct targets do not collide on @keyframes names', () => {
    const heroPlan = revealCssPlan();
    const footerPlan = {
      ...heroPlan,
      target: 'footer',
      selector: '.authored-footer-motion-target',
    };

    const hero = MotionCompiler.compile({ plan: heroPlan });
    const footer = MotionCompiler.compile({ plan: footerPlan });

    expect(hero.keyframes).toContain('@keyframes liteship-motion-hero-before-after');
    expect(footer.keyframes).toContain('@keyframes liteship-motion-footer-before-after');
    expect(hero.keyframes).not.toContain('@keyframes liteship-motion-footer-before-after');
  });

  /**
   * The `@keyframes` name is `cssIdentFor('liteship-motion-', [target, fromState,
   * toState])` with no `alwaysAddressed`, so the ALL-LOSSLESS path — every part a
   * legal CSS ident already — ships the readable join with NO content address.
   * A `-` is a legal ident character AND the join separator, so that path was not
   * injective: `['a-b','c','d']` and `['a','b-c','d']` are both entirely lossless
   * and both spell `liteship-motion-a-b-c-d`. Two different authored motions then
   * emit the same `@keyframes` block name and the second silently overrides the
   * first in the cascade.
   *
   * The existing injectivity property (view-transition-compile) only reaches the
   * LOSSY case (its counterexample `ba/b` vs `ba-b`) and only the `alwaysAddressed`
   * path. This one is generative over the all-lossless multi-part case on the live
   * surface.
   */
  /**
   * Every way of cutting `length` tokens into three non-empty consecutive runs.
   * Each cut yields a DIFFERENT authored identity whose parts nevertheless join
   * to the SAME `-` separated readable spelling, which is exactly the hazard.
   */
  const threeWayCuts = (length: number): readonly (readonly [number, number])[] => {
    const cuts: (readonly [number, number])[] = [];
    for (let first = 1; first < length; first += 1) {
      for (let second = first + 1; second < length; second += 1) cuts.push([first, second]);
    }
    return cuts;
  };

  const identityAt = (tokens: readonly string[], cut: readonly [number, number]): readonly [string, string, string] => [
    tokens.slice(0, cut[0]).join('-'),
    tokens.slice(cut[0], cut[1]).join('-'),
    tokens.slice(cut[1]).join('-'),
  ];

  /** Two DISTINCT three-part identities that share one readable slug join. */
  const sameJoinIdentities = fc
    .array(fc.constantFrom('a', 'b', 'c'), { minLength: 4, maxLength: 6 })
    .chain((tokens) => {
      const cuts = threeWayCuts(tokens.length);
      return fc
        .uniqueArray(fc.nat({ max: cuts.length - 1 }), { minLength: 2, maxLength: 2 })
        .map(([left, right]) => [identityAt(tokens, cuts[left]!), identityAt(tokens, cuts[right]!)] as const);
    });

  const keyframeIdentOf = (target: string, fromState: string, toState: string): string => {
    const plan = { ...revealCssPlan(target), target, fromState, toState };
    const ident = MotionCompiler.compile({ plan }).keyframes.match(/^@keyframes\s+([^\s{]+)\s+\{/u)?.[1];
    expect(ident, 'every compiled plan must emit a @keyframes prelude').toBeTypeOf('string');
    return ident!;
  };

  test('the anchor pair: two all-lossless identities whose slug join coincides stay distinct', () => {
    const left = keyframeIdentOf('a-b', 'c', 'd');
    const right = keyframeIdentOf('a', 'b-c', 'd');
    // Both readable spellings are `liteship-motion-a-b-c-d`; the address is what
    // keeps the two authored identities apart.
    expect(left).not.toBe(right);
    expect(left.startsWith('liteship-motion-a-b-c-d')).toBe(true);
    expect(right.startsWith('liteship-motion-a-b-c-d')).toBe(true);
    // The established readable spelling of a decodable identity is unchanged —
    // this is not "address everything".
    expect(keyframeIdentOf('hero', 'before', 'after')).toBe('liteship-motion-hero-before-after');
  });

  test('all-lossless identities that share a slug join never collide on the @keyframes name', () => {
    fc.assert(
      fc.property(sameJoinIdentities, ([left, right]) => {
        // ANTI-VACUITY: the generator must actually produce the hazard — two
        // different authored identities, every part already a legal CSS ident
        // (so the lossless shortcut is the live path), spelling one readable
        // join. Without these the injectivity assertion below could pass on
        // inputs that never exercised the defect.
        expect(left).not.toEqual(right);
        for (const part of [...left, ...right]) expect(part).toMatch(/^[A-Za-z0-9_][A-Za-z0-9_-]*$/u);
        expect(left.join('-')).toBe(right.join('-'));

        expect(keyframeIdentOf(...left)).not.toBe(keyframeIdentOf(...right));
      }),
      { seed: 0xc55117d, numRuns: 200 },
    );
  });

  test('a hostile boundary name cannot escape its selector or terminate the keyframes prelude', () => {
    const boundary = 'a"b}';
    const plan = revealCssPlan(boundary);
    const result = MotionCompiler.compile({ plan });
    const keyframeIdent = result.keyframes.match(/^@keyframes\s+([^\s{]+)\s+\{/u)?.[1];

    expect(plan.target).toBe(boundary);
    expect(plan.selector).toBe('[data-liteship-boundary="a\\"b}"]');
    expect(keyframeIdent).toMatch(/^liteship-motion-[A-Za-z0-9_-]+$/u);
    expect(keyframeIdent).not.toContain('}');
    expect(result.keyframes.match(/\{/gu)).toHaveLength(3);
    expect(result.keyframes.match(/\}/gu)).toHaveLength(3);
  });

  test('a motion plan with no structured target identity is refused, not recovered from its selector', () => {
    const malformed = { ...revealCssPlan() };
    Reflect.deleteProperty(malformed, 'target');

    expect(() => MotionCompiler.compile({ plan: malformed })).toThrow(
      /cssIdentFor: identity parts must be a non-empty string array/u,
    );
  });
});

/**
 * The backend needs NO change for the multi-transition algebra (#141): once
 * `interpretProgram` feeds it RICHER multi-offset keyframes, `MotionCompiler.compile`
 * emits them verbatim through the same `emitKeyframeStep` (`step.offset`) path.
 */
describe('MotionCompiler — composed TransitionProgram keyframes (#141, backend unchanged)', () => {
  function twoStepGraph(
    easingA?: RuntimeEasing,
    easingB?: RuntimeEasing,
  ): { graph: DocumentGraph; a: ContentAddress; b: ContentAddress } {
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
    const mkStep = (
      from: Record<string, number | string>,
      to: Record<string, number | string>,
      durationMs: number,
      easing?: RuntimeEasing,
    ): TransitionNode & { fp: PoseNode; tp: PoseNode } => {
      const fp = sealNode({
        _tag: 'DocGraphPoseNode',
        _version: 1,
        family: 'pose',
        id: '',
        meta: META,
        entityRef: entity.id,
        state: 'before',
        bindings: from,
      } as unknown as PoseNode);
      const tp = sealNode({
        _tag: 'DocGraphPoseNode',
        _version: 1,
        family: 'pose',
        id: '',
        meta: META,
        entityRef: entity.id,
        state: 'after',
        bindings: to,
      } as unknown as PoseNode);
      const tr = sealNode({
        _tag: 'DocGraphTransitionNode',
        _version: 1,
        family: 'transition',
        id: '',
        meta: META,
        fromPose: fp.id,
        toPose: tp.id,
        routing: 'seq',
        durationMs,
        ...(easing ? { easing } : {}),
      } as unknown as TransitionNode);
      return Object.assign(tr, { fp, tp });
    };
    const a = mkStep({ opacity: 0 }, { opacity: 1 }, 200, easingA);
    const b = mkStep({ '--liteship-hero-x': '0px' }, { '--liteship-hero-x': '100px' }, 600, easingB);
    const g = graph(
      [signal, component, entity, a.fp, a.tp, a, b.fp, b.tp, b],
      [{ from: signal.id, to: component.id, type: 'seq' }],
    );
    return { graph: g, a: a.id, b: b.id };
  }

  test('a seq program compiles to multi-offset @keyframes (0% / 25% / 100%)', () => {
    const { graph: g, a, b } = twoStepGraph();
    const plan = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: plan.css! });
    // Three stops, not the two-endpoint collapse — the seq seam is a real 25% stop.
    expect(result.keyframes).toContain('  0% {');
    expect(result.keyframes).toContain('  25% {');
    expect(result.keyframes).toContain('  100% {');
    // At the 25% seam: opacity fully 1 (A done), x still 0px (B not started).
    const seam = result.keyframes.slice(result.keyframes.indexOf('  25% {'));
    expect(seam).toContain('opacity: 1;');
    expect(seam).toContain('--liteship-hero-x: 0px;');
  });

  test('a par program compiles to distinct offsets from seq (max vs Σ duration)', () => {
    const { graph: g, a, b } = twoStepGraph();
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: par.css! });
    // par total = max(200,600)=600 → A's window ends at 200/600 = 1/3, emitted as the EXACT
    // fractional 33.3333% (not integer-rounded 33%, which would diverge from the JS/stage/worker
    // samplers that read the exact offset).
    expect(result.keyframes).toContain('  33.3333% {');
    expect(result.keyframes).not.toContain('  25% {');
  });

  test('par transition fallback uses PER-PROPERTY durations — a short child finishes early', () => {
    // Greptile P1: opacity completes at 200/600 of the composed 600ms, so the transition
    // fallback must animate it for 200ms — not the composed total for every property,
    // which would diverge from the keyframe / JS-floor path (cross-target parity).
    const { graph: g, a, b } = twoStepGraph();
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: par.css! });
    expect(result.transition).toContain('opacity 200ms ease');
    expect(result.transition).toContain('--liteship-hero-x 600ms ease');
    // The bug animated opacity for the full composed duration.
    expect(result.transition).not.toContain('opacity 600ms');
  });

  test('a property that re-reaches its final value late keeps the fallback open to the end', () => {
    // Non-monotonic: opacity hits its final 1 at 25%, LEAVES to 0.5, then RETURNS to 1
    // at 100%. The fallback must animate the FULL 1000ms — a first-final-stop scan would
    // finish and hold at 250ms while the keyframe / JS paths keep going (Greptile P1).
    const plan: CssMotionPlan = {
      ...revealCssPlan(),
      properties: [{ property: 'opacity', from: { k: 'opacity', v: 0 }, to: { k: 'opacity', v: 1 } }],
      transitionProperty: 'opacity',
      durationMs: 1000,
      keyframes: [
        { offset: 0, properties: { opacity: '0' } },
        { offset: 0.25, properties: { opacity: '1' } },
        { offset: 0.5, properties: { opacity: '0.5' } },
        { offset: 1, properties: { opacity: '1' } },
      ],
    };
    const result = MotionCompiler.compile({ plan });
    expect(result.transition).toContain('opacity 1000ms ease');
    expect(result.transition).not.toContain('opacity 250ms');
  });

  test('returning motion emits an explicit monotonic-only fallback receipt while keyframes retain the arc', () => {
    const plan: CssMotionPlan = {
      ...revealCssPlan(),
      properties: [{ property: 'opacity', from: { k: 'opacity', v: 0 }, to: { k: 'opacity', v: 0 } }],
      transitionProperty: 'opacity',
      durationMs: 1000,
      keyframes: [
        { offset: 0, properties: { opacity: '0' } },
        { offset: 0.5, properties: { opacity: '1' } },
        { offset: 1, properties: { opacity: '0' } },
      ],
    };

    const result = MotionCompiler.compile({ plan });
    expect(result.keyframes).toContain('  50% {\n    opacity: 1;');
    expect(result.transition).toContain('opacity: 0;');
    expect(result.support).toEqual({
      keyframes: { fidelity: 'faithful' },
      transitionFallback: {
        contract: 'single-segment-monotonic-only',
        fidelity: 'monotonic-endpoint-only',
        approximatedProperties: ['opacity'],
        returningProperties: ['opacity'],
      },
    });
    expect(Object.isFrozen(result.support)).toBe(true);
    expect(Object.isFrozen(result.support.transitionFallback.returningProperties)).toBe(true);
  });

  test('single-segment motion is faithfully represented by the transition fallback', () => {
    expect(MotionCompiler.compile({ plan: revealCssPlan() }).support).toEqual({
      keyframes: { fidelity: 'faithful' },
      transitionFallback: {
        contract: 'single-segment-monotonic-only',
        fidelity: 'faithful-single-segment',
        approximatedProperties: [],
        returningProperties: [],
      },
    });
  });

  test('single-segment fallback emits the authored non-default segment easing', () => {
    const plan: CssMotionPlan = {
      ...revealCssPlan(),
      keyframes: [
        {
          offset: 0,
          properties: { opacity: '0' },
          easing: { kind: 'spring', spring: { stiffness: 210, damping: 18 } },
        },
        { offset: 1, properties: { opacity: '1' } },
      ],
    };
    const result = MotionCompiler.compile({ plan });
    expect(result.transition).toContain('opacity 420ms linear(');
    expect(result.transition).not.toContain('opacity 420ms ease');
    expect(result.support.transitionFallback.fidelity).toBe('faithful-single-segment');
  });

  test('seq transition fallback carries per-property delay — a later step starts at its seam', () => {
    // seq total = 200+600 = 800ms. Step A (opacity) owns [0, 0.25]; step B (x) owns
    // [0.25, 1] → duration 600ms after a 200ms delay, so the fallback holds x until B
    // opens, mirroring the seq seam the keyframes encode at 25%.
    const { graph: g, a, b } = twoStepGraph();
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const result = MotionCompiler.compile({ plan: seq.css! });
    expect(result.transition).toContain('opacity 200ms ease');
    expect(result.transition).toContain('--liteship-hero-x 600ms ease 200ms');
  });

  test('a UNIFORM DEFAULT-ease seq carries NO per-keyframe animation-timing-function (byte-identical keyframes)', () => {
    // Both steps default to `ease`, which is exactly the compiler's animation-level default —
    // per-keyframe timing functions would be redundant churn. None must be emitted.
    const { graph: g, a, b } = twoStepGraph();
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    expect(seq.css!.keyframes.every((k) => k.easing === undefined)).toBe(true);
    expect(MotionCompiler.compile({ plan: seq.css! }).keyframes).not.toContain('animation-timing-function');
  });

  test('a UNIFORM NON-DEFAULT easing seq still carries the curve on every segment (Codex P2)', () => {
    // Every step springs (one shared, non-default curve). `CssMotionPlan` has no plan-level
    // easing and the compiler defaults an omitted curve to `ease`, so without per-keyframe easing
    // the native path would sample `ease` while the runtime/stage/worker floors use the spring.
    // The uniform curve must be carried even though the windows do not DIFFER.
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, spring);
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    expect(seq.css!.keyframes.some((k) => k.easing?.kind === 'spring')).toBe(true);
    expect(MotionCompiler.compile({ plan: seq.css! }).keyframes).toContain('animation-timing-function: linear(');
  });

  test('a MIXED-easing seq carries each segment its own animation-timing-function (Codex P2 parity)', () => {
    // Step A springs, step B eases. Native `animation-timeline` browsers must sample each
    // segment with its OWN curve — matching the JS/stage/worker per-window floors — instead
    // of one animation-level curve for the whole plan. The seam stop (25%) begins B's `ease`
    // segment; the 0% stop begins A's spring segment (a `linear(...)` sampled from the spring).
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, { kind: 'ease' });
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    // The seam is a real 25% stop (200 of 800ms); A owns [0,0.25], B owns [0.25,1].
    const startStop = seq.css!.keyframes.find((k) => k.offset === 0);
    const seamStop = seq.css!.keyframes.find((k) => k.offset === 0.25);
    expect(startStop?.easing).toEqual(spring);
    expect(seamStop?.easing).toEqual({ kind: 'ease' });

    const result = MotionCompiler.compile({ plan: seq.css! });
    // Emitted: the spring compiles to a `linear()` sampling; B's segment is plain `ease`.
    expect(result.keyframes).toContain('animation-timing-function: linear(');
    expect(result.keyframes).toMatch(/25% \{[^}]*animation-timing-function: ease;/s);
  });

  test('fractional keyframe offsets are preserved, not rounded to integer percent (Codex P2 parity)', () => {
    // Composed programs (delays, stagger, uneven step durations) produce non-round offsets.
    // Integer rounding would collapse a 1/3 seam onto 33% and a 0.1% seam onto 0%, so native
    // @keyframes would diverge from the exact offsets the JS/stage/worker samplers read.
    const base = revealCssPlan();
    const plan: CssMotionPlan = {
      ...base,
      keyframes: [
        { offset: 0, properties: { opacity: '0' } },
        { offset: 0.001, properties: { opacity: '0.01' } },
        { offset: 1 / 3, properties: { opacity: '0.5' } },
        { offset: 1, properties: { opacity: '1' } },
      ],
    };
    const out = MotionCompiler.compile({ plan });
    expect(out.keyframes).toContain('0.1% {');
    expect(out.keyframes).toContain('33.3333% {');
    expect(out.keyframes).toContain('100% {');
    // The 0.1% seam must NOT have collapsed onto a duplicate 0% stop.
    expect(out.keyframes).not.toContain('0.001');
  });

  test('a PAR of differently-eased children lowers to per-window runtime curves — no approximation diagnostic (#148)', () => {
    // Overlapping windows [0,0.33] (spring) and [0,1] (ease) both cover the [0,0.33]
    // segment with DIFFERENT easing; one `animation-timing-function` cannot serve both.
    // The Wave-4 contract renders that composed case on the per-window RUNTIME floor
    // (each `RuntimeWriteWindow.easing` sampled exactly), reserving the native single
    // `@keyframes` leg for single/uniform-easing programs — so the old
    // `mixed-easing-overlap-approximated` diagnostic is RETIRED (it flagged a native path
    // composed programs never take). Pin: no diagnostic, and the runtime windows carry
    // genuinely mixed, per-child easing.
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, { kind: 'ease' });
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    expect(par.diagnostics.some((d) => d.code === 'mixed-easing-overlap-approximated')).toBe(false);
    const kinds = (par.runtime?.windows ?? []).map((w) => w.easing.kind);
    expect(kinds).toContain('spring');
    expect(kinds).toContain('ease');
    expect(new Set(kinds).size).toBeGreaterThan(1);
  });

  // ── #148 Option A: native-timeline ownership eligibility ─────────────────────
  // The LOWERER decides eligibility (it alone sees the overlapping windows + curves) and
  // records it on the plan; the compiler READS that DATA to decide whether to emit the
  // native `animation-name`/`animation-timeline` ownership block — it never guesses from
  // the (ambiguous) keyframe stops. A mixed-easing overlapping `par` is DENIED ownership so
  // the per-window runtime floor stays the faithful renderer.
  const SCROLL: { readonly range: readonly [string, string] } = { range: ['0%', '100%'] };

  test('the lowerer marks a mixed-easing overlapping par NOT native-eligible', () => {
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, { kind: 'ease' });
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    expect(par.css!.nativeTimeline).toEqual({ eligible: false, reason: 'mixed-easing-overlap' });
  });

  test('the lowerer keeps a UNIFORM-easing seq and a single transition native-eligible', () => {
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, spring);
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    expect(seq.css!.nativeTimeline).toEqual({ eligible: true });
    expect(revealCssPlan().nativeTimeline).toEqual({ eligible: true });
  });

  test('a mixed-easing par compiled with a scroll timeline emits NO native ownership block (#148)', () => {
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, { kind: 'ease' });
    const par = interpretProgram(g, {
      kind: 'par',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const out = MotionCompiler.compile({ plan: par.css!, scrollTimeline: SCROLL });
    expect(out.support.keyframes).toEqual({
      fidelity: 'runtime-floor-required',
      reason: 'mixed-easing-overlap',
    });
    expect(out.support.transitionFallback).toMatchObject({
      fidelity: 'monotonic-endpoint-only',
      approximatedProperties: par.css!.transitionProperty.split(',').map((property) => property.trim()),
    });
    // No native ownership: no `animation-name` binding and no `@supports (animation-timeline)`
    // OWNERSHIP block (distinct from the `@supports not (...)` fallback) — so getComputedStyle
    // carries no liteship-motion name.
    expect(out.scrollTimeline).not.toContain('animation-name: liteship-motion-');
    expect(out.scrollTimeline).not.toContain('animation-timeline: scroll();');
    expect(out.scrollTimeline).not.toContain('@supports (animation-timeline: scroll())');
    // The no-support transition fallback still ships (graceful degradation for JS-less clients).
    expect(out.scrollTimeline).toContain('@supports not (animation-timeline: scroll())');
    // Same denial under a view timeline.
    const view = MotionCompiler.compile({ plan: par.css!, viewTimeline: { range: ['entry 0%', 'cover 100%'] } });
    expect(view.scrollTimeline).not.toContain('animation-name: liteship-motion-');
    expect(view.scrollTimeline).not.toContain('@supports (animation-timeline: view())');
    expect(view.scrollTimeline).toContain('@supports not (animation-timeline: view())');
  });

  test('a UNIFORM-easing composed program and a single transition STILL own the native timeline', () => {
    const spring: RuntimeEasing = { kind: 'spring', spring: { stiffness: 210, damping: 18 } };
    const { graph: g, a, b } = twoStepGraph(spring, spring);
    const seq = interpretProgram(g, {
      kind: 'seq',
      children: [
        { kind: 'step', transitionId: a },
        { kind: 'step', transitionId: b },
      ],
    });
    const uniform = MotionCompiler.compile({ plan: seq.css!, scrollTimeline: SCROLL });
    expect(uniform.support.keyframes).toEqual({ fidelity: 'faithful' });
    expect(uniform.scrollTimeline).toContain('@supports (animation-timeline: scroll())');
    expect(uniform.scrollTimeline).toContain('animation-name: liteship-motion-');
    expect(uniform.scrollTimeline).toContain('animation-timeline: scroll()');

    // A single transition is unchanged (byte-identical native ownership path).
    const single = MotionCompiler.compile({ plan: revealCssPlan(), scrollTimeline: SCROLL });
    expect(single.scrollTimeline).toContain('@supports (animation-timeline: scroll())');
    expect(single.scrollTimeline).toContain('animation-name: liteship-motion-hero-before-after');
  });
});

describe('dispatch() MotionCompiler arm', () => {
  test('MotionCompiler def returns { target: "motion" }', () => {
    const plan = revealCssPlan();
    const result = dispatch({ _tag: 'MotionCompiler', input: { plan } });
    expect(result.target).toBe('motion');
    if (result.target === 'motion') {
      expect(result.result.keyframes).toContain('@keyframes');
    }
  });
});
