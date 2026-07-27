/** Metamorphic laws for affected-test execution and durable failure evidence. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { affectedVitestExecution } from '../../scripts/lib/affected-test-execution.js';

const testPath = fc
  .tuple(fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/u), fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/u))
  .map(([group, name]) => `tests/unit/${group}/${name}.test.ts`);

describe('affected test execution projection', () => {
  it('full mode runs the complete Node configuration without leaking selected paths', () => {
    fc.assert(
      fc.property(fc.uniqueArray(testPath, { minLength: 1, maxLength: 12 }), (files) => {
        const execution = affectedVitestExecution('full', files);
        expect(execution.args).toEqual(['exec', 'vitest', 'run', '--config', 'vitest.config.ts']);
        expect(files.every((file) => !execution.args.includes(file))).toBe(true);
      }),
      { seed: 0xaffec7, numRuns: 100 },
    );
  });

  it('selected mode preserves the planner order and exact path set', () => {
    fc.assert(
      fc.property(fc.uniqueArray(testPath, { minLength: 1, maxLength: 12 }), (files) => {
        const execution = affectedVitestExecution('focused', files);
        expect(execution.args.slice(5)).toEqual(files);
      }),
      { seed: 0xaffec8, numRuns: 100 },
    );
  });

  it('JUnit mode adds both reporters and the exact caller-owned artifact path', () => {
    fc.assert(
      fc.property(testPath, (file) => {
        const junitPath = `reports/${file.split('/').at(-1)}.xml`;
        const execution = affectedVitestExecution('focused', [file], junitPath);
        expect(execution.junitPath).toBe(junitPath);
        expect(execution.args).toEqual([
          'exec',
          'vitest',
          'run',
          '--config',
          'vitest.config.ts',
          file,
          '--reporter=default',
          '--reporter=junit',
          `--outputFile.junit=${junitPath}`,
        ]);
      }),
      { seed: 0xaffec9, numRuns: 100 },
    );
  });

  it('refuses a vacuous focused selection and blank evidence path', () => {
    expect(() => affectedVitestExecution('focused', [])).toThrow(/at least one selected test/u);
    expect(() => affectedVitestExecution('focused', ['tests/unit/probe.test.ts'], '')).toThrow(/must not be blank/u);
    expect(() => affectedVitestExecution('full', [], '   ')).toThrow(/must not be blank/u);
  });
});
