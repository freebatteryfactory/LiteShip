import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  analyzeRepositorySpine,
  analyzeSpineSources,
  renderSpineBarrel,
  renderSpineSymbolDocumentation,
} from '../../../scripts/lib/spine-surface-contract.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

describe('_spine explicit surface contract', () => {
  test('admits documented type meaning and excludes value-only declarations from the root', () => {
    const analysis = analyzeSpineSources({
      'alpha.d.ts': [
        '/** Stable alpha contract. */',
        'export interface Alpha { readonly value: string }',
        '/** Runtime-only helper mirrored on the leaf. */',
        'export declare function execute(): void;',
      ].join('\n'),
    });

    expect(analysis.symbols.map((symbol) => symbol.name)).toEqual(['Alpha']);
    expect(analysis.rejectedValues).toEqual([{ name: 'execute', leaf: 'alpha.d.ts' }]);
    const barrel = renderSpineBarrel(analysis);
    expect(barrel).toContain('export type {');
    expect(barrel).toContain('Alpha,');
    expect(barrel).not.toContain('execute');
    expect(barrel).not.toContain('export *');
  });

  test('refuses a cross-leaf name collision instead of choosing an owner by order', () => {
    const analysis = analyzeSpineSources({
      'alpha.d.ts': '/** First owner. */\nexport interface Shared { readonly alpha: true }',
      'beta.d.ts': '/** Second owner. */\nexport type Shared = { readonly beta: true };',
    });

    expect(analysis.collisions).toEqual(['Shared: alpha.d.ts, beta.d.ts']);
    expect(() => renderSpineBarrel(analysis)).toThrow(/collision Shared/u);
  });

  test('refuses an undocumented type and names its declaration leaf', () => {
    const analysis = analyzeSpineSources({
      'missing.d.ts': 'export interface MissingDocumentation { readonly value: number }',
    });

    expect(analysis.undocumented).toEqual(['missing.d.ts:MissingDocumentation']);
    expect(() => renderSpineSymbolDocumentation(analysis)).toThrow(/undocumented missing\.d\.ts:MissingDocumentation/u);
  });

  test('the repository root barrel and symbol index are exact projections of all 16 leaves', () => {
    const analysis = analyzeRepositorySpine(REPO_ROOT);
    expect(analysis.collisions).toEqual([]);
    expect(analysis.undocumented).toEqual([]);
    expect(analysis.symbols.length).toBeGreaterThan(300);
    expect(analysis.rejectedValues.length).toBeGreaterThan(100);
    expect(readFileSync(resolve(REPO_ROOT, 'packages/_spine/index.d.ts'), 'utf8')).toBe(renderSpineBarrel(analysis));
    expect(readFileSync(resolve(REPO_ROOT, 'packages/_spine/SYMBOLS.md'), 'utf8')).toBe(
      renderSpineSymbolDocumentation(analysis),
    );
  });
});
