// PROVES: INV-CHECK-NEGATIVE-CONTROL
import { describe, expect, it } from 'vitest';
import {
  BENCH_FLEX_POLICY,
  benchFlexPolicyFailures,
  type BenchFlexPolicy,
} from '../../../scripts/bench/flex-policy.js';

describe('check/flex-verify + check/devx negative control', () => {
  it('the shared policy owner rejects each malformed threshold/label class and admits the neutralized policy', () => {
    expect(benchFlexPolicyFailures(BENCH_FLEX_POLICY)).toEqual([]);
    const planted: readonly BenchFlexPolicy[] = [
      { ...BENCH_FLEX_POLICY, replicateExceedanceMax: 1 },
      { ...BENCH_FLEX_POLICY, p99ToBaselineMax: 1 },
      { ...BENCH_FLEX_POLICY, directiveP99MaxNs: Number.NaN },
      { ...BENCH_FLEX_POLICY, acceptedNoisyLabels: [] },
      { ...BENCH_FLEX_POLICY, acceptedNoisyLabels: ['duplicate', 'duplicate'] },
      { ...BENCH_FLEX_POLICY, acceptedNoisyLabels: ['valid', '  '] },
    ];
    for (const policy of planted) expect(benchFlexPolicyFailures(policy).length).toBeGreaterThan(0);
  });
});
