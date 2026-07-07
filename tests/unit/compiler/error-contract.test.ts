/** @czap/compiler error contract */
import { describe, it, expect } from 'vitest';
import { hasTag } from '@czap/error';
import { sealGraph, Reveal, type DocumentGraph } from '@czap/core';
import { compileReveal } from '@czap/compiler';

const META = { created: { wall_ms: 0, counter: 0, node_id: 't' }, updated: { wall_ms: 0, counter: 0, node_id: 't' }, version: 1 };

const minimalIntent = Reveal.intent({
  target: 'hero',
  trigger: { type: 'view', range: ['entry 0%', 'cover 60%'] },
  from: { opacity: 0 },
  to: { opacity: 1 },
  transition: { durationMs: 300 },
  policy: { reducedMotion: 'settle', motionTier: 'transitions' },
});

describe('@czap/compiler error contract', () => {
  it('compileReveal without a css plan names compileReveal and the missing plan', () => {
    const empty = sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes: [], edges: [] } as Omit<DocumentGraph, 'id' | 'digest'>);
    try {
      compileReveal(empty, 'deadbeef', minimalIntent);
      expect.unreachable('expected throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/compileReveal/);
      expect(String(error)).toMatch(/css plan/i);
    }
  });
});
