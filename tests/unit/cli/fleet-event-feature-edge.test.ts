import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  assertFleetEventOwnership,
  assertFleetEventProducerClassification,
  enumerateTypedEventDispatches,
} from '../../../packages/cli/src/internal/fleet-event-feature-edge.js';

describe('fleet event producer and ownership census', () => {
  test('recognizes typed DOM dispatch and Vite custom-channel send evidence', () => {
    const source = `
      const EVENT = 'liteship:alpha';
      dispatchLiteshipEvent(target, EVENT, { ok: true });
      server.ws.send({ type: 'custom', event: 'liteship:beta', data: {} });
    `;
    expect([...enumerateTypedEventDispatches(source)].sort()).toEqual(['liteship:alpha', 'liteship:beta']);
  });

  test('comments, documentation, and unrelated strings cannot launder a producer claim', () => {
    expect([...enumerateTypedEventDispatches(`// dispatch liteship:alpha\nconst docs = 'liteship:alpha';`)]).toEqual(
      [],
    );
  });

  test('a typed emitter omitted from its owner receipt is rejected', () => {
    const classify = (): void =>
      assertFleetEventProducerClassification(
        new Map([['liteship:alpha', new Set(['owner.ts'])]]),
        new Map([['liteship:alpha', ['owner.ts', 'hidden-emitter.ts']]]),
      );
    expect(classify).toThrow(/unclassified typed producer.*hidden-emitter/);
    try {
      classify();
    } catch (error) {
      expect(error).toMatchObject({
        _tag: 'InvariantViolationError',
        invariant: 'fleet-event.producer-census',
      });
    }
  });

  test('an undeclared executable identity is rejected for every generated suffix', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/), (suffix) => {
        const identity = `liteship:${suffix}`;
        expect(() =>
          assertFleetEventOwnership(new Set(['liteship:owned']), new Map([[identity, ['fixture.ts']]])),
        ).toThrow(/no owner declaration/);
      }),
      { numRuns: 64 },
    );
  });
});
