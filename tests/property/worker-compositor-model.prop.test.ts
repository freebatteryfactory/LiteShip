/** Seeded model differential for the executed inline compositor worker. @module */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { executeCompositorScript } from '../support/compositor-script-harness.js';

type State = 'low' | 'high';
type Operation =
  { readonly kind: 'evaluate'; readonly name: 'a' | 'b'; readonly state: State } | { readonly kind: 'warm-reset' };

describe('compositor worker versus full-snapshot model', () => {
  test('generated update/reset histories never drop an unchanged quantizer', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({
              kind: fc.constant<'evaluate'>('evaluate'),
              name: fc.constantFrom<'a' | 'b'>('a', 'b'),
              state: fc.constantFrom<State>('low', 'high'),
            }),
            fc.constant<Operation>({ kind: 'warm-reset' }),
          ),
          { maxLength: 100 },
        ),
        (operations) => {
          const worker = executeCompositorScript();
          const model: Record<'a' | 'b', State> = { a: 'low', b: 'low' };
          for (const name of ['a', 'b'] as const) {
            worker.send({
              type: 'add-quantizer',
              name,
              boundaryId: `fnv1a:${name}`,
              states: ['low', 'high'],
              thresholds: [0, 500],
            });
          }

          for (const operation of operations) {
            if (operation.kind === 'warm-reset') {
              model.a = 'low';
              model.b = 'low';
              worker.send({ type: 'warm-reset' });
            } else {
              model[operation.name] = operation.state;
              worker.send({
                type: 'evaluate',
                name: operation.name,
                value: operation.state === 'high' ? 900 : 100,
              });
            }
            worker.send({ type: 'compute' });
            const message = worker.take<{ type: 'state'; state: { discrete: Record<string, string> } }>('state');
            expect(message.state.discrete).toEqual(model);
          }
        },
      ),
      { seed: 0xc0a905e, numRuns: 100 },
    );
  });
});
