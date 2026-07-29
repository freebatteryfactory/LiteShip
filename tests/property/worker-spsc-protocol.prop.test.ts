/** Generated queue-model and message-discriminant laws for @liteship/worker. @module */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Messages, SPSCRing } from '@liteship/worker';

describe('SPSCRing reference queue model', () => {
  test('generated push/pop histories preserve FIFO and bounded backpressure', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 16 }).chain((capacity) =>
          fc.integer({ min: 1, max: 8 }).chain((width) =>
            fc
              .array(
                fc.oneof(
                  fc.record({
                    kind: fc.constant<'push'>('push'),
                    values: fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: width, maxLength: width }),
                  }),
                  fc.constant({ kind: 'pop' as const }),
                ),
                { maxLength: 200 },
              )
              .map((operations) => ({ capacity, width, operations })),
          ),
        ),
        ({ capacity, width, operations }) => {
          const { producer, consumer } = SPSCRing.createPair(capacity, width);
          const model: number[][] = [];
          const out = new Float64Array(width);

          for (const operation of operations) {
            if (operation.kind === 'push') {
              const admitted = model.length < capacity;
              expect(producer.push(Float64Array.from(operation.values))).toBe(admitted);
              if (admitted) model.push(operation.values);
            } else {
              const expected = model.shift();
              expect(consumer.pop(out)).toBe(expected !== undefined);
              if (expected !== undefined) expect([...out]).toEqual(expected);
            }
            expect(producer.count).toBe(model.length);
            expect(consumer.count).toBe(model.length);
          }
        },
      ),
      { seed: 0x5a5c, numRuns: 100 },
    );
  });
});

describe('worker message discriminant fuzz', () => {
  test('unknown strings never narrow into either protocol direction', () => {
    const known = new Set([
      'init',
      'add-quantizer',
      'bootstrap-quantizers',
      'startup-compute',
      'bootstrap-resolved-state',
      'apply-resolved-state',
      'remove-quantizer',
      'evaluate',
      'set-blend',
      'apply-updates',
      'compute',
      'warm-reset',
      'start-render',
      'stop-render',
      'transfer-canvas',
      'dispose',
      'ready',
      'state',
      'resolved-state-ack',
      'frame',
      'render-complete',
      'error',
      'metrics',
    ]);
    fc.assert(
      fc.property(fc.string(), (type) => {
        fc.pre(!known.has(type));
        expect(Messages.isToWorker({ type })).toBe(false);
        expect(Messages.isFromWorker({ type })).toBe(false);
      }),
      { seed: 0x6e55a9e, numRuns: 500 },
    );
  });
});
