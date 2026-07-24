/**
 * Benchmark subject qualification properties.
 *
 * The benchmark name is never evidence. These properties vary syntax around the
 * same semantic execution and plant plausible laundering attempts so the AST
 * producer must prove module ownership and measured reachability independently.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { BenchSubject, QualifiedBenchDistribution } from '../../packages/audit/src/benchmark-subject-facts.js';
import { qualifyBenchDistribution } from '../../packages/audit/src/benchmark-subject-facts.js';
import type { BenchSubjectIssueKind } from '../../packages/gauntlet/src/gates/bench-subjects.js';

const BENCH_FILE = 'tests/bench/subject.bench.ts';
const COLLECTOR_FILE = 'scripts/subject-collector.ts';
const NAME = 'Boundary.evaluate -- qualified subject';

function moduleSubject(overrides: Partial<BenchSubject> = {}): BenchSubject {
  return {
    role: 'sut',
    origin: { kind: 'module', specifier: '@liteship/core/authoring' },
    symbol: 'Boundary.evaluate',
    binding: 'Boundary.evaluate',
    ...overrides,
  };
}

function distribution(
  subjects: readonly BenchSubject[] = [moduleSubject()],
  execution?: QualifiedBenchDistribution['execution'],
): QualifiedBenchDistribution {
  return {
    name: NAME,
    file: BENCH_FILE,
    inputSize: 3,
    shape: 'boundary-thresholds',
    replicates: 5,
    subjects,
    ...(execution === undefined ? {} : { execution }),
  };
}

function qualify(source: string, value: QualifiedBenchDistribution = distribution(), collector?: string) {
  return qualifyBenchDistribution(value, (path) => {
    if (path === BENCH_FILE) return source;
    if (path === COLLECTOR_FILE) return collector;
    return undefined;
  });
}

function issueKinds(source: string, value = distribution(), collector?: string): readonly BenchSubjectIssueKind[] {
  return qualify(source, value, collector).issues.map((issue) => issue.kind);
}

function registration(callback: string): string {
  return `bench.add('${NAME}', ${callback});\n`;
}

const triviaArbitrary = fc.record({
  before: fc.constantFrom('', ' ', '\n', '/* before */\n'),
  between: fc.constantFrom(' ', '\n  ', ' /* stable */ '),
  semicolon: fc.constantFrom('', ';'),
});

