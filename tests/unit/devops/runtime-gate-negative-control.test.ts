// PROVES: INV-CHECK-NEGATIVE-CONTROL
import { describe, expect, it } from 'vitest';
import { runtimeGateFailures, type RuntimeGateEvidence } from '../../../scripts/runtime-gate.js';

const GREEN: RuntimeGateEvidence = Object.freeze({
  feedbackPassed: true,
  hardGatesPassed: true,
  pairedTruth: Object.freeze([{ id: 'worker-startup', status: 'pass' }]),
  runtimeWarnings: Object.freeze([]),
  runtimeSeamsSchemaVersion: 7,
  adaptiveScanSchemaVersion: 6,
});

describe('check/runtime-gate negative control', () => {
  it('the runtime owner rejects every semantic warning/seam mutation and admits the neutralized evidence', () => {
    expect(runtimeGateFailures(GREEN)).toEqual([]);
    const planted: readonly RuntimeGateEvidence[] = [
      { ...GREEN, feedbackPassed: false },
      { ...GREEN, hardGatesPassed: false },
      { ...GREEN, pairedTruth: [{ id: 'worker-startup', status: 'warn' }] },
      { ...GREEN, runtimeWarnings: ['planted un-seamed coupling'] },
      { ...GREEN, runtimeSeamsSchemaVersion: 6 },
      { ...GREEN, adaptiveScanSchemaVersion: 5 },
    ];
    for (const evidence of planted) expect(runtimeGateFailures(evidence).length).toBeGreaterThan(0);
  });
});
