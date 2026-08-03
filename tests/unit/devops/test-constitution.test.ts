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

function fixture(source: string, lane = 'unit'): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-test-constitution-'));
  roots.push(root);
  mkdirSync(join(root, 'tests', lane), { recursive: true });
  writeFileSync(join(root, 'tests', lane, 'probe.test.ts'), source);
  return root;
}

describe('test constitution', () => {
  it('detects executable timing and raw source assertions but ignores prose and semantic parsing', () => {
    const root = fixture(`
      const prose = 'setTimeout Date.now readFileSync';
      setTimeout(() => {}, 10);
      Date.now();
      performance.now();
      new Date();
      const raw = readFileSync('packages/core/src/index.ts', 'utf8');
      JSON.parse(readFileSync('fixture.json', 'utf8'));
      verifyReceipt(readFileSync('receipt.json', 'utf8'));
      expect(raw).toContain('implementation spelling');
    `);
    expect(scanTestConstitution(root).map(({ kind }) => kind)).toEqual([
      'ambient-clock',
      'ambient-clock',
      'ambient-clock',
      'real-timer',
      'source-byte-oracle',
    ]);
  });

  describe('unanchored-text-slice', () => {
    it('flags a slice between two unguarded indexOf anchors', () => {
      const root = fixture(`
        const source = 'before START subject END after';
        const subject = source.slice(source.indexOf('START'), source.indexOf('END'));
        expect(subject).toContain('subject');
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unanchored-text-slice');
    });

    it('does not flag a slice whose variable anchors are -1-guarded', () => {
      const root = fixture(`
        const source = 'before START subject END after';
        const start = source.indexOf('START');
        const end = source.indexOf('END');
        expect(start).toBeGreaterThanOrEqual(0);
        if (end === -1) throw new Error('missing END');
        const subject = source.slice(start, end);
        expect(subject).toContain('subject');
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('unanchored-text-slice');
    });

    it('does not mistake arithmetic involving -1 for a sentinel guard', () => {
      const root = fixture(`
        const source = 'before START subject END after';
        const start = source.indexOf('START');
        const end = source.indexOf('END');
        const bogus = start + -1;
        expect(end).toBeGreaterThanOrEqual(0);
        const subject = source.slice(start, end);
        expect([bogus, subject]).toHaveLength(2);
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unanchored-text-slice');
    });

    it('does not let a guard after the slice excuse an unanchored oracle', () => {
      const root = fixture(`
        const source = 'before START subject END after';
        const start = source.indexOf('START');
        const end = source.indexOf('END');
        const subject = source.slice(start, end);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThanOrEqual(0);
        expect(subject).toContain('subject');
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unanchored-text-slice');
    });

    it('does not flag a slice with literal bounds', () => {
      const root = fixture(`
        const source = 'subject';
        expect(source.substring(0, 4)).toBe('subj');
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('unanchored-text-slice');
    });
  });

  describe('ambient-entropy-spy', () => {
    it('flags vi.spyOn(Math, "random")', () => {
      const root = fixture(`vi.spyOn(Math, 'random').mockReturnValue(0.5);`);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('ambient-entropy-spy');
    });

    it('flags vi.stubGlobal("Math", ...)', () => {
      const root = fixture(`vi.stubGlobal('Math', { ...Math, random: () => 0.5 });`);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('ambient-entropy-spy');
    });

    it('does not flag seededRng usage', () => {
      const root = fixture(`const random = seededRng(0x5eed); expect(random()).toBeGreaterThanOrEqual(0);`);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('ambient-entropy-spy');
    });
  });

  describe('unseeded-property', () => {
    it('flags an fc.assert property with no options', () => {
      const root = fixture(`fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)));`);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('flags an fc.assert property that pins only numRuns', () => {
      const root = fixture(`
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), { numRuns: 40 });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('flags an fc.assert property that pins only seed', () => {
      const root = fixture(`
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), { seed: 0x5eed });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('flags an unseeded handwritten fuzz property', () => {
      const root = fixture(
        `fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), { numRuns: 40 });`,
        'fuzz',
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toEqual(['unseeded-property']);
    });

    it('fails closed when a spread can override the pinned options', () => {
      const root = fixture(`
        const options = { seed: 7 };
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), {
          seed: 0x5eed,
          numRuns: 40,
          ...options,
        });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('admits an fc.assert property that pins both seed and numRuns', () => {
      const root = fixture(`
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), {
          seed: 0x5eed,
          numRuns: 40,
        });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('unseeded-property');
    });

    // Naming the keys was never the claim — the claim is that a failure can be
    // REPLAYED. Each of these names both keys and proves nothing.
    it('flags numRuns: 0 — a property that executes zero cases is not evidence', () => {
      const root = fixture(`
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), { seed: 0x5eed, numRuns: 0 });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('flags a negative numRuns', () => {
      const root = fixture(`
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), { seed: 0x5eed, numRuns: -1 });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('flags a seed that is different on every run', () => {
      const root = fixture(`
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), {
          seed: Date.now(),
          numRuns: 40,
        });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('flags a run count derived from runtime data', () => {
      const root = fixture(`
        const names = collectNames();
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), {
          seed: 0x5eed,
          numRuns: names.length * 2,
        });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    it('flags options reached through a REBINDABLE name', () => {
      // `let` is refused deliberately: a rebindable name is not a constant,
      // however constant its first assignment happens to look.
      const root = fixture(`
        let RUNS = { seed: 0x5eed, numRuns: 40 };
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), RUNS);
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('unseeded-property');
    });

    // The other direction: the tightening must not start judging spellings that
    // are fully replayable. Each of these was counted as debt before.
    it('admits an options object reached through a const binding', () => {
      const root = fixture(`
        const RUNS = { seed: 0xd311, numRuns: 72 } as const;
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), RUNS);
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('unseeded-property');
    });

    it('admits a seed built from a constant expression', () => {
      const root = fixture(`
        const SEED = 0x5eed;
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), {
          seed: SEED ^ 0x4e414e,
          numRuns: 300,
        });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('unseeded-property');
    });

    it('admits const-bound shorthand options and a single-case campaign', () => {
      const root = fixture(`
        const seed = 0x5eed;
        const numRuns = 1;
        fc.assert(fc.property(fc.integer(), (value) => Number.isInteger(value)), { seed, numRuns });
      `);
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('unseeded-property');
    });
  });

  describe('generated-payload-delimiter', () => {
    it('flags an fc.string() payload interpolated inside a block comment', () => {
      const root = fixture(
        [
          'fc.assert(fc.property(fc.string(), (payload) => {',
          '  const source = `/* ${payload} */`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });

    it('flags a generator payload interpolated inside an HTML comment', () => {
      const root = fixture(
        [
          'fc.assert(fc.property(fc.string(), (payload) => {',
          '  const source = `<!-- ${payload} -->`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });

    it('flags a generator payload interpolated inside a line comment', () => {
      const root = fixture(
        [
          'fc.assert(fc.property(fc.string(), (payload) => {',
          '  const source = `// ${payload}\\nconst value = true;`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });

    it('flags a generator payload interpolated inside a raw nested template', () => {
      const root = fixture(
        [
          'fc.assert(fc.property(fc.string(), (payload) => {',
          '  const source = `const nested = \\`${payload}\\`;`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });

    it('does not flag a literal interpolated into a comment', () => {
      const root = fixture(
        "const literal = 'fixed'; const source = `/* ${literal} */`; expect(source).toContain(literal);",
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('generated-payload-delimiter');
    });

    it('does not let a same-named literal in another scope sanitize a generated payload', () => {
      const root = fixture(
        [
          "const payload = 'fixed';",
          'fc.assert(fc.property(fc.string(), (payload) => {',
          '  const source = `/* ${payload} */`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });

    it('does not flag a generator payload interpolated into a plain string', () => {
      const root = fixture(
        [
          'fc.assert(fc.property(fc.string(), (payload) => {',
          '  const source = `prefix ${payload} suffix`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('generated-payload-delimiter');
    });

    it('admits a payload whose arbitrary removes the active closing delimiter', () => {
      const root = fixture(
        [
          "const safePayload = fc.string().map((payload) => payload.replaceAll('*/', '* /'));",
          'fc.assert(fc.property(safePayload, (payload) => {',
          '  const source = `/* ${payload} */`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('generated-payload-delimiter');
    });

    it('does not admit a sanitizer whose later replacement restores the closer', () => {
      const root = fixture(
        [
          "const unsafePayload = fc.string().map((payload) => payload.replaceAll('*/', 'safe').replaceAll('safe', '*/'));",
          'fc.assert(fc.property(unsafePayload, (payload) => {',
          '  const source = `/* ${payload} */`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });

    it('does not admit later replacements that reconstruct a multi-character closer', () => {
      const root = fixture(
        [
          "const unsafePayload = fc.string().map((payload) => payload.replaceAll('*/', 'AB').replaceAll('A', '*').replaceAll('B', '/'));",
          'fc.assert(fc.property(unsafePayload, (payload) => {',
          '  const source = `/* ${payload} */`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });

    it('admits a finite generator domain when no value can close the delimiter', () => {
      const root = fixture(
        [
          "fc.assert(fc.property(fc.constantFrom('alpha', 'beta'), (payload) => {",
          '  const source = `// ${payload}\\nconst value = true;`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).not.toContain('generated-payload-delimiter');
    });

    it('fails closed on a stringMatching hex escape that can generate a line break', () => {
      const root = fixture(
        [
          'fc.assert(fc.property(fc.stringMatching(/^[\\x0a]*$/), (payload) => {',
          '  const source = `// ${payload}\\nconst value = true;`;',
          '  expect(source).toContain(payload);',
          '}));',
        ].join('\n'),
      );
      expect(scanTestConstitution(root).map(({ kind }) => kind)).toContain('generated-payload-delimiter');
    });
  });

  it('follows raw-text aliases and reader helpers into brittle string operations', () => {
    const root = fixture(`
      const read = (path: string) => readFileSync(path, 'utf8');
      const original = read('packages/core/src/index.ts');
      const alias = original;
      expect(alias.indexOf('first')).toBeLessThan(alias.indexOf('second'));
      expect(alias).toMatch(/private implementation/u);
    `);
    expect(scanTestConstitution(root).map(({ kind }) => kind)).toEqual([
      'source-byte-oracle',
      'source-byte-oracle',
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
