import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildFlakeEvidence } from '../../scripts/lib/flake-evidence.js';
import type { FlakeTarget } from '../../scripts/test-flake-targets.js';

const TARGET: FlakeTarget = {
  path: 'tests/unit/property-target.test.ts',
  kind: 'node',
  owner: 'packages/property-owner/src',
  provingScar: 'a passing suffix cannot erase an earlier failed observation',
  remediation: 'repair the owner and rerun the exact observation schedule',
};

describe('flake evidence properties', () => {
  it('never turns any history containing a failure into a pass', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }), (passes) => {
        const observations = passes.map((pass, index) => ({
          target: TARGET.path,
          iteration: index + 1,
          verdict: pass ? ('pass' as const) : ('fail' as const),
          exitCode: pass ? 0 : 1,
        }));
        const evidence = buildFlakeEvidence({
          targets: [TARGET],
          observations,
          firstSha: 'a'.repeat(40),
          lastSha: 'a'.repeat(40),
          observedOn: '2026-07-24',
          expires: '2026-07-31',
        });
        expect(evidence.verdict).toBe(passes.every(Boolean) ? 'pass' : 'fail');
        expect(evidence.failures).toBe(passes.filter((pass) => !pass).length);
        expect(evidence.observedFailureRate).toBe(evidence.failures / evidence.attempts);
      }),
    );
  });
});
