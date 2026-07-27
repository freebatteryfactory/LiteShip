// @vitest-environment node
// PROVES: INV-FACADE-EXPORT-BUDGET, INV-PUBLIC-SURFACE-INHABITED
/** Runtime inhabitation proof for every paved-road value on the `liteship` root. */

import { describe, expect, it } from 'vitest';
import {
  defineAdaptive,
  defineBoundary,
  defineConfig,
  defineQuantizer,
  defineStyle,
  defineTheme,
  defineToken,
  explainDiagnostic,
  schema,
} from '../../../packages/liteship/src/index.js';
import { ROOT_EXPORT_CONTRACT } from '../../../packages/liteship/src/export-budget.js';

function boundary() {
  return defineBoundary({
    input: 'viewport.width',
    at: [
      [0, 'compact'],
      [800, 'wide'],
    ] as const,
  });
}

const VALUE_EXAMPLES = {
  defineConfig: () => defineConfig({}),
  defineBoundary: boundary,
  defineQuantizer: () => defineQuantizer(boundary(), { outputs: {} }),
  defineToken: () =>
    defineToken({
      name: 'surface-inhabitation',
      category: 'color',
      axes: ['base'] as const,
      values: { base: '#123456' },
      fallback: '#123456',
    }),
  defineTheme: () => defineTheme({ name: 'surface-inhabitation', variants: ['default'] as const, tokens: {} }),
  defineStyle: () => defineStyle({ boundary: boundary(), base: { properties: { display: 'grid' } } }),
  defineAdaptive: () =>
    defineAdaptive({
      boundary: {
        input: 'viewport.width',
        at: [
          [0, 'compact'],
          [800, 'wide'],
        ] as const,
      },
      style: { base: { properties: { display: 'grid' } } },
    }),
  schema: () => schema.struct({ value: schema.string }),
  explainDiagnostic: () => explainDiagnostic('compiler/css/unknown-state-key'),
} as const satisfies Readonly<Record<string, () => unknown>>;

describe('liteship paved-road surface inhabitation', () => {
  it('executes one real allocation or read through every public root value', () => {
    const governed = ROOT_EXPORT_CONTRACT.filter((entry) => entry.kind === 'value').map((entry) => entry.name);
    expect(Object.keys(VALUE_EXAMPLES).sort()).toEqual([...governed].sort());

    for (const [symbol, execute] of Object.entries(VALUE_EXAMPLES)) {
      expect(execute(), `${symbol} has no executable public example`).not.toBeUndefined();
    }
  });

  it('refuses a phantom paved-road value with no executable example', () => {
    const missing = [...ROOT_EXPORT_CONTRACT, { name: 'phantom', kind: 'value' as const }]
      .filter((entry) => entry.kind === 'value')
      .map((entry) => entry.name)
      .filter((name) => !(name in VALUE_EXAMPLES));
    expect(missing).toEqual(['phantom']);
  });
});
