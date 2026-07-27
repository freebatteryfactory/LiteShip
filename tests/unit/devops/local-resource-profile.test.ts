import { describe, expect, test, vi } from 'vitest';
import {
  awaitLocalDocsAdmission,
  cpuBusyPercent,
  formatLocalResourcePlan,
  selectLocalResourcePlan,
  snapshotCpuTimes,
  withAdmittedNodeHeap,
  type LocalResourceObservation,
} from '../../../scripts/lib/local-resource-profile.js';

const GIB = 1024 ** 3;

function observation(overrides: Partial<LocalResourceObservation> = {}): LocalResourceObservation {
  return {
    platform: 'win32',
    logicalCpus: 12,
    availableParallelism: 12,
    cpuBusyPercent: 20,
    totalMemoryBytes: 16 * GIB,
    freeMemoryBytes: 8 * GIB,
    ...overrides,
  };
}

describe('local resource profile', () => {
  test('computes CPU busy from cumulative per-core counters', () => {
    const before = snapshotCpuTimes([
      { times: { user: 20, nice: 0, sys: 10, idle: 70, irq: 0 } },
      { times: { user: 10, nice: 0, sys: 10, idle: 80, irq: 0 } },
    ]);
    const after = snapshotCpuTimes([
      { times: { user: 40, nice: 0, sys: 20, idle: 90, irq: 0 } },
      { times: { user: 30, nice: 0, sys: 20, idle: 100, irq: 0 } },
    ]);
    expect(cpuBusyPercent(before, after)).toBeCloseTo(60);
    expect(cpuBusyPercent(after, before)).toBe(100);
  });

  test('admits a balanced 16 GiB workstation without consuming every CPU', () => {
    const plan = selectLocalResourcePlan(observation({ freeMemoryBytes: 6.5 * GIB, cpuBusyPercent: 15.5 }));
    expect(plan).toMatchObject({
      profile: 'balanced',
      nativeTypeScriptWorkers: 2,
      docs: { admitted: true, heapMiB: 4096, reservedMemoryMiB: 2048, swapBacked: false, reason: 'admitted' },
    });
    expect(formatLocalResourcePlan(plan)).toContain('typedoc=4096 MiB, admitted');
  });

  test('admits an explicitly authorized swap-backed run without changing the heap or proof', () => {
    const plan = selectLocalResourcePlan(observation({ freeMemoryBytes: 4.9 * GIB, cpuBusyPercent: 10 }), {
      allowSwap: true,
    });
    expect(plan).toMatchObject({
      profile: 'constrained',
      nativeTypeScriptWorkers: 1,
      docs: {
        admitted: true,
        heapMiB: 4096,
        reservedMemoryMiB: 768,
        swapBacked: true,
        reason: 'admitted-swap',
      },
    });
  });

  test('refuses insufficient memory or extreme contention without reducing proof scope', () => {
    expect(selectLocalResourcePlan(observation({ freeMemoryBytes: 5 * GIB })).docs).toMatchObject({
      admitted: false,
      reason: 'memory-headroom',
    });
    expect(selectLocalResourcePlan(observation({ cpuBusyPercent: 95 })).docs).toMatchObject({
      admitted: false,
      reason: 'cpu-contended',
    });
  });

  test('bounds waiting and returns the first admitted resample', async () => {
    const samples = [observation({ freeMemoryBytes: 4 * GIB }), observation({ freeMemoryBytes: 8 * GIB })];
    const sampler = vi.fn(async () => samples.shift()!);
    const wait = vi.fn(async () => undefined);
    const plans: string[] = [];
    const result = await awaitLocalDocsAdmission({
      sampler,
      wait,
      maxWaitMs: 5_000,
      retryMs: 5_000,
      onObservation: (plan) => plans.push(plan.docs.reason),
    });
    expect(result.docs.admitted).toBe(true);
    expect(wait).toHaveBeenCalledOnce();
    expect(plans).toEqual(['memory-headroom', 'admitted']);
  });

  test('fails closed with a cure when the bounded wait cannot admit TypeDoc', async () => {
    await expect(
      awaitLocalDocsAdmission({
        sampler: async () => observation({ freeMemoryBytes: 4 * GIB }),
        wait: async () => undefined,
        maxWaitMs: 0,
      }),
    ).rejects.toThrow(/proof was not skipped/);
  });

  test('replaces inherited heap flags instead of allowing a larger trailing override', () => {
    expect(withAdmittedNodeHeap('--trace-warnings --max-old-space-size=8192', 4096)).toBe(
      '--max-old-space-size=4096 --trace-warnings',
    );
    expect(withAdmittedNodeHeap('--max-old-space-size 2048 --trace-warnings', 4096)).toBe(
      '--max-old-space-size=4096 --trace-warnings',
    );
  });
});
