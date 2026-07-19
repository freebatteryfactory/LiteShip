// @vitest-environment jsdom
/**
 * Reveal vertical slice — runtime floor via writeContinuousMap (#124).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { Reveal, lowerRevealIntent, interpretTransition, Easing, DEFAULT_MOTION_SPRING } from '@liteship/core';
import { compileReveal } from '@liteship/compiler';
import { writeContinuousMap, loadGraphRuntime, lowerGraph } from '@liteship/astro/runtime';

function heroIntent() {
  return Reveal.intent({
    target: 'hero',
    trigger: { type: 'view', range: ['entry 0%', 'cover 60%'] },
    from: { opacity: 0, translateY: '24px' },
    to: { opacity: 1, translateY: '0px' },
    transition: { durationMs: 420, easing: 'spring' },
    policy: { reducedMotion: 'settle', motionTier: 'transitions' },
  });
}

describe('Reveal end-to-end runtime floor', () => {
  test('graph → interpretTransition → writeContinuousMap leaf writes eased at progress t', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    compileReveal(lowered.graph, lowered.transitionId, intent);

    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    if (!plan.runtime) throw new Error('expected runtime plan');
    // The reveal authored `easing: 'spring'`, so the floor bends raw t through the
    // SAME Easing.spring the CSS linear() compiles from — NOT a linear lerp.
    expect(plan.runtime.easing).toEqual({ kind: 'spring' });

    const el = document.createElement('div');
    el.setAttribute('data-liteship-boundary', 'hero');
    writeContinuousMap(el, plan.runtime, 0.5);

    const eased = Easing.spring(DEFAULT_MOTION_SPRING)(0.5); // the shared-default spring kernel
    expect(Number(el.style.opacity)).toBeCloseTo(eased, 10); // opacity lerps 0→1 → value IS eased
    expect(el.style.getPropertyValue('--liteship-hero-y')).toBe(`${24 - 24 * eased}px`); // 24px → 0px
  });

  test('simulated animation frames dispatch uniform-update without graph mutation', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    if (!plan.runtime) throw new Error('expected runtime plan');

    const el = document.createElement('div');
    const events: CustomEvent[] = [];
    el.addEventListener('liteship:uniform-update', (e) => events.push(e as CustomEvent));

    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      writeContinuousMap(el, plan.runtime, t);
    }

    expect(events).toHaveLength(5);
    expect(events[0]!.detail.css.opacity).toBe('0');
    expect(events[4]!.detail.css.opacity).toBe('1');
    expect(events[4]!.detail.css['--liteship-hero-y']).toBe('0px');
  });

  test('reduced-motion settle endpoint matches runtime t=1 values', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    if (!plan.runtime) throw new Error('expected runtime plan');

    const el = document.createElement('div');
    writeContinuousMap(el, plan.runtime, 1);

    expect(el.style.opacity).toBe('1');
    expect(el.style.getPropertyValue('--liteship-hero-y')).toBe('0px');
  });
});

describe('Reveal compile → runtime contract', () => {
  test('compiled graph re-links projection edges so loadGraphRuntime resolves css channel', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const compiled = compileReveal(lowered.graph, lowered.transitionId, intent);

    const entity = compiled.graph.nodes.find((n) => n.id === lowered.entityId);
    expect(entity?.family).toBe('entity');

    const el = document.createElement('div');
    document.body.appendChild(el);

    const bindings = lowerGraph(compiled.graph);
    expect(bindings.some((binding) => binding.entityId === lowered.entityId && binding.targets.includes('css'))).toBe(
      true,
    );

    const handle = loadGraphRuntime(compiled.graph, (id) => (id === lowered.entityId ? el : null));
    expect(handle).not.toBeNull();
    handle?.release();
  });

  test('compiled CSS selector matches runtime boundary attr', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const compiled = compileReveal(lowered.graph, lowered.transitionId, intent);
    expect(compiled.css.startingStyle).toContain('[data-liteship-boundary="hero"]');
    expect(compiled.motion.target).toBe('hero');
  });
});
