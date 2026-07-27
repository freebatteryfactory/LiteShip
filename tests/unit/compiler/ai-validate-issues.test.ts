/**
 * validateAIOutput structured issues — teach-by-data alongside the prose
 * errors, for LLM re-prompting loops.
 */

import { describe, expect, test } from 'vitest';
import { AIManifestCompiler } from '@liteship/compiler';
import type { AIManifest } from '@liteship/compiler';

const manifest: AIManifest = {
  version: '1.0',
  dimensions: { layout: { states: ['grid', 'list'], current: 'grid', exclusive: true, description: 'Layout mode' } },
  slots: {},
  constraints: [],
  actions: {
    setLayout: {
      params: {
        cols: { type: 'number', required: true, min: 1, max: 12, description: 'Column count' },
      },
      effects: [],
      description: 'Set grid layout',
    },
  },
};

describe('validateAIOutput issues', () => {
  test('valid output yields empty errors and issues', () => {
    const result = AIManifestCompiler.validateAIOutput({ action: 'setLayout', params: { cols: 3 } }, manifest);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  test('unknown action yields a structured issue whose message mirrors errors[0]', () => {
    const result = AIManifestCompiler.validateAIOutput({ action: 'explode' }, manifest);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    const issue = result.issues[0]!;
    expect(issue.path).toBe('action');
    expect(issue.expected).toBe('one of [setLayout]');
    expect(issue.received).toBe('explode');
    expect(issue.hint).toMatch(/setLayout/);
    expect(issue.message).toBe("Unknown action 'explode'. Available: setLayout");
    // errors stays the prose projection of issues.
    expect(result.errors).toEqual(result.issues.map((i) => i.message));
  });

  test('range and dimension failures carry path/expected/received', () => {
    const result = AIManifestCompiler.validateAIOutput(
      { action: 'setLayout', params: { cols: 99 }, dimensions: { layout: 'carousel' } },
      manifest,
    );

    expect(result.valid).toBe(false);
    const byPath = new Map(result.issues.map((issue) => [issue.path, issue]));

    const cols = byPath.get('params.cols')!;
    expect(cols.expected).toBe('<= 12');
    expect(cols.received).toBe('99');
    expect(cols.message).toBe("Parameter 'cols' must be <= 12, got 99");

    const layout = byPath.get('dimensions.layout')!;
    expect(layout.expected).toBe('one of [grid, list]');
    expect(layout.received).toBe('carousel');
    expect(layout.hint).toMatch(/grid, list/);
  });

  test('null output is a single structured issue, message preserved', () => {
    const result = AIManifestCompiler.validateAIOutput(null, manifest);

    expect(result.errors).toEqual(['Output is null or undefined']);
    expect(result.issues[0]!.path).toBe('output');
    expect(result.issues[0]!.expected).toBe('object');
    expect(result.issues[0]!.received).toBe('null');
    expect(result.issues[0]!.hint).toMatch(/JSON object/);
  });
});
