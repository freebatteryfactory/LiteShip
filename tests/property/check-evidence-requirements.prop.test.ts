import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import type {
  CheckDefinition,
  CheckEvidenceCondition,
  CheckEvidenceRequirement,
} from '../../packages/command/src/checks/definition.js';
import { projectCheckEvidenceRequirements } from '../../packages/command/src/checks/evidence-requirements.js';

const CONDITIONS = [
  'head-sha-match',
  'plan-id-match',
  'platform-match',
  'producer-match',
  'command-match',
  'verdict-pass',
  'digest-match',
] as const satisfies readonly CheckEvidenceCondition[];

function withRequirements(
  check: CheckDefinition,
  evidenceRequirements: readonly CheckEvidenceRequirement[],
): CheckDefinition {
  return { ...check, evidenceRequirements } as CheckDefinition;
}

describe('check evidence requirements properties', () => {
  test('registry order cannot change the exact manifest requirements projection', () => {
    const expected = projectCheckEvidenceRequirements(CHECK_REGISTRY);
    fc.assert(
      fc.property(
        fc.shuffledSubarray(CHECK_REGISTRY, {
          minLength: CHECK_REGISTRY.length,
          maxLength: CHECK_REGISTRY.length,
        }),
        (permutation) => {
          expect(projectCheckEvidenceRequirements(permutation)).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('required-condition order cannot change the projected requirement bytes', () => {
    const check = CHECK_REGISTRY[0]!;
    const expected = projectCheckEvidenceRequirements([check]);
    fc.assert(
      fc.property(
        fc.shuffledSubarray(CONDITIONS, { minLength: CONDITIONS.length, maxLength: CONDITIONS.length }),
        (requiredConditions) => {
          const mutated = withRequirements(check, [
            { ...check.evidenceRequirements[0], requiredConditions } as CheckEvidenceRequirement,
          ]);
          expect(projectCheckEvidenceRequirements([mutated])).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('arbitrary missing descriptor fields always fail closed', () => {
    const check = CHECK_REGISTRY[0]!;
    const keys = ['id', 'kind', 'path', 'producer', 'requiredConditions', 'verifier'] as const;
    fc.assert(
      fc.property(fc.constantFrom(...keys), (key) => {
        const requirement = { ...check.evidenceRequirements[0] } as Record<string, unknown>;
        delete requirement[key];
        const mutated = withRequirements(check, [requirement as unknown as CheckEvidenceRequirement]);
        expect(() => projectCheckEvidenceRequirements([mutated])).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  test('arbitrary path traversal and absolute spellings always fail closed', () => {
    const check = CHECK_REGISTRY[0]!;
    const invalidPath = fc.oneof(
      fc.constant('/tmp/check.json'),
      fc.constant('C:/tmp/check.json'),
      fc.constant('reports\\check.json'),
      fc
        .array(fc.constantFrom('..', '.', '', 'reports', 'check.json'), { minLength: 1, maxLength: 6 })
        .filter((segments) => segments.some((segment) => segment === '..' || segment === '.' || segment === ''))
        .map((segments) => segments.join('/')),
    );
    fc.assert(
      fc.property(invalidPath, (path) => {
        const mutated = withRequirements(check, [{ ...check.evidenceRequirements[0], path }]);
        expect(() => projectCheckEvidenceRequirements([mutated])).toThrow(
          /(?:repository-relative|non-empty trimmed string)/u,
        );
      }),
      { numRuns: 150 },
    );
  });

  test('duplicating any evidence identity under a different producer always fails closed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: CHECK_REGISTRY.length - 1 }),
        fc.integer({ min: 0, max: CHECK_REGISTRY.length - 2 }),
        (firstIndex, offset) => {
          const first = CHECK_REGISTRY[firstIndex]!;
          const secondIndex = offset >= firstIndex ? offset + 1 : offset;
          const second = CHECK_REGISTRY[secondIndex]!;
          const duplicated = withRequirements(second, [
            { ...second.evidenceRequirements[0], id: first.evidenceRequirements[0].id },
          ]);
          expect(() => projectCheckEvidenceRequirements([first, duplicated])).toThrow(/duplicate evidence id/u);
        },
      ),
      { numRuns: 150 },
    );
  });

  test('empty evidence under any canonical check is never accepted as complete', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CHECK_REGISTRY), (check) => {
        expect(() => projectCheckEvidenceRequirements([withRequirements(check, [])])).toThrow(
          /has no evidence requirements/u,
        );
      }),
      { numRuns: 100 },
    );
  });
});
