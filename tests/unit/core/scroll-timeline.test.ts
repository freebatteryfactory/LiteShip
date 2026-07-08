/**
 * Scroll-timeline intent — standalone scroll-driven motion (#126).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import {
  ScrollTimeline,
  lowerScrollTimelineIntent,
  interpretTransition,
  resolveScrollTimelineInitialState,
} from '@czap/core';
import { compileScrollTimeline } from '@czap/compiler';

function heroScrollIntent() {
  return ScrollTimeline.intent({
    target: 'section',
    axis: 'block',
    range: ['0%', '100%'],
    from: { opacity: 0, translateY: '40px' },
    to: { opacity: 1, translateY: '0px' },
    transition: { durationMs: 500, easing: 'ease' },
    policy: { reducedMotion: 'settle', motionTier: 'animations' },
  });
}

describe('ScrollTimeline.intent → graph', () => {
  test('lowers to scroll signal + TransitionNode with seq routing', () => {
    const lowered = lowerScrollTimelineIntent(heroScrollIntent());
    const signal = lowered.graph.nodes.find((n) => n.family === 'signal');
    expect(signal?.family === 'signal' && signal.input).toBe('scroll.y');

    const transition = lowered.graph.nodes.find((n) => n.id === lowered.transitionId);
    expect(transition?.family).toBe('transition');
    if (transition?.family === 'transition') {
      expect(transition.routing).toBe('seq');
      expect(transition.durationMs).toBe(500);
    }
  });

  test('axis progress maps to scroll.progress signal', () => {
    const intent = ScrollTimeline.intent({
      target: 'track',
      axis: 'progress',
      range: ['cover 0%', 'cover 100%'],
      from: { opacity: 0 },
      to: { opacity: 1 },
      transition: { durationMs: 200 },
      policy: { reducedMotion: 'none', motionTier: 'transitions' },
    });
    const lowered = lowerScrollTimelineIntent(intent);
    const signal = lowered.graph.nodes.find((n) => n.family === 'signal');
    expect(signal?.family === 'signal' && signal.input).toBe('scroll.progress');
  });
});

describe('ScrollTimeline graph → CSS', () => {
  test('compileScrollTimeline emits scroll() timeline with @supports floor', () => {
    const lowered = lowerScrollTimelineIntent(heroScrollIntent());
    const compiled = compileScrollTimeline(lowered.graph, lowered.transitionId, lowered.intent);

    expect(compiled.css.scrollTimeline).toContain('@supports (animation-timeline: scroll())');
    expect(compiled.css.scrollTimeline).toContain('animation-timeline: scroll()');
    expect(compiled.css.scrollTimeline).toContain('animation-range: 0% 100%');
    expect(compiled.css.scrollTimeline).toContain('@supports not (animation-timeline: scroll())');
    expect(compiled.css.raw).toContain('transform: translate3d');
    expect(compiled.resultDigest.integrity_digest.length).toBeGreaterThan(0);
  });

  test('resolveScrollTimelineInitialState + settle compile honors reducedMotion (#126)', () => {
    expect(resolveScrollTimelineInitialState(heroScrollIntent(), { prefersReducedMotion: true })).toBe('after');
    const lowered = lowerScrollTimelineIntent(heroScrollIntent());
    const compiled = compileScrollTimeline(lowered.graph, lowered.transitionId, lowered.intent, {
      prefersReducedMotion: true,
    });
    expect(compiled.css.raw).toContain('prefers-reduced-motion: reduce');
  });

  test('settle policy emits the @media reduced-motion guard WITHOUT the server hint', () => {
    const lowered = lowerScrollTimelineIntent(heroScrollIntent());
    const compiled = compileScrollTimeline(lowered.graph, lowered.transitionId, lowered.intent);
    expect(compiled.css.raw).toContain('@media (prefers-reduced-motion: reduce)');
    // Targets the real stamped selector, not an unstamped [data-czap-scroll] attribute.
    expect(compiled.css.raw).not.toContain('data-czap-scroll');
    const guard = compiled.css.raw.slice(compiled.css.raw.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(guard).toContain('animation: none !important');
    expect(guard).toContain('opacity');
  });

  test('inline axis emits scroll(nearest inline)', () => {
    const intent = ScrollTimeline.intent({
      target: 'rail',
      axis: 'inline',
      range: ['0%', '50%'],
      from: { opacity: 0 },
      to: { opacity: 1 },
      transition: { durationMs: 300 },
      policy: { reducedMotion: 'none', motionTier: 'transitions' },
    });
    const lowered = lowerScrollTimelineIntent(intent);
    const compiled = compileScrollTimeline(lowered.graph, lowered.transitionId, intent);
    expect(compiled.css.scrollTimeline).toContain('animation-timeline: scroll(nearest inline)');
  });
});

describe('ScrollTimeline #132 gate — TransitionNode fields read', () => {
  test('interpretTransition reads all four TransitionNode fields', () => {
    const lowered = lowerScrollTimelineIntent(heroScrollIntent());
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    expect(plan.css?.fromState).toBe('before');
    expect(plan.css?.toState).toBe('after');
    expect(plan.css?.routing).toBe('seq');
    expect(plan.css?.durationMs).toBe(500);
    expect(plan.runtime?.durationMs).toBe(500);
    expect(plan.diagnostics).toHaveLength(0);
  });
});
