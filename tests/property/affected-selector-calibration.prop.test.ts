import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import IMPACT_CORPUS_JSON from '../fixtures/affected-impact-corpus.json';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import {
  assertAffectedSelectorCalibrationCurrent,
  buildAffectedSelectorCalibration,
  parseAffectedSelectorCalibration,
  type AffectedImpactCase,
  type AffectedSelectorCalibrationInputs,
} from '../../scripts/lib/affected-selector-calibration.js';

const CORPUS = IMPACT_CORPUS_JSON as readonly AffectedImpactCase[];
const INPUTS: AffectedSelectorCalibrationInputs = {
  selectorFingerprint: `sha256:${'a'.repeat(64)}`,
  catalog: PACKAGE_CATALOG,
  inventory: buildAssuranceInventory(process.cwd()),
  corpus: CORPUS,
};
const digestArbitrary = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 64, maxLength: 64 })
  .map((digits) => `sha256:${digits.map((digit) => digit.toString(16)).join('')}` as const);
const hexSuffix = fc
  .array(fc.constantFrom(...'0123456789abcdef'), { minLength: 1, maxLength: 16 })
  .map((digits) => digits.join(''));

describe('affected selector calibration properties', () => {
  it('is invariant to corpus and set-like field ordering', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(CORPUS, { minLength: CORPUS.length, maxLength: CORPUS.length }),
        fc.boolean(),
        (entries, reverseFields) => {
          const permuted = entries.map((entry) => ({
            ...entry,
            paths: reverseFields ? [...entry.paths].reverse() : entry.paths,
            requiredOwners: reverseFields ? [...entry.requiredOwners].reverse() : entry.requiredOwners,
            requiredChecks: reverseFields ? [...entry.requiredChecks].reverse() : entry.requiredChecks,
          }));
          expect(buildAffectedSelectorCalibration({ ...INPUTS, corpus: permuted }).calibrationId).toBe(
            buildAffectedSelectorCalibration(INPUTS).calibrationId,
          );
        },
      ),
      { seed: 0xca11b, numRuns: 75 },
    );
  });

  it('every independently required foreign owner creates a miss and can never pass', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: CORPUS.length - 1 }), hexSuffix, (index, suffix) => {
        const corpus = CORPUS.map((entry, entryIndex) =>
          entryIndex === index
            ? { ...entry, requiredOwners: [...entry.requiredOwners, `@liteship/foreign-${suffix}`] }
            : entry,
        );
        const calibration = buildAffectedSelectorCalibration({ ...INPUTS, corpus });
        expect(calibration.status).toBe('fail');
        expect(calibration.selectorMisses).toBeGreaterThan(0);
        expect(() => assertAffectedSelectorCalibrationCurrent(calibration, { ...INPUTS, corpus })).toThrow(
          /contains selector misses/u,
        );
      }),
      { seed: 0x51ec7, numRuns: 100 },
    );
  });

  it('every independently required foreign check creates a miss and can never pass', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: CORPUS.length - 1 }), hexSuffix, (index, suffix) => {
        const corpus = CORPUS.map((entry, entryIndex) =>
          entryIndex === index
            ? { ...entry, requiredChecks: [...entry.requiredChecks, `check/foreign-${suffix}`] }
            : entry,
        );
        const calibration = buildAffectedSelectorCalibration({ ...INPUTS, corpus });
        expect(calibration.status).toBe('fail');
        expect(calibration.observations.some((entry) => entry.misses.some((miss) => miss.startsWith('check:')))).toBe(
          true,
        );
      }),
      { seed: 0xc0ffee, numRuns: 100 },
    );
  });

  it('any foreign selector fingerprint is rejected as stale', () => {
    const calibration = buildAffectedSelectorCalibration(INPUTS);
    fc.assert(
      fc.property(digestArbitrary, (selectorFingerprint) => {
        fc.pre(selectorFingerprint !== INPUTS.selectorFingerprint);
        expect(() => assertAffectedSelectorCalibrationCurrent(calibration, { ...INPUTS, selectorFingerprint })).toThrow(
          /stale for the selector source/u,
        );
      }),
      { seed: 0xf19e2, numRuns: 100 },
    );
  });

  it('strict decoding rejects any addressed field mutation', () => {
    const calibration = buildAffectedSelectorCalibration(INPUTS);
    fc.assert(
      fc.property(
        fc.constantFrom('selectorFingerprint', 'catalogFingerprint', 'inventoryFingerprint', 'corpusFingerprint'),
        digestArbitrary,
        (field, replacement) => {
          fc.pre(replacement !== calibration[field]);
          expect(() => parseAffectedSelectorCalibration({ ...calibration, [field]: replacement })).toThrow(
            /integrity/u,
          );
        },
      ),
      { seed: 0xadd2e55, numRuns: 100 },
    );
  });

  it('duplicate or empty case identities are refused before calibration', () => {
    const duplicate = [...CORPUS, { ...CORPUS[0]! }];
    expect(() => buildAffectedSelectorCalibration({ ...INPUTS, corpus: duplicate })).toThrow(/unique/u);
    expect(() => buildAffectedSelectorCalibration({ ...INPUTS, corpus: [{ ...CORPUS[0]!, id: '' }] })).toThrow(
      /must not be empty/u,
    );
  });
});
