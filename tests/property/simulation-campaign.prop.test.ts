/** Property proof for the simulation campaign fact fold. @module */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { simulationDeterminismGate, type GateContext, type ScenarioReplayFact } from '@liteship/gauntlet';

const RUNS = { numRuns: 96, seed: 0x6b } as const;

function context(run: ScenarioReplayFact): GateContext {
  return {
    repoRoot: '/simulation-property',
    readFile: (): undefined => undefined,
    files: (): readonly string[] => [],
    simulation: { runs: [run] },
  };
}

function campaign(flags: {
  readonly steady: boolean;
  readonly activated: boolean;
  readonly degraded: boolean;
  readonly recovered: boolean;
}): ScenarioReplayFact {
  return {
    scenarioId: 'property/recovery-campaign',
    owner: '@liteship/worker',
    invariant: 'the worker restores message delivery after a scheduled drop',
    seed: 107,
    faultSchedule: [{ point: 'worker.message', kind: 'drop', probability: 1 }],
    recoveryExpectation: {
      steadyState: 'messages are delivered',
      degradation: 'the scheduled message is dropped',
      recovery: 'the next message is delivered',
    },
    recoveryObservation: {
      steadyStateObserved: flags.steady,
      activatedFaultPoints: flags.activated ? ['worker.message'] : [],
      degradationObserved: flags.degraded,
      recoveryObserved: flags.recovered,
    },
    firstDigest: 'fnv1a:01020304',
    secondDigest: 'fnv1a:01020304',
  };
}

describe('simulation campaign property laws', () => {
  it('the gate accepts exactly the campaigns that establish, activate, degrade, and recover', () => {
    fc.assert(
      fc.property(
        fc.record({
          steady: fc.boolean(),
          activated: fc.boolean(),
          degraded: fc.boolean(),
          recovered: fc.boolean(),
        }),
        (flags) => {
          const ruleIds = simulationDeterminismGate.run(context(campaign(flags))).map((finding) => finding.ruleId);
          expect(ruleIds.includes('gauntlet/simulation-determinism/steady-state-not-observed')).toBe(!flags.steady);
          expect(ruleIds.includes('gauntlet/simulation-determinism/fault-not-activated')).toBe(!flags.activated);
          expect(ruleIds.includes('gauntlet/simulation-determinism/degradation-not-observed')).toBe(!flags.degraded);
          expect(ruleIds.includes('gauntlet/simulation-determinism/recovery-failed')).toBe(!flags.recovered);
          expect(ruleIds).toHaveLength(Object.values(flags).filter((value) => !value).length);
        },
      ),
      RUNS,
    );
  });

  it('every scheduled point must be observed, independent of schedule ordering and duplicates', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9.-]{0,20}$/u), { minLength: 1, maxLength: 8 }),
        fc.array(fc.nat(), { maxLength: 12 }),
        (points, picks) => {
          const activated = new Set(picks.map((pick) => points[pick % points.length]!));
          const base = campaign({ steady: true, activated: true, degraded: true, recovered: true });
          const run: ScenarioReplayFact = {
            ...base,
            faultSchedule: points.flatMap((point, index) => [
              { point, kind: 'drop' as const, probability: 1 },
              ...(index % 2 === 0 ? [{ point, kind: 'drop' as const, probability: 1 }] : []),
            ]),
            recoveryObservation: {
              ...base.recoveryObservation!,
              activatedFaultPoints: [...activated],
            },
          };
          const missing = new Set(
            simulationDeterminismGate
              .run(context(run))
              .filter((finding) => finding.ruleId === 'gauntlet/simulation-determinism/fault-not-activated')
              .map((finding) => /Scheduled fault "([^"]+)"/u.exec(finding.title)?.[1]),
          );
          expect(missing).toEqual(new Set(points.filter((point) => !activated.has(point))));
        },
      ),
      RUNS,
    );
  });
});
