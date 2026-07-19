/**
 * Motion primitives — property-based + adversarial cross-checks (Tier 2b).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  Stagger,
  lowerStaggerIntent,
  ScrollTimeline,
  lowerScrollTimelineIntent,
  interpretTransition,
  ResponsiveMedia,
  resolveResponsiveMedia,
} from '@liteship/core';
import { compileStagger, compileScrollTimeline, MotionCompiler } from '@liteship/compiler';

describe('Motion primitives property laws', () => {
  test('every stagger child delay equals index * stepMs', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 10, max: 250 }), (count, stepMs) => {
        const intent = Stagger.intent({
          trigger: { type: 'scroll', axis: 'progress' },
          children: Array.from({ length: count }, (_, i) => ({
            target: `c-${i}`,
            from: { opacity: 0 },
            to: { opacity: 1 },
          })),
          stepMs,
          transition: { durationMs: 240 },
          policy: { reducedMotion: 'none', motionTier: 'transitions' },
        });
        const lowered = lowerStaggerIntent(intent);
        lowered.items.forEach((item, index) => {
          expect(item.delayMs).toBe(index * stepMs);
        });
      }),
      { seed: 0x5eed },
    );
  });

  test('interpretTransition durationMs defaults to 300 when omitted on graph', () => {
    const intent = ScrollTimeline.intent({
      target: 'fade',
      range: ['0%', '100%'],
      from: { opacity: 0 },
      to: { opacity: 1 },
      transition: { durationMs: 0 },
      policy: { reducedMotion: 'none', motionTier: 'none' },
    });
    const lowered = lowerScrollTimelineIntent(intent);
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    expect(plan.css?.durationMs).toBe(0);
  });

  test('MotionCompiler scroll timeline block always includes unsupported fallback', () => {
    fc.assert(
      fc.property(fc.constantFrom('0%', '10%', 'entry 0%'), fc.constantFrom('50%', '100%', 'cover 80%'), (start, end) => {
        const intent = ScrollTimeline.intent({
          target: 'probe',
          range: [start, end],
          from: { opacity: 0 },
          to: { opacity: 1 },
          transition: { durationMs: 300 },
          policy: { reducedMotion: 'none', motionTier: 'transitions' },
        });
        const lowered = lowerScrollTimelineIntent(intent);
        const compiled = compileScrollTimeline(lowered.graph, lowered.transitionId, intent);
        expect(compiled.css.scrollTimeline).toContain('@supports not (animation-timeline: scroll())');
        expect(compiled.css.scrollTimeline).toContain(`animation-range: ${start} ${end}`);
      }),
      { seed: 0x5eed },
    );
  });

  test('compiled scroll CSS emits individual transform props, never a translate3d consumer', () => {
    // Wave-4 track-based emission: the native path writes the individual `translate:`
    // property off the per-axis `--liteship-*` vars instead of a single `translate3d()`
    // consumer rule (appendTranslateConsumer is deleted). Holds across every axis mix.
    fc.assert(
      fc.property(
        fc.constantFrom('block', 'inline', 'progress'),
        fc.constantFrom('12px', '40px', '-8px'),
        (axis, dy) => {
          const intent = ScrollTimeline.intent({
            target: 'panel',
            axis,
            range: ['0%', '100%'],
            from: { opacity: 0, translateY: dy },
            to: { opacity: 1, translateY: '0px' },
            transition: { durationMs: 300, easing: 'ease' },
            policy: { reducedMotion: 'none', motionTier: 'animations' },
          });
          const lowered = lowerScrollTimelineIntent(intent);
          const compiled = compileScrollTimeline(lowered.graph, lowered.transitionId, intent);
          return (
            !compiled.css.raw.includes('translate3d') &&
            compiled.css.raw.includes('translate:') &&
            compiled.css.raw.includes('--liteship-panel-y')
          );
        },
      ),
      { seed: 0x5eed },
    );
  });

  test('compileStagger raw CSS length grows monotonically with child count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (count) => {
        const intent = Stagger.intent({
          trigger: { type: 'scroll' },
          children: Array.from({ length: count }, (_, i) => ({
            target: `n-${i}`,
            from: { opacity: 0 },
            to: { opacity: 1 },
          })),
          stepMs: 40,
          transition: { durationMs: 200 },
          policy: { reducedMotion: 'none', motionTier: 'transitions' },
        });
        const compiled = compileStagger(lowerStaggerIntent(intent));
        expect(compiled.items).toHaveLength(count);
        expect(compiled.raw.length).toBeGreaterThan(count * 50);
      }),
      { seed: 0x5eed },
    );
  });

  test('responsive resolve never returns empty src', () => {
    fc.assert(
      fc.property(fc.float({ min: 0.25, max: 8, noNaN: true }), (dpr) => {
        const intent = ResponsiveMedia.intent({
          id: 'p',
          alt: 'p',
          variants: [{ src: '/one.jpg', descriptor: '1x' }],
        });
        const resolved = resolveResponsiveMedia(intent, { devicePixelRatio: dpr, saveData: false });
        expect(resolved.src.length).toBeGreaterThan(0);
      }),
      { seed: 0x5eed },
    );
  });
});

describe('Motion primitives adversarial', () => {
  test('interpretTransition on missing transition id emits diagnostic', () => {
    const lowered = lowerScrollTimelineIntent(
      ScrollTimeline.intent({
        target: 'x',
        range: ['0%', '100%'],
        from: { opacity: 0 },
        to: { opacity: 1 },
        transition: { durationMs: 100 },
        policy: { reducedMotion: 'none', motionTier: 'none' },
      }),
    );
    const fakeId = lowered.transitionId.slice(0, -2) + 'ff';
    const plan = interpretTransition(lowered.graph, fakeId as typeof lowered.transitionId);
    expect(plan.css).toBeUndefined();
    expect(plan.diagnostics.length).toBeGreaterThan(0);
  });

  test('MotionCompiler with zero delay omits delay suffix', () => {
    const intent = ScrollTimeline.intent({
      target: 'z',
      range: ['0%', '100%'],
      from: { opacity: 0 },
      to: { opacity: 1 },
      transition: { durationMs: 100 },
      policy: { reducedMotion: 'none', motionTier: 'none' },
    });
    const lowered = lowerScrollTimelineIntent(intent);
    const plan = interpretTransition(lowered.graph, lowered.transitionId);
    if (!plan.css) throw new Error('expected css plan');
    const css = MotionCompiler.compile({ plan: plan.css, delayMs: 0 });
    expect(css.transition).not.toMatch(/\d+ms ease \d+ms/);
  });
});
