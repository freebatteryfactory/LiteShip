/**
 * Quantizer package smoke test.
 */

import { describe, test, expect } from 'vitest';
import { Millis, defineBoundary } from '@liteship/core';
import { evaluate, Transition } from '@liteship/quantizer';

describe('quantizer smoke', () => {
  test('evaluate() returns result with state', () => {
    const b = defineBoundary({
      input: 'x',
      at: [
        [0, 'a'],
        [50, 'b'],
      ] as const,
    });
    const result = evaluate(b, 0);
    expect(result.state).toBe('a');
    const result2 = evaluate(b, 100);
    expect(result2.state).toBe('b');
  });

  test('Transition.for creates resolver', () => {
    const b = defineBoundary({
      input: 'x',
      at: [
        [0, 'a'],
        [50, 'b'],
      ] as const,
    });
    const stub = { boundary: b, state: null as any, changes: null as any, evaluate: () => 'a' as const };
    const t = Transition.for(stub, { '*': { duration: Millis(300) } });
    expect(t.getTransition('a', 'b').duration).toBe(300);
  });
});
