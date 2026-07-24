import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import IMPACT_CORPUS_JSON from '../fixtures/affected-impact-corpus.json';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import {
  buildAffectedSelectorCalibration,
  parseAffectedSelectorCalibration,
  type AffectedImpactCase,
  type AffectedSelectorCalibrationInputs,
} from '../../scripts/lib/affected-selector-calibration.js';

const INPUTS: AffectedSelectorCalibrationInputs = {
  selectorFingerprint: `sha256:${'a'.repeat(64)}`,
  catalog: PACKAGE_CATALOG,
  inventory: buildAssuranceInventory(process.cwd()),
  corpus: IMPACT_CORPUS_JSON as readonly AffectedImpactCase[],
};

describe('affected selector calibration decoder fuzz', () => {
  it('fails closed for arbitrary foreign JSON values', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(() => parseAffectedSelectorCalibration(value)).toThrow();
      }),
      { seed: 0xca1b7a7e, numRuns: 300 },
    );
  });

  it('rejects removed, foreign, duplicated, and reordered envelope fields', () => {
    const valid = buildAffectedSelectorCalibration(INPUTS);
    const { observations: _observations, ...withoutObservations } = valid;
    const reversed = { ...valid, observations: [...valid.observations].reverse() };
    const duplicate = {
      ...valid,
      observations: valid.observations.length === 0 ? [] : [valid.observations[0]!, ...valid.observations],
    };
    const mutants: readonly unknown[] = [
      withoutObservations,
      { ...valid, foreign: true },
      reversed,
      duplicate,
      { ...valid, selectorMisses: valid.selectorMisses + 1 },
      { ...valid, calibrationId: `sha256:${'0'.repeat(64)}` },
    ];
    for (const mutant of mutants) expect(() => parseAffectedSelectorCalibration(mutant)).toThrow();
  });

  it('rejects arbitrary observation mutations without partial acceptance', () => {
    const valid = buildAffectedSelectorCalibration(INPUTS);
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: valid.observations.length - 1 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        (index, miss) => {
          const observations = valid.observations.map((entry, entryIndex) =>
            entryIndex === index ? { ...entry, misses: [...entry.misses, miss].sort() } : entry,
          );
          expect(() => parseAffectedSelectorCalibration({ ...valid, observations })).toThrow();
        },
      ),
      { seed: 0xdec0de, numRuns: 150 },
    );
  });

  it('accepted records always have a self-consistent pass/fail verdict', () => {
    const pass = parseAffectedSelectorCalibration(buildAffectedSelectorCalibration(INPUTS));
    expect(pass.status).toBe('pass');
    expect(pass.selectorMisses).toBe(0);

    const corpus = INPUTS.corpus.map((entry, index) =>
      index === 0 ? { ...entry, requiredChecks: [...entry.requiredChecks, 'check/does-not-exist'] } : entry,
    );
    const fail = parseAffectedSelectorCalibration(buildAffectedSelectorCalibration({ ...INPUTS, corpus }));
    expect(fail.status).toBe('fail');
    expect(fail.selectorMisses).toBeGreaterThan(0);
  });
});
