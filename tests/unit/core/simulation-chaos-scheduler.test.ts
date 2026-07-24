import { describe, expect, it } from 'vitest';
import {
  assertReplayDeterministic,
  makeWorld,
  replay,
  seededInterleavingScheduler,
  type SimScenario,
  type SimStep,
} from '@liteship/core/simulation';

const labeledScenario: SimScenario = {
  id: 'seeded-order-exploration',
  steps: (): readonly SimStep[] => ['a', 'b', 'c', 'd'].map((label) => ({ label, act: () => ({ label }) })),
};

describe('seeded interleaving scheduler', () => {
  it('replays the exact observed order and trace from one seed', async () => {
    const options = { scheduler: seededInterleavingScheduler };
    const proof = await assertReplayDeterministic(73, labeledScenario, options);
    expect(proof.deterministic).toBe(true);
    expect(proof.first.entries.map((entry) => entry.label)).toEqual(proof.second.entries.map((entry) => entry.label));
  });

  it('explores multiple orderings across a deterministic seed corpus', async () => {
    const observed = new Set<string>();
    for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
      const trace = await replay(seed, labeledScenario, { scheduler: seededInterleavingScheduler });
      observed.add(trace.entries.map((entry) => entry.label).join(','));
    }
    expect(observed.size).toBeGreaterThan(1);
  });

  it('exposes read-before-write races without making the failure flaky', async () => {
    const outcomes = new Map<number, unknown>();
    for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
      const scenario: SimScenario = {
        id: 'read-write-race',
        steps: () => {
          let value = 0;
          return [
            { label: 'write', act: () => (value = 1) },
            { label: 'read', act: () => ({ observed: value }) },
          ];
        },
      };
      const trace = await replay(seed, scenario, { scheduler: seededInterleavingScheduler });
      outcomes.set(seed, trace.entries.find((entry) => entry.label === 'read')?.value);
      const repeated = await replay(seed, scenario, { scheduler: seededInterleavingScheduler });
      expect(repeated.entries.map((entry) => entry.label)).toEqual(trace.entries.map((entry) => entry.label));
    }
    expect([...outcomes.values()]).toContainEqual({ observed: 0 });
    expect([...outcomes.values()]).toContainEqual({ observed: 1 });
  });

  it('does not consume the application RNG stream while choosing an order', async () => {
    const sequential = makeWorld(91);
    const interleaved = makeWorld(91, { scheduler: seededInterleavingScheduler });
    await interleaved.scheduler.run(interleaved, [{ label: 'noop', act: () => null }]);
    expect(interleaved.rng.next()).toBe(sequential.rng.next());
  });
});
