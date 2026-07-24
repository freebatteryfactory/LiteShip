import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import IMPACT_CORPUS_JSON from '../../fixtures/affected-impact-corpus.json';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import {
  createAffectedPlanningBundle,
  readAffectedSelectorCalibrationFile,
  writeAffectedSelectorCalibrationFile,
} from '../../../scripts/affected-plan.js';
import { buildAssuranceInventory } from '../../../scripts/lib/assurance-inventory.js';
import {
  assertAffectedSelectorCalibrationCurrent,
  buildAffectedSelectorCalibration,
  parseAffectedSelectorCalibration,
  type AffectedImpactCase,
  type AffectedSelectorCalibrationInputs,
} from '../../../scripts/lib/affected-selector-calibration.js';
import { planAffectedTests } from '../../../scripts/lib/affected-test-plan.js';

const CORPUS = IMPACT_CORPUS_JSON as readonly AffectedImpactCase[];
const INVENTORY = buildAssuranceInventory(process.cwd());
const INPUTS: AffectedSelectorCalibrationInputs = {
  selectorFingerprint: `sha256:${'a'.repeat(64)}`,
  catalog: PACKAGE_CATALOG,
  inventory: INVENTORY,
  corpus: CORPUS,
};
const DIFF = () => ({ paths: ['README.md'], baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) });

describe('affected selector calibration', () => {
  it('addresses a zero-miss corpus and round-trips through the strict decoder', () => {
    const calibration = buildAffectedSelectorCalibration(INPUTS);
    expect(calibration).toMatchObject({ status: 'pass', selectorMisses: 0 });
    expect(parseAffectedSelectorCalibration(JSON.parse(JSON.stringify(calibration)) as unknown)).toEqual(calibration);
    expect(() => assertAffectedSelectorCalibrationCurrent(calibration, INPUTS)).not.toThrow();
  });

  it('turns a planted selector miss into failed calibration', () => {
    const corpus = CORPUS.map((entry) =>
      entry.id === 'prose-only' ? { ...entry, requiredOwners: ['@liteship/core'] } : entry,
    );
    const calibration = buildAffectedSelectorCalibration({ ...INPUTS, corpus });
    expect(calibration.status).toBe('fail');
    expect(calibration.selectorMisses).toBe(1);
    expect(calibration.observations.find((entry) => entry.id === 'prose-only')?.misses).toEqual([
      'owner:@liteship/core',
    ]);
    expect(() => assertAffectedSelectorCalibrationCurrent(calibration, { ...INPUTS, corpus })).toThrow(
      /contains selector misses/u,
    );
  });

  it('refuses malformed and stale calibration records', () => {
    const calibration = buildAffectedSelectorCalibration(INPUTS);
    expect(() => parseAffectedSelectorCalibration({ ...calibration, status: 'fail' })).toThrow(
      /integrity|contradicts/u,
    );
    expect(() =>
      assertAffectedSelectorCalibrationCurrent(calibration, {
        ...INPUTS,
        selectorFingerprint: `sha256:${'b'.repeat(64)}`,
      }),
    ).toThrow(/stale for the selector source/u);
  });

  it('selects full authority when calibration is missing or foreign', () => {
    const missing = createAffectedPlanningBundle(
      process.cwd(),
      'origin/main',
      DIFF,
      () => null,
      () => INVENTORY,
    );
    expect(missing.plan).toMatchObject({ mode: 'full', confidence: 'low', selectorCalibrationId: null });

    const foreign = buildAffectedSelectorCalibration(INPUTS);
    const stale = createAffectedPlanningBundle(
      process.cwd(),
      'origin/main',
      DIFF,
      () => foreign,
      () => INVENTORY,
    );
    expect(stale.plan).toMatchObject({ mode: 'full', confidence: 'low', selectorCalibrationId: null });
    expect(stale.plan.rationale.join('\n')).toMatch(/stale for the selector source/u);
  });

  it('binds focused plan identity to calibration identity', () => {
    const first = planAffectedTests(['README.md'], PACKAGE_CATALOG, INVENTORY, {
      baseRef: 'origin/main',
      baseSha: 'a'.repeat(40),
      headSha: 'b'.repeat(40),
      confidence: 'high',
      selectorCalibrationId: `sha256:${'1'.repeat(64)}`,
    });
    const second = planAffectedTests(['README.md'], PACKAGE_CATALOG, INVENTORY, {
      baseRef: 'origin/main',
      baseSha: 'a'.repeat(40),
      headSha: 'b'.repeat(40),
      confidence: 'high',
      selectorCalibrationId: `sha256:${'2'.repeat(64)}`,
    });
    expect(second.planId).not.toBe(first.planId);
    expect(() => parseAffectedSelectorCalibration({})).toThrow();
  });

  it('atomically persists the addressed calibration bytes', () => {
    const directory = mkdtempSync(join(tmpdir(), 'liteship-selector-calibration-'));
    try {
      const path = join(directory, 'calibration.json');
      const calibration = buildAffectedSelectorCalibration(INPUTS);
      writeAffectedSelectorCalibrationFile(path, calibration);
      expect(readAffectedSelectorCalibrationFile(path)).toEqual(calibration);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
