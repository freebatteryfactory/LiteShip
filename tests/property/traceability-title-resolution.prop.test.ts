/**
 * Property proof for the traceability title resolver. The ledger must identify one
 * concrete nested Vitest test even when another suite reuses the same leaf title;
 * changing any path segment must deterministically break the proof edge.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildTraceabilityFacts } from '../../packages/cli/src/lib/traceability.js';

let root = '';
const NOW = new Date('2026-07-26T00:00:00.000Z');
const titlePart = fc.stringMatching(/^[a-z][a-z0-9 -]{0,15}$/);

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'liteship-trace-title-prop-'));
  mkdirSync(join(root, 'traceability'), { recursive: true });
  mkdirSync(join(root, 'tests', 'property'), { recursive: true });
  writeFileSync(
    join(root, 'traceability', 'invariants.yaml'),
    'invariants:\n  - id: INV-TITLE\n    law: "the nested title resolves"\n    level: L4\n    category: assurance\n',
    'utf8',
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeCorpus(leftSuite: string, rightSuite: string, leaf: string): void {
  writeFileSync(
    join(root, 'tests/property/title.test.ts'),
    [
      '// PROVES: INV-TITLE',
      "import { describe, it } from 'vitest';",
      `describe(${JSON.stringify(leftSuite)}, () => { it(${JSON.stringify(leaf)}, () => {}); });`,
      `describe(${JSON.stringify(rightSuite)}, () => { it(${JSON.stringify(leaf)}, () => {}); });`,
    ].join('\n'),
    'utf8',
  );
}

function writeLedger(title: string): void {
  writeFileSync(
    join(root, 'traceability', 'testing-ledger.yaml'),
    `traces:\n  - id: INV-TITLE\n    tests:\n      - ${JSON.stringify(`tests/property/title.test.ts::${title}`)}\n`,
    'utf8',
  );
}

describe('traceability nested-title properties', () => {
  it('resolves one generated full path and rejects a generated rename despite a duplicate leaf', () => {
    fc.assert(
      fc.property(
        fc.tuple(titlePart, titlePart).filter(([left, right]) => left !== right),
        titlePart,
        ([leftSuite, rightSuite], leaf) => {
          writeCorpus(leftSuite, rightSuite, leaf);
          writeLedger(`${leftSuite} > ${leaf}`);
          const resolved = buildTraceabilityFacts(root, NOW);
          expect(resolved.divergences).toEqual([]);
          expect(resolved.invariants[0]!.state._tag).toBe('proven');

          writeLedger(`${leftSuite} renamed > ${leaf}`);
          const renamed = buildTraceabilityFacts(root, NOW);
          expect(renamed.invariants[0]!.state._tag).toBe('untraced');
          expect(renamed.divergences.some((divergence) => divergence.kind === 'unbacked-claim')).toBe(true);
        },
      ),
      { numRuns: 60 },
    );
  });
});
