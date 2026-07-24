import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { createAffectedPlanningBundle } from '../../scripts/affected-plan.js';
import type { AssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import { buildAffectedSelectorCalibration } from '../../scripts/lib/affected-selector-calibration.js';

const PATHS = [
  'README.md',
  'packages/core/src/authoring/boundary.ts',
  'tests/unit/core/authoring/boundary.test.ts',
  'tests/browser/adaptive-runtime.browser.test.ts',
  '.github/workflows/ci.yml',
] as const;
const pathSet = fc.uniqueArray(fc.constantFrom(...PATHS), { minLength: 1, maxLength: PATHS.length });
const INVENTORY: AssuranceInventory = {
  schemaVersion: 2,
  packages: PACKAGE_CATALOG.map((record) => ({
    name: record.name,
    sourceLoc: 1,
    authoredEvidenceLoc: 1,
    generatedEvidenceLoc: 0,
    ratioMilli: 1_000,
    targetMilli: 10_000,
    targetReached: false,
    highestAssurance: record.name === '@liteship/core' || record.name === '@liteship/canonical' ? 'L4' : 'L1',
    evidenceRequirements: ['unit'],
    missingEvidence: [],
    evidenceClasses: {
      unit: 1,
      property: 0,
      component: 0,
      integration: 0,
      regression: 0,
      browser: 0,
      e2e: 0,
      fuzz: 0,
      simulation: 0,
      mutation: 0,
      mcdc: 0,
      chaos: 0,
      benchmark: 0,
    },
    evidenceFiles:
      record.name === '@liteship/core'
        ? ['tests/unit/core/authoring/boundary.test.ts', 'tests/browser/adaptive-runtime.browser.test.ts']
        : record.name === '@liteship/canonical'
          ? Array.from({ length: 251 }, (_, index) => `tests/unit/canonical/impact-${index}.test.ts`)
          : [],
  })),
  totals: {
    sourceLoc: PACKAGE_CATALOG.length,
    authoredEvidenceLoc: PACKAGE_CATALOG.length,
    generatedEvidenceLoc: 0,
    corpusLoc: 0,
    ratioMilli: 1_000,
    targetMilli: 10_000,
    sourceRoles: {
      product: PACKAGE_CATALOG.length,
      verificationEngine: 0,
      rustWasm: 0,
      workflowAuthority: 0,
      generated: 0,
    },
  },
};
const inventoryBuilder = () => INVENTORY;
const validProvider = (inputs: Parameters<typeof buildAffectedSelectorCalibration>[0]) =>
  buildAffectedSelectorCalibration(inputs);

function diff(paths: readonly string[], degradedReason?: string) {
  return () => ({
    paths,
    baseSha: degradedReason === undefined ? 'a'.repeat(40) : 'unresolved',
    headSha: degradedReason === undefined ? 'b'.repeat(40) : 'unresolved',
    ...(degradedReason === undefined ? {} : { degradedReason }),
  });
}

describe('affected planning calibration admission properties', () => {
  it('a current zero-miss calibration is the only route to high-confidence focused selection', () => {
    fc.assert(
      fc.property(pathSet, (paths) => {
        const bundle = createAffectedPlanningBundle(
          process.cwd(),
          'origin/main',
          diff(paths),
          validProvider,
          inventoryBuilder,
        );
        if (bundle.plan.mode === 'focused') {
          expect(bundle.plan.confidence).toBe('high');
          expect(bundle.plan.selectorCalibrationId).toBe(bundle.calibration?.calibrationId);
          expect(bundle.calibration).toMatchObject({ status: 'pass', selectorMisses: 0 });
        }
      }),
      { seed: 0xad017, numRuns: 75 },
    );
  });

  it('corrupting any calibration fingerprint always fails broad', () => {
    fc.assert(
      fc.property(
        pathSet,
        fc.constantFrom('selectorFingerprint', 'catalogFingerprint', 'inventoryFingerprint', 'corpusFingerprint'),
        (paths, field) => {
          const bundle = createAffectedPlanningBundle(
            process.cwd(),
            'origin/main',
            diff(paths),
            (inputs) => ({ ...buildAffectedSelectorCalibration(inputs), [field]: `sha256:${'f'.repeat(64)}` }),
            inventoryBuilder,
          );
          expect(bundle.calibration).toBeNull();
          expect(bundle.plan).toMatchObject({ mode: 'full', confidence: 'low', selectorCalibrationId: null });
          expect(bundle.plan.rationale.join('\n')).toMatch(/selector calibration unavailable/u);
        },
      ),
      { seed: 0x57a1e, numRuns: 100 },
    );
  });

  it('missing, malformed, or failed providers never authorize narrowing', () => {
    const providers = [
      () => null,
      () => ({}),
      () => {
        throw new Error('planted calibration failure');
      },
      (inputs: Parameters<typeof buildAffectedSelectorCalibration>[0]) => {
        const planted = inputs.corpus.map((entry, index) =>
          index === 0 ? { ...entry, requiredOwners: [...entry.requiredOwners, '@liteship/foreign'] } : entry,
        );
        return buildAffectedSelectorCalibration({ ...inputs, corpus: planted });
      },
    ] as const;
    for (const provider of providers) {
      const bundle = createAffectedPlanningBundle(
        process.cwd(),
        'origin/main',
        diff(['README.md']),
        provider,
        inventoryBuilder,
      );
      expect(bundle.calibration).toBeNull();
      expect(bundle.plan).toMatchObject({ mode: 'full', confidence: 'low', browserRequired: true });
    }
  });

  it('an unavailable Git base fails broad even with current calibration evidence', () => {
    const bundle = createAffectedPlanningBundle(
      process.cwd(),
      'origin/main',
      diff(['README.md'], 'planted missing base'),
      validProvider,
      inventoryBuilder,
    );
    expect(bundle.calibration).not.toBeNull();
    expect(bundle.plan).toMatchObject({
      mode: 'full',
      confidence: 'low',
      selectorCalibrationId: bundle.calibration?.calibrationId,
    });
    expect(bundle.plan.rationale).toContain('planted missing base');
  });

  it('adding uncertainty never reduces evidence, platforms, or risk', () => {
    fc.assert(
      fc.property(pathSet, (paths) => {
        const certain = createAffectedPlanningBundle(
          process.cwd(),
          'origin/main',
          diff(paths),
          validProvider,
          inventoryBuilder,
        ).plan;
        const uncertain = createAffectedPlanningBundle(
          process.cwd(),
          'origin/main',
          diff(paths),
          () => null,
          inventoryBuilder,
        ).plan;
        expect(uncertain.mode).toBe('full');
        expect(uncertain.browserRequired).toBe(true);
        expect(uncertain.platforms).toEqual(['linux', 'win32', 'browser']);
        for (const check of certain.requiredChecks) expect(uncertain.requiredChecks).toContain(check);
      }),
      { seed: 0xbad5eed, numRuns: 75 },
    );
  });
});
