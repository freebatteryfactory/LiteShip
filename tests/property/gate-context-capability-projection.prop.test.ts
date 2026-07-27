// @vitest-environment node
/**
 * Parser-capability projection laws.
 *
 * GateContext capabilities are executable parts of the toolchain. Level
 * scoping may narrow judged files, but it may never drop a supplied detector or
 * manufacture one on the lean path. Losing one silently swaps a sound parser
 * for a weaker fallback, so every presence/absence combination is exercised.
 *
 * @module
 */
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import {
  FACT_CHANNELS,
  GATE_CONTEXT_CAPABILITIES,
  LITESHIP_ASSURANCE_MAP,
  memoryContext,
  recordingContext,
  scopeContextByLevel,
  type GateContext,
  type GateContextCapability,
} from '@liteship/gauntlet';

const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;

const sentinels = {
  skipDetector: (source: string) => [{ line: 17, form: 'call' as const, token: source }],
  earlyReturnDetector: (source: string) => [{ line: source.length, token: 'return' }],
  codeOnly: (source: string) => `parsed:${source}`,
  diagnosticEmitterDetector: (source: string) => [
    { method: 'warnRegistered' as const, code: `test/${source}`, line: 23 },
  ],
} satisfies Required<Pick<GateContext, GateContextCapability>>;

function projectSelection(selection: readonly boolean[]): Partial<Pick<GateContext, GateContextCapability>> {
  const projected: Partial<Pick<GateContext, GateContextCapability>> = {};
  for (const [index, capability] of GATE_CONTEXT_CAPABILITIES.entries()) {
    if (!selection[index]) continue;
    Object.defineProperty(projected, capability, {
      configurable: false,
      enumerable: true,
      value: sentinels[capability],
      writable: false,
    });
  }
  return projected;
}

function invokeCapability(context: GateContext, capability: GateContextCapability): unknown {
  switch (capability) {
    case 'skipDetector':
      return context.skipDetector?.('skip');
    case 'earlyReturnDetector':
      return context.earlyReturnDetector?.('return');
    case 'codeOnly':
      return context.codeOnly?.('source');
    case 'diagnosticEmitterDetector':
      return context.diagnosticEmitterDetector?.('diagnostic');
  }
}

describe('GateContext parser-capability projection', () => {
  test('the capability vocabulary is disjoint from host-produced fact channels', () => {
    const facts = new Set<string>(FACT_CHANNELS);
    expect(GATE_CONTEXT_CAPABILITIES).toEqual([
      'skipDetector',
      'earlyReturnDetector',
      'codeOnly',
      'diagnosticEmitterDetector',
    ]);
    for (const capability of GATE_CONTEXT_CAPABILITIES) {
      expect(facts.has(capability)).toBe(false);
    }
  });

  test('the canonical projection enumerates every capability exactly once', () => {
    const projected = projectSelection(GATE_CONTEXT_CAPABILITIES.map(() => true));
    expect(Object.keys(projected)).toEqual([...GATE_CONTEXT_CAPABILITIES]);
    expect(new Set(GATE_CONTEXT_CAPABILITIES).size).toBe(GATE_CONTEXT_CAPABILITIES.length);
    for (const capability of GATE_CONTEXT_CAPABILITIES) {
      expect(projected).toHaveProperty(capability);
      expect(typeof projected[capability]).toBe('function');
      expect(projected[capability]).toBe(sentinels[capability]);
    }
  });

  test('every supplied subset survives every level scope by identity, while absent capabilities stay absent', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), {
          minLength: GATE_CONTEXT_CAPABILITIES.length,
          maxLength: GATE_CONTEXT_CAPABILITIES.length,
        }),
        fc.constantFrom(...LEVELS),
        (selection, level) => {
          const base = {
            ...memoryContext({
              'packages/core/src/index.ts': 'export const core = true;',
              'packages/web/src/index.ts': 'export const web = true;',
              'tests/unit/example.test.ts': 'test("example", () => {});',
            }),
            ...projectSelection(selection),
          };
          const scoped = scopeContextByLevel(base, level, LITESHIP_ASSURANCE_MAP);

          for (const [index, capability] of GATE_CONTEXT_CAPABILITIES.entries()) {
            if (selection[index]) {
              expect(scoped[capability]).toBe(sentinels[capability]);
              expect(invokeCapability(scoped, capability)).toEqual(invokeCapability(base, capability));
            } else {
              expect(Object.hasOwn(scoped, capability)).toBe(false);
              expect(scoped[capability]).toBeUndefined();
            }
          }
        },
      ),
      { numRuns: 160 },
    );
  });

  test('reading parser capabilities does not counterfeit fact-channel evidence', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), {
          minLength: GATE_CONTEXT_CAPABILITIES.length,
          maxLength: GATE_CONTEXT_CAPABILITIES.length,
        }),
        (selection) => {
          const recorder = recordingContext({
            ...memoryContext({ 'packages/web/src/example.ts': 'export const example = true;' }),
            ...projectSelection(selection),
          });

          for (const [index, capability] of GATE_CONTEXT_CAPABILITIES.entries()) {
            if (selection[index]) invokeCapability(recorder.context, capability);
          }

          expect([...recorder.reads()]).toEqual([]);
        },
      ),
      { numRuns: 160 },
    );
  });

  test('the recorder still distinguishes real evidence reads from capability invocation', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FACT_CHANNELS), (channel) => {
        const sentinel = { channel, source: 'host-fact' } as never;
        const recorder = recordingContext({
          ...memoryContext({
            'packages/web/src/example.ts': 'export const example = true;',
            'tests/unit/example.test.ts': 'test("example", () => {});',
          }),
          ...sentinels,
          [channel]: sentinel,
        } as GateContext);

        for (const capability of GATE_CONTEXT_CAPABILITIES) {
          invokeCapability(recorder.context, capability);
        }
        recorder.context.allFiles?.();
        expect(recorder.context[channel]).toBe(sentinel);

        expect([...recorder.reads()].sort()).toEqual(['allFiles', channel].sort());
      }),
      { numRuns: 120 },
    );
  });

  test('an absent fact read remains visible beside otherwise invisible capability reads', () => {
    fc.assert(
      fc.property(fc.constantFrom(...FACT_CHANNELS), (channel) => {
        const recorder = recordingContext({
          ...memoryContext({ 'packages/core/src/index.ts': 'export const core = true;' }),
          ...sentinels,
        });

        for (const capability of GATE_CONTEXT_CAPABILITIES) {
          invokeCapability(recorder.context, capability);
        }
        expect(recorder.context[channel]).toBeUndefined();

        expect([...recorder.reads()]).toEqual([`${channel}:absent`]);
      }),
      { numRuns: 120 },
    );
  });

  test('the oracle detects a scoper that drops any selected capability', () => {
    fc.assert(
      fc.property(fc.constantFrom(...GATE_CONTEXT_CAPABILITIES), (dropped) => {
        const base = {
          ...memoryContext({ 'packages/core/src/index.ts': 'export const core = true;' }),
          ...sentinels,
        };
        const broken: Partial<GateContext> = {
          ...scopeContextByLevel(base, 'L4', LITESHIP_ASSURANCE_MAP),
        };
        delete broken[dropped];

        const lost = GATE_CONTEXT_CAPABILITIES.filter(
          (capability) => base[capability] !== undefined && broken[capability] !== base[capability],
        );
        expect(lost).toEqual([dropped]);
      }),
      { numRuns: 80 },
    );
  });
});
