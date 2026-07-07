// @vitest-environment jsdom
/**
 * Reveal vertical slice — runtime floor via writeContinuousMap (#124).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { Reveal, lowerRevealIntent, interpretTransition } from '@czap/core';
import { compileReveal } from '@czap/compiler';
import { writeContinuousMap, loadGraphRuntime, lowerGraph } from '@czap/astro/runtime';

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
  test('graph → interpretTransition → writeContinuousMap leaf writes at progress t', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    compileReveal(lowered.graph, lowered.transitionId, intent);

    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    if (!plan.runtime) throw new Error('expected runtime plan');

    const el = document.createElement('div');
    el.setAttribute('data-czap-boundary', 'hero');
    writeContinuousMap(el, plan.runtime, 0.5);

    expect(el.style.opacity).toBe('0.5');
    expect(el.style.getPropertyValue('--czap-hero-y')).toBe('12px');
  });

  test('simulated animation frames dispatch uniform-update without graph mutation', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    if (!plan.runtime) throw new Error('expected runtime plan');

    const el = document.createElement('div');
    const events: CustomEvent[] = [];
    el.addEventListener('czap:uniform-update', (e) => events.push(e as CustomEvent));

    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      writeContinuousMap(el, plan.runtime, t);
    }

    expect(events).toHaveLength(5);
    expect(events[0]!.detail.css.opacity).toBe('0');
    expect(events[4]!.detail.css.opacity).toBe('1');
    expect(events[4]!.detail.css['--czap-hero-y']).toBe('0px');
  });

  test('reduced-motion settle endpoint matches runtime t=1 values', () => {
    const intent = heroIntent();
    const lowered = lowerRevealIntent(intent);
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    if (!plan.runtime) throw new Error('expected runtime plan');

    const el = document.createElement('div');
    writeContinuousMap(el, plan.runtime, 1);

    expect(el.style.opacity).toBe('1');
    expect(el.style.getPropertyValue('--czap-hero-y')).toBe('0px');
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
    expect(compiled.css.startingStyle).toContain('[data-czap-boundary="hero"]');
    expect(compiled.motion.target).toBe('hero');
  });
});
