/** Pure admission boundary binding release packing to one addressed plan and checkout HEAD. @module */

import { parseAffectedTestPlan, type AffectedTestPlan } from './affected-test-plan.js';

export interface AdmittedReleasePlanBinding {
  readonly sourceCommit: string;
  readonly planId: AffectedTestPlan['planId'];
}

function exactRecord(value: unknown): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new TypeError('release plan binding must be a plain object');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) throw new TypeError('release plan binding contains a symbol key');
  const actual = (keys as string[]).sort();
  const expected = ['admittedPlanId', 'gitHead', 'plan'];
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`release plan binding keys must be exactly: ${expected.join(', ')}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Refuse packing unless a cryptographically valid affected plan names both the
 * executing checkout and the independently admitted plan identity.
 */
export function admitReleasePlanBinding(input: unknown): AdmittedReleasePlanBinding {
  const binding = exactRecord(input);
  const gitHead = binding['gitHead'];
  const admittedPlanId = binding['admittedPlanId'];
  if (typeof gitHead !== 'string' || !/^[0-9a-f]{40}$/u.test(gitHead)) {
    throw new TypeError('release plan binding gitHead must be a full lowercase Git SHA-1');
  }
  if (typeof admittedPlanId !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(admittedPlanId)) {
    throw new TypeError('release plan binding admittedPlanId must be sha256:<64-hex>');
  }
  const plan = parseAffectedTestPlan(binding['plan']);
  if (plan.headSha !== gitHead) {
    throw new TypeError(`release plan head ${plan.headSha} does not match checkout HEAD ${gitHead}`);
  }
  if (plan.planId !== admittedPlanId) {
    throw new TypeError(`release plan ${plan.planId} does not match admitted plan ${admittedPlanId}`);
  }
  return Object.freeze({ sourceCommit: gitHead, planId: plan.planId });
}
