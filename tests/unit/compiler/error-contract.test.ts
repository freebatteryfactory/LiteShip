/** @czap/compiler error contract */
import { describe, it, expect } from 'vitest';
import { hasTag } from '@czap/error';
import { sealGraph, type DocumentGraph } from '@czap/core';
import { compileReveal } from '@czap/compiler';

const META = { created: { wall_ms: 0, counter: 0, node_id: 't' }, updated: { wall_ms: 0, counter: 0, node_id: 't' }, version: 1 };

describe('@czap/compiler error contract', () => {
  it('compileReveal without a css plan names compileReveal and the missing plan', () => {
    const empty = sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes: [], edges: [] } as Omit<DocumentGraph, 'id' | 'digest'>);
    try {
      compileReveal(empty, 'deadbeef', { trigger: { kind: 'load' } });
      expect.unreachable('expected throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/compileReveal/);
      expect(String(error)).toMatch(/css plan/i);
    }
  });
});
