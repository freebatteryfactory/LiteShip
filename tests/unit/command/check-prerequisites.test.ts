import { describe, expect, it } from 'vitest';
import { CHECK_REGISTRY, planChecks, type CheckDefinition } from '@liteship/command';
import { planChecksFromRegistry } from '../../../packages/command/src/checks/plan.js';

const seed = CHECK_REGISTRY.find((check) => check.id === 'check/format')!;

function check(
  id: string,
  prerequisites: readonly string[],
  profiles: CheckDefinition['profiles'] = ['full'],
): CheckDefinition {
  return { ...seed, id, prerequisites, profiles };
}

describe('check prerequisite closure', () => {
  it('makes full-profile artifact producers precede every runtime/feedback consumer', () => {
    const ids = planChecks('full', 'linux').checks.map((entry) => entry.id);
    const before = (producer: string, consumer: string): void => {
      expect(ids.indexOf(producer), `${producer} must be planned`).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(consumer), `${consumer} must be planned`).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(producer), `${producer} -> ${consumer}`).toBeLessThan(ids.indexOf(consumer));
    };

    before('check/coverage', 'check/report-runtime-seams');
    before('check/bench-gate', 'check/report-runtime-seams');
    before('check/bench-reality', 'check/report-runtime-seams');
    before('check/report-runtime-seams', 'check/audit');
    before('check/audit', 'check/report-adaptive-scan');
    before('check/report-adaptive-scan', 'check/runtime-gate');
    before('check/report-adaptive-scan', 'check/feedback-verify');
    for (const producer of [
      'check/lint',
      'check/test',
      'check/bench-gate',
      'check/feedback-verify',
      'check/docs',
      'check/capsule-verify',
    ]) {
      before(producer, 'check/flex-verify');
    }

    const flex = planChecks('full', 'linux').checks.find((entry) => entry.id === 'check/flex-verify');
    expect(flex?.command).toBe('pnpm run flex:verify -- --prechecked');
  });

  it('fails closed on a dangling prerequisite and on a cycle', () => {
    expect(() => planChecksFromRegistry([check('check/a', ['check/missing'])], 'full', 'linux')).toThrow(
      /unknown prerequisite "check\/missing"/u,
    );
    expect(() =>
      planChecksFromRegistry([check('check/a', ['check/b']), check('check/b', ['check/a'], [])], 'full', 'linux'),
    ).toThrow(/check\/a -> check\/b -> check\/a/u);
  });

  it('skips a consumer when its required producer cannot run on the target platform', () => {
    const producer = { ...check('check/producer', [], []), platforms: ['linux'] as const };
    const consumer = check('check/consumer', ['check/producer']);
    const plan = planChecksFromRegistry([producer, consumer], 'full', 'win32');

    expect(plan.checks).toEqual([]);
    expect(plan.skipped).toEqual([
      { id: 'check/producer', reason: 'not supported on win32' },
      { id: 'check/consumer', reason: 'prerequisite check/producer is unavailable' },
    ]);
  });
});
