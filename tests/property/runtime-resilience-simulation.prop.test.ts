import { describe, expect, it } from 'vitest';
import { IntegrityDigest } from '@liteship/core';
import { simulationDeterminismGate, type GateContext, type ScenarioReplayFact } from '@liteship/gauntlet';
import { createCurePacket } from '../../packages/cli/src/internal/cure-packet.js';
import { runSimulationCorpus } from '../../packages/cli/src/internal/simulation-corpus.js';
import { MockEventSource } from '../helpers/mock-event-source.js';
import { RUNTIME_RESILIENCE_CORPUS } from '../support/runtime-resilience-scenarios.js';

function context(runs: readonly ScenarioReplayFact[]): GateContext {
  return {
    repoRoot: '/runtime-resilience',
    readFile: (): undefined => undefined,
    files: (): readonly string[] => [],
    simulation: { runs },
  };
}

describe('runtime resilience simulation schedules', () => {
  it('replays worker, web, and quantizer fault schedules byte-exact and proves recovery', async () => {
    const uninstallEventSource = MockEventSource.install();
    try {
      const facts = await runSimulationCorpus(RUNTIME_RESILIENCE_CORPUS);
      const runs = facts.runs ?? [];
      expect(runs).toHaveLength(RUNTIME_RESILIENCE_CORPUS.reduce((count, entry) => count + entry.seeds.length, 0));
      expect(new Set(runs.map((run) => run.owner))).toEqual(
        new Set(['@liteship/worker', '@liteship/web', '@liteship/quantizer']),
      );
      for (const run of runs) {
        expect(run.firstDigest).toBe(run.secondDigest);
        expect(run.divergence).toBeUndefined();
        expect(run.recoveryObservation).toEqual({
          steadyStateObserved: true,
          activatedFaultPoints: [...new Set(run.faultSchedule.map((fault) => fault.point))].sort(),
          degradationObserved: true,
          recoveryObserved: true,
        });
      }
      expect(simulationDeterminismGate.run(context(runs))).toEqual([]);
    } finally {
      uninstallEventSource();
    }
  });

  it('turns a planted recovery failure into the existing stable Finding and schedule CurePacket', async () => {
    const uninstallEventSource = MockEventSource.install();
    try {
      const facts = await runSimulationCorpus([RUNTIME_RESILIENCE_CORPUS[0]!]);
      const clean = facts.runs![0]!;
      const planted: ScenarioReplayFact = {
        ...clean,
        recoveryObservation: { ...clean.recoveryObservation!, recoveryObserved: false },
      };
      const [finding] = simulationDeterminismGate.run(context([planted]));
      expect(finding?.ruleId).toBe('gauntlet/simulation-determinism/recovery-failed');
      expect(finding?.detail).toContain(`seed ${planted.seed}`);
      expect(finding?.remediation).toBeDefined();

      const packet = createCurePacket({
        headSha: 'runtime-resilience-negative-control',
        treeDigest: IntegrityDigest(`sha256:${'1'.repeat(64)}`),
        checkId: finding!.ruleId,
        title: finding!.title,
        claim: planted.invariant,
        owner: planted.owner,
        remediation: finding!.remediation!.description,
        command: `pnpm exec vitest run tests/property/runtime-resilience-simulation.prop.test.ts --maxWorkers=2`,
        findings: [finding!.detail],
        profile: 'full',
        lane: 'cheap-property',
        platform: 'portable',
        toolchain: 'vitest',
        invariantIds: ['runtime-resilience/recovery'],
        publicRoutes: ['@liteship/worker', '@liteship/web', '@liteship/quantizer'],
        reproducer: {
          kind: 'schedule',
          seed: String(planted.seed),
          schedule: planted.faultSchedule,
        },
      });

      expect(packet.reproducer.kind).toBe('schedule');
      expect(packet.reproducer.seed).toBe(String(planted.seed));
      expect(packet.reproducer.schedule).toEqual(planted.faultSchedule);
      expect(packet.prompt).toContain(`Seed: ${planted.seed}`);
      expect(packet.prompt).toContain('Schedule:');
    } finally {
      uninstallEventSource();
    }
  });
});