describe('benchmark subject qualification properties', () => {
  it('accepts exact module subpaths and named-import aliases across harmless trivia refactors', () => {
    fc.assert(
      fc.property(triviaArbitrary, ({ before, between, semicolon }) => {
        const source = [
          `${before}import { Boundary as B } from '@liteship/core/authoring'${semicolon}`,
          `const invoke = () =>${between}B.evaluate({} as never, 1)${semicolon}`,
          registration('() => invoke()'),
        ].join('\n');
        const result = qualify(source, distribution([moduleSubject({ binding: 'B.evaluate' })]));
        expect(result.issues).toEqual([]);
        expect(result.qualifyingSutSubjects).toHaveLength(1);
      }),
      { numRuns: 40 },
    );
  });

  it('refuses a near-miss module subpath even when symbol and call spelling match', () => {
    const source =
      "import { Boundary } from '@liteship/core/runtime';\n" + registration('() => Boundary.evaluate({} as never, 1)');
    expect(issueKinds(source)).toContain('wrong-origin');
  });

  it('accepts a method destructured from the declared imported owner', () => {
    const source = [
      "import { Boundary } from '@liteship/core/authoring';",
      'const { evaluate } = Boundary;',
      registration('() => evaluate({} as never, 1)'),
    ].join('\n');
    const result = qualify(source, distribution([moduleSubject({ binding: 'evaluate' })]));
    expect(result.issues).toEqual([]);
  });

  it('refuses same-named destructuring from a foreign owner despite an unused valid import', () => {
    const source = [
      "import { Boundary } from '@liteship/core/authoring';",
      "import { OtherBoundary } from '@foreign/runtime';",
      'void Boundary;',
      'const { evaluate } = OtherBoundary;',
      registration('() => evaluate({} as never, 1)'),
    ].join('\n');
    expect(issueKinds(source, distribution([moduleSubject({ binding: 'evaluate' })]))).toContain('wrong-origin');
  });

  it('follows one bounded factory-return hop to the measured implementation', () => {
    const source = [
      "import { Boundary } from '@liteship/core/authoring';",
      'const makeRunner = () => () => Boundary.evaluate({} as never, 1);',
      'const runMeasured = makeRunner();',
      registration('() => runMeasured()'),
    ].join('\n');
    expect(qualify(source).issues).toEqual([]);
  });

  it('tracks destructured capabilities returned by a module-owned factory', () => {
    const source = [
      "import { SPSCRing } from '@liteship/worker';",
      'const { producer, consumer } = SPSCRing.createPair({ capacity: 2 });',
      registration('() => { producer.push(1); return consumer.pop(); }'),
    ].join('\n');
    const subjects: BenchSubject[] = [
      moduleSubject({
        origin: { kind: 'module', specifier: '@liteship/worker' },
        symbol: 'SPSCRing.createPair().producer.push',
        binding: 'producer.push',
      }),
      moduleSubject({
        origin: { kind: 'module', specifier: '@liteship/worker' },
        symbol: 'SPSCRing.createPair().consumer.pop',
        binding: 'consumer.pop',
      }),
    ];
    const result = qualify(source, distribution(subjects));
    expect(result.issues).toEqual([]);
    expect(result.qualifyingSutSubjects).toEqual(subjects);
  });

  it('tracks an instance returned through an immediately invoked setup closure', () => {
    const source = [
      "import { Compositor } from '@liteship/core/authoring';",
      'const compositor = (() => { const inner = Compositor.create(); return inner; })();',
      registration('() => compositor.compute()'),
    ].join('\n');
    const subject = moduleSubject({
      symbol: 'Compositor.compute',
      binding: 'compositor.compute',
    });
    expect(qualify(source, distribution([subject])).issues).toEqual([]);
  });

  it('does not treat an uninvoked helper containing the SUT call as callback reachability', () => {
    const source = [
      "import { Boundary } from '@liteship/core/authoring';",
      'const measured = () => Boundary.evaluate({} as never, 1);',
      'void measured;',
      registration('() => 1 + 1'),
    ].join('\n');
    expect(issueKinds(source)).toContain('uninvoked-subject');
  });

  it('accepts a collector only when the exported collector reaches the SUT and emits its result key', () => {
    const source = registration('() => 0');
    const collector = [
      "import { Boundary } from '@liteship/core/authoring';",
      'const sample = () => Boundary.evaluate({} as never, 1);',
      "export function collectSubject() { sample(); return { 'boundary.bytesPerOp': 4 }; }",
    ].join('\n');
    const value = distribution([moduleSubject()], {
      kind: 'collector',
      file: COLLECTOR_FILE,
      export: 'collectSubject',
      resultKey: 'boundary.bytesPerOp',
    });
    expect(qualify(source, value, collector).issues).toEqual([]);
  });

  it('reports both missing collector result-key evidence and an uninvoked subject in stable order', () => {
    const source = registration('() => 0');
    const collector = [
      "import { Boundary } from '@liteship/core/authoring';",
      'void Boundary;',
      "export function collectSubject() { return { 'other.key': 4 }; }",
    ].join('\n');
    const value = distribution([moduleSubject()], {
      kind: 'collector',
      file: COLLECTOR_FILE,
      export: 'collectSubject',
      resultKey: 'boundary.bytesPerOp',
    });
    expect(issueKinds(source, value, collector)).toEqual(['missing-result-key', 'uninvoked-subject']);
  });

  it('refuses ambiguous duplicate registrations instead of choosing a convenient callback', () => {
    const source =
      "import { Boundary } from '@liteship/core/authoring';\n" +
      registration('() => Boundary.evaluate({} as never, 1)') +
      registration('() => 0');
    expect(issueKinds(source)).toEqual(['ambiguous-registration']);
  });

  it('refuses name-only and no-op laundering even when the benchmark title names the exact symbol', () => {
    const source = "import { Boundary } from '@liteship/core/authoring';\nvoid Boundary;\n" + registration('() => {}');
    const result = qualify(source);
    expect(result.issues.map((issue) => issue.kind)).toEqual(['uninvoked-subject']);
    expect(result.qualifyingSutSubjects).toEqual([]);
  });

  it('keeps reachable baselines separate from product SUT assurance', () => {
    const baseline = moduleSubject({
      role: 'baseline',
      origin: { kind: 'intrinsic', name: 'JSON' },
      symbol: 'JSON.stringify',
      binding: 'JSON.stringify',
    });
    const source = registration('() => JSON.stringify({ value: 1 })');
    const result = qualify(source, distribution([baseline]));
    expect(result.issues).toEqual([]);
    expect(result.reachableSubjects).toEqual([baseline]);
    expect(result.qualifyingSutSubjects).toEqual([]);
  });

  it('does not let an intrinsic marked as SUT qualify as product implementation evidence', () => {
    const intrinsicSut = moduleSubject({
      origin: { kind: 'intrinsic', name: 'JSON' },
      symbol: 'JSON.stringify',
      binding: 'JSON.stringify',
    });
    const result = qualify(registration('() => JSON.stringify({ value: 1 })'), distribution([intrinsicSut]));
    expect(result.issues).toEqual([]);
    expect(result.qualifyingSutSubjects).toEqual([]);
  });

  it('treats an explicitly executable callback as reachable but refuses an empty callback', () => {
    const callbackSubject = moduleSubject({
      origin: { kind: 'file', path: BENCH_FILE },
      symbol: 'callback workload',
      binding: '<callback>',
    });
    expect(qualify(registration('() => 41 + 1'), distribution([callbackSubject])).issues).toEqual([]);
    expect(issueKinds(registration('() => {}'), distribution([callbackSubject]))).toContain('uninvoked-subject');
  });

  it('produces byte-stable issue ordering for repeated qualification of malformed contracts', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), (runs) => {
        const subjects = [
          moduleSubject({ binding: 'Boundary.missingA' }),
          moduleSubject({ binding: 'Boundary.missingB' }),
        ];
        const source = "import { Boundary } from '@liteship/core/authoring';\n" + registration('() => 0');
        const expected = JSON.stringify(qualify(source, distribution(subjects)));
        for (let index = 0; index < runs; index++) {
          expect(JSON.stringify(qualify(source, distribution(subjects)))).toBe(expected);
        }
      }),
      { numRuns: 25 },
    );
  });

  it('is invariant to comments, line endings, semicolons, and wrapper declaration form', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('\n', '\r\n'),
        fc.constantFrom(
          'const wrapper = () => Boundary.evaluate({} as never, 1);',
          'function wrapper() { return Boundary.evaluate({} as never, 1); }',
        ),
        (newline, wrapper) => {
          const source = [
            "import { Boundary } from '@liteship/core/authoring';",
            '/* an inert refactor comment */',
            wrapper,
            registration('() => wrapper()'),
          ].join(newline);
          expect(qualify(source).issues).toEqual([]);
        },
      ),
      { numRuns: 30 },
    );
  });
});
