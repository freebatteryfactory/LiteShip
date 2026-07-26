/** Deterministic degradation/recovery proof for the compiler migration boundary. @module */

import { describe, expect, it } from 'vitest';
import { type SimScenario, consultFault } from '@liteship/core/simulation';
import { fromMediaQueries } from '@liteship/compiler/migrate';
import { simulationDeterminismGate, type GateContext } from '@liteship/gauntlet';
import {
  campaignObservation,
  runSimulationCorpus,
  type RecoveryCorpusEntry,
} from '../../packages/cli/src/lib/simulation-corpus.js';

const FAULT_POINT = 'compiler.media-type-corruption';
const VALID_SOURCE = '@media (min-width: 768px) { .card { display: grid; } }';
const FAULTED_SOURCE = '@media print and (min-width: 768px) { .card { display: grid; } }';

const migrationScenario: SimScenario = {
  id: 'compiler-media-migration-refusal-recovery',
  steps: (world) => {
    const expected = fromMediaQueries(VALID_SOURCE);
    const expectedId = expected.boundaries[0]?.id;
    let faultActivated = false;
    let refused = false;

    return [
      {
        label: 'compiler.steady',
        act: () =>
          campaignObservation(
            'steady-state',
            expected.boundaries.length === 1 && expected.diagnostics.length === 0 && expectedId !== undefined,
          ),
      },
      {
        label: 'compiler.inject-media-type',
        act: (schedulerWorld) => {
          faultActivated = consultFault(world.faults, FAULT_POINT, schedulerWorld.rng).fired;
          return campaignObservation('fault-activated', faultActivated, FAULT_POINT);
        },
      },
      {
        label: 'compiler.refuse-corrupt-source',
        act: () => {
          const degraded = fromMediaQueries(faultActivated ? FAULTED_SOURCE : VALID_SOURCE);
          refused =
            faultActivated &&
            degraded.boundaries.length === 0 &&
            degraded.themes.length === 0 &&
            degraded.tokens.length === 0 &&
            degraded.diagnostics.some(
              (diagnostic) => diagnostic.code === 'migrate/unsupported-at-rule' && diagnostic.severity === 'error',
            );
          return campaignObservation('degradation', refused);
        },
      },
      {
        label: 'compiler.recover-valid-source',
        act: () => {
          const recovered = fromMediaQueries(VALID_SOURCE);
          return campaignObservation(
            'recovery',
            faultActivated &&
              refused &&
              recovered.diagnostics.length === 0 &&
              recovered.boundaries.length === 1 &&
              recovered.boundaries[0]?.id === expectedId,
          );
        },
      },
    ];
  },
};

const corpus: readonly RecoveryCorpusEntry[] = [
  {
    scenario: migrationScenario,
    owner: '@liteship/compiler',
    invariant: 'a foreign media-type fault is refused atomically and valid source recompiles to the same definition',
    seeds: [7, 0xc011],
    faultSchedule: [{ point: FAULT_POINT, kind: 'corrupt', probability: 1 }],
    recoveryExpectation: {
      steadyState: 'valid source lowers to one deterministic boundary',
      degradation: 'the corrupted media type emits an error and no definitions',
      recovery: 'the restored source lowers to the original boundary identity',
    },
  },
];

function context(runs: NonNullable<Awaited<ReturnType<typeof runSimulationCorpus>>['runs']>): GateContext {
  return {
    repoRoot: '/compiler-migration-simulation',
    readFile: (): undefined => undefined,
    files: (): readonly string[] => [],
    simulation: { runs },
  };
}

describe('compiler migration fault simulation', () => {
  it('replays the refusal and recovery schedule byte-exact for every seed', async () => {
    const facts = await runSimulationCorpus(corpus);
    const runs = facts.runs ?? [];

    expect(runs).toHaveLength(corpus[0]!.seeds.length);
    expect(runs.every((run) => run.firstDigest === run.secondDigest)).toBe(true);
    expect(runs.every((run) => run.recoveryObservation?.degradationObserved === true)).toBe(true);
    expect(runs.every((run) => run.recoveryObservation?.recoveryObserved === true)).toBe(true);
    expect(simulationDeterminismGate.run(context(runs))).toEqual([]);
  });

  it('turns a planted non-activating fault schedule into a stable gate failure', async () => {
    const inactive: RecoveryCorpusEntry = {
      ...corpus[0]!,
      seeds: [19],
      faultSchedule: [{ point: FAULT_POINT, kind: 'corrupt', probability: 0 }],
    };
    const facts = await runSimulationCorpus([inactive]);
    const runs = facts.runs ?? [];
    const findings = simulationDeterminismGate.run(context(runs));

    expect(runs).toHaveLength(1);
    expect(runs[0]?.firstDigest).toBe(runs[0]?.secondDigest);
    expect(findings.map((finding) => finding.ruleId)).toContain('gauntlet/simulation-determinism/fault-not-activated');
    expect(findings.every((finding) => finding.remediation !== undefined)).toBe(true);
  });
});
