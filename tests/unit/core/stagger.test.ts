/**
 * Stagger intent — graph lowering, CSS delays, #132 field reads (#124).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import {
  Stagger,
  lowerStaggerIntent,
  interpretTransition,
  resolveStaggerInitialState,
} from '@czap/core';
import { compileStagger } from '@czap/compiler';

function listIntent(childCount = 3) {
  return Stagger.intent({
    trigger: { type: 'view', range: ['entry 0%', 'cover 50%'] },
    children: Array.from({ length: childCount }, (_, i) => ({
      target: `item-${i}`,
      from: { opacity: 0, translateY: '16px' },
      to: { opacity: 1, translateY: '0px' },
    })),
    stepMs: 80,
    transition: { durationMs: 300, easing: 'ease' },
    policy: { reducedMotion: 'settle', motionTier: 'transitions' },
  });
}

describe('Stagger.intent → graph', () => {
  test('lowers N parallel TransitionNodes sharing one signal', () => {
    const lowered = lowerStaggerIntent(listIntent(3));
    const transitions = lowered.graph.nodes.filter((n) => n.family === 'transition');
    expect(transitions).toHaveLength(3);
    for (const node of transitions) {
      expect(node.family === 'transition' && node.routing).toBe('par');
      expect(node.family === 'transition' && node.durationMs).toBe(300);
    }

    const signals = lowered.graph.nodes.filter((n) => n.family === 'signal');
    expect(signals).toHaveLength(1);
    expect(lowered.items).toHaveLength(3);
    expect(lowered.items.map((i) => i.delayMs)).toEqual([0, 80, 160]);
  });

  test('adversarial: empty children throws', () => {
    const intent = Stagger.intent({
      trigger: { type: 'scroll', axis: 'progress' },
      children: [],
      stepMs: 50,
      transition: { durationMs: 200 },
      policy: { reducedMotion: 'none', motionTier: 'transitions' },
    });
    expect(() => lowerStaggerIntent(intent)).toThrow();
    try {
      lowerStaggerIntent(intent);
      expect.unreachable();
    } catch (e) {
      expect((e as { _tag?: string })._tag).toBe('ValidationError');
    }
  });

  test('adversarial: negative stepMs throws', () => {
    const intent = Stagger.intent({
      trigger: { type: 'scroll' },
      children: [{ target: 'a', from: { opacity: 0 }, to: { opacity: 1 } }],
      stepMs: -1,
      transition: { durationMs: 200 },
      policy: { reducedMotion: 'none', motionTier: 'none' },
    });
    expect(() => lowerStaggerIntent(intent)).toThrow();
    try {
      lowerStaggerIntent(intent);
      expect.unreachable();
    } catch (e) {
      expect((e as { _tag?: string })._tag).toBe('ValidationError');
    }
  });

  test('resolveStaggerInitialState honors reducedMotion settle (#124)', () => {
    expect(resolveStaggerInitialState(listIntent(), { prefersReducedMotion: true })).toBe('after');
    expect(resolveStaggerInitialState(listIntent(), { prefersReducedMotion: false })).toBe('before');
  });
});

describe('Stagger graph → CSS', () => {
  test('compileStagger emits per-child animation-delay in view-timeline path', () => {
    const lowered = lowerStaggerIntent(listIntent(2));
    const compiled = compileStagger(lowered);

    expect(compiled.items).toHaveLength(2);
    expect(compiled.items[0]!.css.scrollTimeline).toContain('animation-timeline: view()');
    expect(compiled.items[1]!.css.scrollTimeline).toContain('animation-delay: 80ms');
    expect(compiled.items[1]!.css.transition).toContain('300ms ease 80ms');
    expect(compiled.raw).toContain('[data-czap-boundary="item-0"]');
    expect(compiled.raw).toContain('[data-czap-boundary="item-1"]');
  });

  test('compileStagger with prefersReducedMotion settle zeros delays (#124)', () => {
    const lowered = lowerStaggerIntent(listIntent(2));
    const compiled = compileStagger(lowered, { prefersReducedMotion: true });
    expect(compiled.items.every((i) => i.delayMs === 0)).toBe(true);
    expect(compiled.raw).toContain('prefers-reduced-motion: reduce');
  });
});

describe('Stagger #132 gate — TransitionNode fields read', () => {
  test('interpretTransition reads routing and durationMs for every stagger child', () => {
    const lowered = lowerStaggerIntent(listIntent(3));
    for (const item of lowered.items) {
      const plan = interpretTransition(lowered.graph, item.transitionId);
      expect(plan.css?.routing).toBe('par');
      expect(plan.css?.durationMs).toBe(300);
      expect(plan.runtime?.routing).toBe('par');
      expect(plan.runtime?.durationMs).toBe(300);
      expect(plan.diagnostics).toHaveLength(0);
    }
  });
});
