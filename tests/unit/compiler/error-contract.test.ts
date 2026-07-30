/** @liteship/compiler error contract */
import { describe, it, expect } from 'vitest';
import { hasTag } from '@liteship/error';
import {
  lowerScrollTimelineIntent,
  lowerStaggerIntent,
  ScrollTimeline,
  sealGraph,
  Stagger,
  Reveal,
  type ContentAddress,
  type DocumentGraph,
} from '@liteship/core';
import { compileReveal, compileScrollTimeline, compileStagger } from '@liteship/compiler';

const META = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const minimalIntent = Reveal.intent({
  target: 'hero',
  trigger: { type: 'view', range: ['entry 0%', 'cover 60%'] },
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { durationMs: 300 },
  policy: { reducedMotion: 'settle', motionTier: 'transitions' },
});

describe('@liteship/compiler error contract', () => {
  it('compileReveal without a css plan names compileReveal and the missing plan', () => {
    const empty = sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes: [], edges: [] } as Omit<
      DocumentGraph,
      'id' | 'digest'
    >);
    try {
      compileReveal(empty, 'deadbeef', minimalIntent);
      expect.unreachable('expected throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/compileReveal/);
      expect(String(error)).toMatch(/css plan/i);
    }
  });

  it('compileStagger identifies the child whose transition plan is missing', () => {
    const lowered = lowerStaggerIntent(
      Stagger.intent({
        trigger: { type: 'view', range: ['entry 0%', 'cover 50%'] },
        children: [{ target: 'hero', from: { opacity: 0 }, to: { opacity: 1 } }],
        stepMs: 80,
        transition: { durationMs: 300, easing: 'ease' },
        policy: { reducedMotion: 'settle', motionTier: 'transitions' },
      }),
    );
    const corrupt = {
      ...lowered,
      items: [{ ...lowered.items[0]!, transitionId: 'fnv1a:00000000' as ContentAddress }],
    };

    try {
      compileStagger(corrupt);
      expect.unreachable('expected throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/compileStagger/);
      expect(String(error)).toMatch(/css plan/i);
      expect(String(error)).toMatch(/hero/);
    }
  });

  it('compileScrollTimeline identifies a missing transition plan', () => {
    const intent = ScrollTimeline.intent({
      target: 'hero',
      axis: 'block',
      range: ['0%', '100%'],
      from: { opacity: 0 },
      to: { opacity: 1 },
      transition: { durationMs: 300, easing: 'ease' },
      policy: { reducedMotion: 'settle', motionTier: 'transitions' },
    });
    const lowered = lowerScrollTimelineIntent(intent);

    try {
      compileScrollTimeline(lowered.graph, 'fnv1a:00000000' as ContentAddress, intent);
      expect.unreachable('expected throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/compileScrollTimeline/);
      expect(String(error)).toMatch(/css plan/i);
    }
  });
});
