import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  baselineFromTestFindings,
  scanTestConstitution,
  testConstitutionRegressions,
} from '../../../scripts/lib/test-constitution.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(source: string): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-test-constitution-'));
  roots.push(root);
  mkdirSync(join(root, 'tests', 'unit'), { recursive: true });
  writeFileSync(join(root, 'tests', 'unit', 'probe.test.ts'), source);
  return root;
}

describe('test constitution', () => {
  it('detects executable timing and source-byte coupling but ignores prose', () => {
    const root = fixture(`
      const prose = 'setTimeout Date.now readFileSync';
      setTimeout(() => {}, 10);
      Date.now();
      performance.now();
      new Date();
      readFileSync('packages/core/src/index.ts', 'utf8');
    `);
    expect(scanTestConstitution(root).map(({ kind }) => kind)).toEqual([
      'ambient-clock',
      'ambient-clock',
      'ambient-clock',
      'real-timer',
      'source-byte-oracle',
    ]);
  });

  it('reds on a planted new coupling and accepts removal', () => {
    const root = fixture('setTimeout(() => {}, 1);\n');
    const baseline = baselineFromTestFindings(scanTestConstitution(root));
    writeFileSync(join(root, 'tests', 'unit', 'probe.test.ts'), 'setTimeout(() => {}, 1);\nDate.now();\n');
    expect(testConstitutionRegressions(scanTestConstitution(root), baseline)).toEqual([
      { file: 'tests/unit/probe.test.ts', kind: 'ambient-clock', prior: 0, current: 1 },
    ]);
    writeFileSync(join(root, 'tests', 'unit', 'probe.test.ts'), 'expect(true).toBe(true);\n');
    expect(testConstitutionRegressions(scanTestConstitution(root), baseline)).toEqual([]);
  });
});
