/** Adversarial properties for the AST-backed deterministic-test constitution. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  baselineFromTestFindings,
  scanTestConstitution,
  testConstitutionRegressions,
  type TestDebtKind,
} from '../../scripts/lib/test-constitution.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(source: string, name = 'probe.test.ts'): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-constitution-model-'));
  roots.push(root);
  const directory = join(root, 'tests', 'property');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, name), source);
  return root;
}

function kinds(root: string): readonly TestDebtKind[] {
  return scanTestConstitution(root).map((finding) => finding.kind);
}

const identifier = fc.stringMatching(/^[a-z][a-zA-Z0-9]{0,14}$/u);
const literal = fc.stringMatching(/^[a-z][a-zA-Z0-9 _-]{0,23}$/u);

describe('semantic file IO classification', () => {
  it('does not classify parser, verifier, digest, or decoder inputs as source-byte oracles', () => {
    const semanticConsumers = [
      (name: string) => `JSON.parse(readFileSync('${name}.json', 'utf8'));`,
      (name: string) => `parseReceipt(readFileSync('${name}.json', 'utf8'));`,
      (name: string) => `verifyManifest(readFileSync('${name}.json', 'utf8'));`,
      (name: string) => `createHash('sha256').update(readFileSync('${name}.json', 'utf8')).digest('hex');`,
      (name: string) => `compileProbe(readFileSync('${name}.ts', 'utf8'));`,
      (name: string) => `decodeArtifact(readFileSync('${name}.bin'));`,
    ];
    fc.assert(
      fc.property(identifier, fc.shuffledSubarray(semanticConsumers, { minLength: 1 }), (name, consumers) => {
        const root = fixture(consumers.map((consumer) => consumer(name)).join('\n'));
        expect(kinds(root)).toEqual([]);
      }),
      { seed: 0x7e57_c001, numRuns: 120 },
    );
  });

  it('does not classify physical byte equality as implementation-text coupling', () => {
    fc.assert(
      fc.property(identifier, identifier, (left, right) => {
        const root = fixture(`
          const leftBytes = readFileSync('${left}.tgz');
          const rightBytes = readFileSync('${right}.tgz');
          expect(leftBytes).toEqual(rightBytes);
        `);
        expect(kinds(root)).toEqual([]);
      }),
      { seed: 0x7e57_c002, numRuns: 100 },
    );
  });

  it('does not classify comments, prose, property names, or unrelated local strings', () => {
    fc.assert(
      fc.property(literal, (text) => {
        const root = fixture(`
          // readFileSync('${text}', 'utf8').includes('implementation')
          const prose = "readFileSync setTimeout Date.now performance.now";
          const model = { readFileSync: '${text}', includes: () => true };
          expect(prose.length + model.readFileSync.length).toBeGreaterThan(0);
        `);
        expect(kinds(root)).toEqual([]);
      }),
      { seed: 0x7e57_c003, numRuns: 120 },
    );
  });
});

describe('raw implementation-text classification', () => {
  const operation = fc.constantFrom(
    'includes',
    'indexOf',
    'match',
    'matchAll',
    'replace',
    'replaceAll',
    'search',
    'split',
    'startsWith',
    'endsWith',
  );

  it('classifies every raw string operation over UTF-8 file text', () => {
    fc.assert(
      fc.property(identifier, operation, literal, (binding, method, needle) => {
        const argument = method === 'match' || method === 'matchAll' ? `/${needle}/u` : `'${needle}'`;
        const root = fixture(`
          const ${binding} = readFileSync('packages/core/src/index.ts', 'utf8');
          ${binding}.${method}(${argument});
        `);
        expect(kinds(root)).toEqual(['source-byte-oracle']);
      }),
      { seed: 0x7e57_c004, numRuns: 240 },
    );
  });

  it('classifies raw-text matchers but not semantic equality of parsed values', () => {
    fc.assert(
      fc.property(identifier, fc.constantFrom('toContain', 'toMatch'), literal, (binding, matcher, needle) => {
        const expected = matcher === 'toMatch' ? `/${needle}/u` : `'${needle}'`;
        const root = fixture(`
          const ${binding} = readFileSync('packages/core/src/index.ts', 'utf8');
          expect(${binding}).${matcher}(${expected});
          expect(JSON.parse(${binding})).toEqual({ admitted: true });
        `);
        expect(kinds(root)).toEqual(['source-byte-oracle']);
      }),
      { seed: 0x7e57_c005, numRuns: 160 },
    );
  });

  it('follows any number of simple binding aliases', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 8 }), literal, (depth, needle) => {
        const aliases = Array.from({ length: depth }, (_, index) => {
          const prior = index === 0 ? 'raw' : `alias${index - 1}`;
          return `const alias${index} = ${prior};`;
        });
        const receiver = depth === 0 ? 'raw' : `alias${depth - 1}`;
        const root = fixture(`
          const raw = readFileSync('workflow.yml', 'utf8');
          ${aliases.join('\n')}
          expect(${receiver}.includes('${needle}')).toBe(true);
        `);
        expect(kinds(root)).toEqual(['source-byte-oracle']);
      }),
      { seed: 0x7e57_c006, numRuns: 120 },
    );
  });

  it('follows arrow and function-declaration reader helpers', () => {
    fc.assert(
      fc.property(fc.boolean(), identifier, literal, (arrow, binding, needle) => {
        const helper = arrow
          ? `const readText = (path: string) => readFileSync(path, 'utf8');`
          : `function readText(path: string) { return readFileSync(path, 'utf8'); }`;
        const root = fixture(`
          ${helper}
          const ${binding} = readText('packages/core/src/index.ts');
          expect(${binding}).toContain('${needle}');
        `);
        expect(kinds(root)).toEqual(['source-byte-oracle']);
      }),
      { seed: 0x7e57_c007, numRuns: 120 },
    );
  });

  it('does not classify Buffer operations when no textual encoding was requested', () => {
    fc.assert(
      fc.property(operation, (method) => {
        const root = fixture(`
          const bytes = readFileSync('artifact.bin');
          bytes.${method}(0);
        `);
        expect(kinds(root)).toEqual([]);
      }),
      { seed: 0x7e57_c008, numRuns: 80 },
    );
  });
});

describe('clock and scheduler classification', () => {
  it('counts each executable ambient clock and timer independently', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (timers, dateNow, performanceNow) => {
          const source = [
            ...Array.from({ length: timers }, () => 'setTimeout(() => {}, 1);'),
            ...Array.from({ length: dateNow }, () => 'Date.now();'),
            ...Array.from({ length: performanceNow }, () => 'performance.now();'),
          ].join('\n');
          const findings = scanTestConstitution(fixture(source));
          expect(findings.filter((finding) => finding.kind === 'real-timer')).toHaveLength(timers);
          expect(findings.filter((finding) => finding.kind === 'ambient-clock')).toHaveLength(dateNow + performanceNow);
        },
      ),
      { seed: 0x7e57_c009, numRuns: 100 },
    );
  });

  it('counts zero-argument Date construction but not injected or explicit dates', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 6 }), fc.integer({ min: 0, max: 6 }), (ambient, explicit) => {
        const source = [
          ...Array.from({ length: ambient }, () => 'new Date();'),
          ...Array.from({ length: explicit }, (_, index) => `new Date(${index});`),
        ].join('\n');
        expect(kinds(fixture(source)).filter((kind) => kind === 'ambient-clock')).toHaveLength(ambient);
      }),
      { seed: 0x7e57_c00a, numRuns: 100 },
    );
  });
});

describe('ratchet behavior', () => {
  it('is line-number independent and only rejects increased per-file debt', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 8 }), fc.integer({ min: 0, max: 8 }), (paddingBefore, paddingAfter) => {
        const root = fixture(`${'\n'.repeat(paddingBefore)}Date.now();\n`);
        const baseline = baselineFromTestFindings(scanTestConstitution(root));
        const path = join(root, 'tests', 'property', 'probe.test.ts');
        writeFileSync(path, `${'\n'.repeat(paddingAfter)}Date.now();\n`);
        expect(testConstitutionRegressions(scanTestConstitution(root), baseline)).toEqual([]);
        writeFileSync(path, `Date.now();\nDate.now();\n`);
        expect(testConstitutionRegressions(scanTestConstitution(root), baseline)).toEqual([
          {
            file: 'tests/property/probe.test.ts',
            kind: 'ambient-clock',
            prior: 1,
            current: 2,
          },
        ]);
      }),
      { seed: 0x7e57_c00b, numRuns: 80 },
    );
  });

  it('accepts debt removal without requiring the historical location to survive', () => {
    fc.assert(
      fc.property(fc.constantFrom('Date.now();', 'setTimeout(() => {}, 1);'), (debt) => {
        const root = fixture(debt);
        const baseline = baselineFromTestFindings(scanTestConstitution(root));
        writeFileSync(join(root, 'tests', 'property', 'probe.test.ts'), 'expect(true).toBe(true);\n');
        expect(testConstitutionRegressions(scanTestConstitution(root), baseline)).toEqual([]);
      }),
      { seed: 0x7e57_c00c, numRuns: 40 },
    );
  });
});
