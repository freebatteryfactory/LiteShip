/** Cross-platform argv and evidence laws for the affected Node-test authority. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { affectedVitestExecution } from '../../scripts/lib/affected-test-execution.js';

const segment = fc.stringMatching(/^[a-z][a-z0-9_.-]{0,20}$/u);
const testPath = fc
  .tuple(fc.constantFrom('unit', 'property', 'component', 'integration', 'regression', 'fuzz'), segment, segment)
  .map(([lane, owner, name]) => `tests/${lane}/${owner}/${name}.test.ts`);
const junitPath = fc.tuple(segment, segment).map(([directory, name]) => `reports/${directory}/${name}.xml`);

function fixedPrefix(args: readonly string[]): readonly string[] {
  return args.slice(0, 5);
}

describe('affected Vitest execution authority', () => {
  it('always invokes Vitest directly through argv rather than an opaque package script', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('full' as const, 'focused' as const),
        fc.uniqueArray(testPath, { minLength: 1, maxLength: 40 }),
        (mode, files) => {
          const execution = affectedVitestExecution(mode, files);
          expect(fixedPrefix(execution.args)).toEqual(['exec', 'vitest', 'run', '--config', 'vitest.config.ts']);
          expect(execution.args).not.toContain('test');
          expect(execution.args).not.toContain('test:affected');
          expect(execution.args).not.toContain('--runInBand');
        },
      ),
      { seed: 0xaffe_c101, numRuns: 200 },
    );
  });

  it('full authority is invariant under arbitrary focused-plan test permutations', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(testPath, { minLength: 1, maxLength: 30 }),
        fc.uniqueArray(testPath, { minLength: 1, maxLength: 30 }),
        (left, right) => {
          expect(affectedVitestExecution('full', left)).toEqual(affectedVitestExecution('full', right));
          expect(affectedVitestExecution('full', left).args).toEqual([
            'exec',
            'vitest',
            'run',
            '--config',
            'vitest.config.ts',
          ]);
        },
      ),
      { seed: 0xaffe_c102, numRuns: 150 },
    );
  });

  it('focused authority preserves every selected file exactly once and in planner order', () => {
    fc.assert(
      fc.property(fc.uniqueArray(testPath, { minLength: 1, maxLength: 50 }), (files) => {
        const execution = affectedVitestExecution('focused', files);
        expect(execution.args.slice(5)).toEqual(files);
        for (const file of files) {
          expect(execution.args.filter((argument) => argument === file)).toHaveLength(1);
        }
      }),
      { seed: 0xaffe_c103, numRuns: 200 },
    );
  });

  it('adding JUnit evidence never changes the selected test prefix', () => {
    fc.assert(
      fc.property(fc.uniqueArray(testPath, { minLength: 1, maxLength: 30 }), junitPath, (files, report) => {
        const plain = affectedVitestExecution('focused', files);
        const durable = affectedVitestExecution('focused', files, report);
        expect(durable.args.slice(0, plain.args.length)).toEqual(plain.args);
        expect(durable.args.slice(plain.args.length)).toEqual([
          '--reporter=default',
          '--reporter=junit',
          `--outputFile.junit=${report}`,
        ]);
      }),
      { seed: 0xaffe_c104, numRuns: 180 },
    );
  });

  it('retains the normal terminal reporter whenever durable evidence is requested', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('full' as const, 'focused' as const),
        fc.uniqueArray(testPath, { minLength: 1, maxLength: 20 }),
        junitPath,
        (mode, files, report) => {
          const execution = affectedVitestExecution(mode, files, report);
          expect(execution.args).toContain('--reporter=default');
          expect(execution.args).toContain('--reporter=junit');
          expect(execution.args).toContain(`--outputFile.junit=${report}`);
          expect(execution.junitPath).toBe(report);
        },
      ),
      { seed: 0xaffe_c105, numRuns: 180 },
    );
  });

  it('does not synthesize an evidence field or reporter flags when no path was requested', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('full' as const, 'focused' as const),
        fc.uniqueArray(testPath, { minLength: 1, maxLength: 20 }),
        (mode, files) => {
          const execution = affectedVitestExecution(mode, files);
          expect('junitPath' in execution).toBe(false);
          expect(execution.args.some((argument) => argument.startsWith('--reporter'))).toBe(false);
          expect(execution.args.some((argument) => argument.startsWith('--outputFile'))).toBe(false);
        },
      ),
      { seed: 0xaffe_c106, numRuns: 180 },
    );
  });

  it('keeps shell-significant but valid filename characters inside one argv element', () => {
    const hostilePath = fc
      .tuple(segment, fc.constantFrom('space name', 'dollar$name', 'paren(name)', 'semi;name', 'amp&name'))
      .map(([owner, name]) => `tests/unit/${owner}/${name}.test.ts`);
    fc.assert(
      fc.property(hostilePath, (file) => {
        const execution = affectedVitestExecution('focused', [file]);
        expect(execution.args.at(5)).toBe(file);
        expect(execution.args).toHaveLength(6);
      }),
      { seed: 0xaffe_c107, numRuns: 120 },
    );
  });

  it('refuses the only two vacuous evidence projections', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s{0,20}$/u), (blank) => {
        expect(() => affectedVitestExecution('focused', [])).toThrow(/at least one selected test/u);
        expect(() => affectedVitestExecution('focused', ['tests/unit/probe.test.ts'], blank)).toThrow(
          /JUnit path must not be blank/u,
        );
      }),
      { seed: 0xaffe_c108, numRuns: 40 },
    );
  });

  it('is deterministic for identical mode, path order, and evidence path', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('full' as const, 'focused' as const),
        fc.uniqueArray(testPath, { minLength: 1, maxLength: 30 }),
        junitPath,
        (mode, files, report) => {
          const first = affectedVitestExecution(mode, files, report);
          const second = affectedVitestExecution(mode, [...files], `${report}`);
          expect(second).toEqual(first);
          expect(Object.keys(second).sort()).toEqual(['args', 'junitPath']);
        },
      ),
      { seed: 0xaffe_c109, numRuns: 180 },
    );
  });
});
