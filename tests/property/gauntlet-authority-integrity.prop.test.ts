// PROVES: INV-GATE-AUTHORITY-INTEGRITY
/** Property proof that gate qualification is fail-closed on every proof axis. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { defineGate, finding, memoryContext, runGates, type Gate } from '@liteship/gauntlet';

function qualificationGate(redCaught: boolean, greenClean: boolean, mutationKilled: boolean): Gate {
  const semanticRun: Gate['run'] = (context) =>
    context.readFile('fixture.ts') === 'bad'
      ? [
          finding({
            ruleId: 'gauntlet/qualification-law',
            severity: 'error',
            level: 'L4',
            title: 'Bad fixture',
            detail: 'The fixture is bad.',
          }),
        ]
      : [];
  return defineGate({
    id: 'gauntlet/qualification-law',
    level: 'L4',
    describe: 'Property fixture for the authority-integrity law.',
    run: semanticRun,
    fixtures: {
      red: {
        name: 'red fixture',
        context: memoryContext({ 'fixture.ts': redCaught ? 'bad' : 'good' }, '/red'),
      },
      green: {
        name: 'green fixture',
        context: memoryContext({ 'fixture.ts': greenClean ? 'good' : 'bad' }, '/green'),
      },
      mutation: {
        describe: mutationKilled ? 'mutant misses every fixture' : 'mutant evades both fixtures',
        mutate: (gate) => ({
          ...gate,
          run: mutationKilled
            ? () => []
            : (context) =>
                context.repoRoot === '/red'
                  ? [
                      finding({
                        ruleId: gate.id,
                        severity: 'error',
                        level: gate.level,
                        title: 'Evading mutant',
                        detail: 'This mutant passes the authored red and green fixtures.',
                      }),
                    ]
                  : [],
        }),
      },
    },
  });
}

describe('gate authority-integrity law', () => {
  it('blocks iff any qualification axis fails and identifies the exact failed axes', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.boolean(), (redCaught, greenClean, mutationKilled) => {
        const result = runGates(
          [qualificationGate(redCaught, greenClean, mutationKilled)],
          memoryContext({ 'fixture.ts': 'good' }, '/real'),
        );
        const integrity = result.findings.filter((finding) => finding.ruleId === 'gauntlet/authority-integrity');
        const qualified = redCaught && greenClean && mutationKilled;
        expect(result.blocked).toBe(!qualified);
        expect(integrity).toHaveLength(qualified ? 0 : 1);
        if (!qualified) {
          const detail = integrity[0]!.detail;
          expect(detail.includes('red fixture did not prove detection')).toBe(!redCaught);
          expect(detail.includes('green fixture was not clean')).toBe(!greenClean);
          expect(detail.includes('mutation survived')).toBe(!mutationKilled);
        }
      }),
      { numRuns: 80 },
    );
  });
});
