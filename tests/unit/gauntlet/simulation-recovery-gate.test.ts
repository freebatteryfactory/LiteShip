/** Deterministic red controls for simulation recovery admission. @module */

import { describe, expect, it } from 'vitest';
import { simulationDeterminismGate, type GateContext, type ScenarioReplayFact } from '@liteship/gauntlet';

function context(run: ScenarioReplayFact): GateContext {
  return {
    repoRoot: '/simulation-recovery',
    readFile: (): undefined => undefined,
    files: (): readonly string[] => [],
    simulation: { runs: [run] },
  };
}

function recoveredCampaign(): ScenarioReplayFact {
  return {
    scenarioId: 'worker/drop-and-recover',
    owner: '@liteship/worker',
    invariant: 'message delivery resumes after restart',
    seed: 555,
    faultSchedule: [{ point: 'worker.message', kind: 'drop', probability: 1 }],
    recoveryExpectation: {
      steadyState: 'messages are delivered',
      degradation: 'one message is dropped',
      recovery: 'subsequent messages are delivered',
    },
    recoveryObservation: {
      steadyStateObserved: true,
      activatedFaultPoints: ['worker.message'],
      degradationObserved: true,
      recoveryObserved: true,
    },
    firstDigest: 'fnv1a:11111111',
    secondDigest: 'fnv1a:11111111',
  };
}

describe('simulation recovery gate', () => {
  it('accepts a deterministic campaign that visibly activates, degrades, and recovers', () => {
    expect(simulationDeterminismGate.run(context(recoveredCampaign()))).toEqual([]);
  });

  it('rejects an unactivated fault, absent degradation, and failed recovery independently', () => {
    const base = recoveredCampaign();
    const findings = simulationDeterminismGate.run(
      context({
        ...base,
        recoveryObservation: {
          steadyStateObserved: true,
          activatedFaultPoints: [],
          degradationObserved: false,
          recoveryObserved: false,
        },
      }),
    );
    expect(findings.map((finding) => finding.ruleId)).toEqual([
      'gauntlet/simulation-determinism/fault-not-activated',
      'gauntlet/simulation-determinism/degradation-not-observed',
      'gauntlet/simulation-determinism/recovery-failed',
    ]);
    for (const finding of findings) {
      expect(finding.detail).toContain('seed 555');
      expect(finding.detail).toContain('@liteship/worker');
    }
  });

  it('rejects a fault schedule with no recovery observation rather than treating it as green', () => {
    const findings = simulationDeterminismGate.run(context({ ...recoveredCampaign(), recoveryObservation: null }));
    expect(findings.map((finding) => finding.ruleId)).toEqual([
      'gauntlet/simulation-determinism/campaign-not-evidenced',
    ]);
  });

  it('keeps nondeterministic replay blocking even when recovery observations are otherwise complete', () => {
    const findings = simulationDeterminismGate.run(
      context({
        ...recoveredCampaign(),
        secondDigest: 'fnv1a:22222222',
        divergence: {
          firstDivergentLabel: 'worker.recovery',
          detail: 'the recovery path read ambient state',
        },
      }),
    );
    expect(findings.map((finding) => finding.ruleId)).toEqual(['gauntlet/simulation-determinism/replay-divergence']);
  });

  it('derives nondeterminism from disagreeing digests even when a malformed host omits the annotation', () => {
    const findings = simulationDeterminismGate.run(
      context({
        ...recoveredCampaign(),
        secondDigest: 'fnv1a:22222222',
      }),
    );
    expect(findings.map((finding) => finding.ruleId)).toEqual(['gauntlet/simulation-determinism/replay-divergence']);
    expect(findings[0]!.detail).toContain('fnv1a:11111111');
    expect(findings[0]!.detail).toContain('fnv1a:22222222');
  });
});
