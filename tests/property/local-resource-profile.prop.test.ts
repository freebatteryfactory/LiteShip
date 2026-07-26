import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { buildLocalVerificationPlan } from '../../scripts/lib/local-verification-plan.js';
import { selectLocalResourcePlan, type LocalResourceObservation } from '../../scripts/lib/local-resource-profile.js';

const MIB = 1024 ** 2;

function observation(freeMiB: number, busy: number): LocalResourceObservation {
  return {
    platform: 'linux',
    logicalCpus: 16,
    availableParallelism: 16,
    cpuBusyPercent: busy,
    totalMemoryBytes: 32 * 1024 * MIB,
    freeMemoryBytes: freeMiB * MIB,
  };
}

describe('local resource admission properties', () => {
  test('more free memory and less CPU contention never revoke an admitted docs proof', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 32 * 1024 }),
        fc.integer({ min: 0, max: 32 * 1024 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (leftFree, rightFree, leftBusy, rightBusy) => {
          const worse = selectLocalResourcePlan(
            observation(Math.min(leftFree, rightFree), Math.max(leftBusy, rightBusy)),
          );
          const better = selectLocalResourcePlan(
            observation(Math.max(leftFree, rightFree), Math.min(leftBusy, rightBusy)),
          );
          if (worse.docs.admitted) expect(better.docs.admitted).toBe(true);
        },
      ),
    );
  });

  test('an admitted local plan always preserves its declared heap and reserve', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 32 * 1024 }), fc.integer({ min: 0, max: 100 }), (freeMiB, busy) => {
        const plan = selectLocalResourcePlan(observation(freeMiB, busy));
        if (plan.docs.admitted) {
          expect(freeMiB).toBeGreaterThanOrEqual(plan.docs.heapMiB + plan.docs.reservedMemoryMiB);
        }
      }),
    );
  });

  test('resource pressure may change scheduling but never the blocking quick proof set', () => {
    const required = buildLocalVerificationPlan({ staged: true, changedPaths: [] }).steps.map((step) => step.checkId);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 32 * 1024 }), fc.integer({ min: 0, max: 100 }), (freeMiB, busy) => {
        selectLocalResourcePlan(observation(freeMiB, busy));
        expect(
          buildLocalVerificationPlan({ staged: true, changedPaths: [] }).steps.map((step) => step.checkId),
        ).toEqual(required);
      }),
    );
  });
});
