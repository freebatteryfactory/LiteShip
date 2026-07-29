// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { createPhysicalStateTracker } from '../../packages/web/src/physical/capture.js';
import { testCssEscape } from '../helpers/css-escape.js';

type Command =
  | { readonly type: 'start'; readonly owner: 0 | 1; readonly start: number; readonly end: number }
  | { readonly type: 'update'; readonly text: string }
  | { readonly type: 'end' }
  | { readonly type: 'dispose'; readonly tracker: 0 | 1 };

interface TrackerModel {
  disposed: boolean;
  active: { readonly owner: 0 | 1; text: string; readonly start: number; readonly end: number } | null;
}

const commandArbitrary: fc.Arbitrary<Command> = fc.oneof(
  fc.record({
    type: fc.constant('start' as const),
    owner: fc.constantFrom(0 as const, 1 as const),
    start: fc.integer({ min: 0, max: 12 }),
    end: fc.integer({ min: 0, max: 12 }),
  }),
  fc.record({
    type: fc.constant('update' as const),
    text: fc.string({ maxLength: 12 }),
  }),
  fc.constant({ type: 'end' as const }),
  fc.record({
    type: fc.constant('dispose' as const),
    tracker: fc.constantFrom(0 as const, 1 as const),
  }),
);

describe('host-owned physical-state lifecycle laws', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: { escape: testCssEscape },
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('two owners observe the same document independently and disposal makes only its owner inert', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(commandArbitrary, { minLength: 1, maxLength: 50 }), async (commands) => {
        const inputs = [document.createElement('input'), document.createElement('input')] as const;
        inputs[0].id = 'ime-owner-0';
        inputs[1].id = 'ime-owner-1';
        inputs[0].value = 'abcdefghijkl';
        inputs[1].value = 'abcdefghijkl';
        document.body.replaceChildren(...inputs);

        const trackers = [createPhysicalStateTracker(document), createPhysicalStateTracker(document)] as const;
        const models: [TrackerModel, TrackerModel] = [
          { disposed: false, active: null },
          { disposed: false, active: null },
        ];

        for (const command of commands) {
          switch (command.type) {
            case 'start': {
              const input = inputs[command.owner];
              input.setSelectionRange(Math.min(command.start, command.end), Math.max(command.start, command.end));
              input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
              for (const model of models) {
                if (!model.disposed) {
                  model.active = {
                    owner: command.owner,
                    text: '',
                    start: Math.min(command.start, command.end),
                    end: Math.max(command.start, command.end),
                  };
                }
              }
              break;
            }
            case 'update': {
              inputs[0].dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: command.text }));
              if (command.text) {
                for (const model of models) {
                  if (!model.disposed && model.active) model.active.text = command.text;
                }
              }
              break;
            }
            case 'end':
              inputs[0].dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
              for (const model of models) if (!model.disposed) model.active = null;
              break;
            case 'dispose':
              await trackers[command.tracker].dispose();
              models[command.tracker].disposed = true;
              models[command.tracker].active = null;
              break;
          }

          for (const [index, tracker] of trackers.entries()) {
            const model = models[index as 0 | 1];
            const expected = model.active;
            expect(tracker.captureIME()).toEqual(
              expected
                ? {
                    elementPath: `#ime-owner-${expected.owner}`,
                    text: expected.text,
                    start: expected.start,
                    end: expected.end,
                  }
                : null,
            );
          }
        }

        await Promise.all(trackers.map((tracker) => tracker.dispose()));
      }),
      { numRuns: 120 },
    );
  });
});
