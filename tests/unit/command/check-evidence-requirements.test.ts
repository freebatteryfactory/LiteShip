import { describe, expect, test } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import type { CheckDefinition, CheckEvidenceRequirement } from '../../../packages/command/src/checks/definition.js';
import { projectCheckEvidenceRequirements } from '../../../packages/command/src/checks/evidence-requirements.js';

function withRequirements(
  check: CheckDefinition,
  evidenceRequirements: readonly CheckEvidenceRequirement[],
): CheckDefinition {
  return { ...check, evidenceRequirements } as CheckDefinition;
}

describe('canonical check evidence requirements', () => {
  test('projects one deterministic check report requirement from every canonical check', () => {
    const projected = projectCheckEvidenceRequirements(CHECK_REGISTRY);

    expect(projected).toHaveLength(CHECK_REGISTRY.length);
    expect(projected.map((entry) => entry.checkId)).toEqual(
      CHECK_REGISTRY.map((check) => check.id).sort((left, right) => left.localeCompare(right)),
    );

    for (const check of CHECK_REGISTRY) {
      expect(check.evidenceRequirements).toHaveLength(1);
      const requirement = check.evidenceRequirements[0];
      const slug = check.id.replace(/^check\//u, '');
      expect(requirement).toEqual({
        id: `evidence/check/${slug}`,
        kind: 'check-report',
        path: `reports/checks/${slug}.json`,
        producer: check.id,
        requiredConditions: [
          'head-sha-match',
          'plan-id-match',
          'platform-match',
          'producer-match',
          'command-match',
          'verdict-pass',
          'digest-match',
        ],
        verifier: 'delivery-evidence/check-report-v1',
      });
    }
  });

  test('returns an immutable exact projection suitable for manifest construction', () => {
    const [first] = projectCheckEvidenceRequirements(CHECK_REGISTRY);
    expect(first).toBeDefined();
    expect(Object.isFrozen(projectCheckEvidenceRequirements(CHECK_REGISTRY))).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.profiles)).toBe(true);
    expect(Object.isFrozen(first?.requiredConditions)).toBe(true);
    expect(Object.keys(first ?? {}).sort()).toEqual(
      [
        'authority',
        'checkId',
        'command',
        'id',
        'kind',
        'path',
        'producer',
        'profiles',
        'requiredConditions',
        'verifier',
      ].sort(),
    );
  });

  test('fails closed when a complete check omits or empties its evidence obligations', () => {
    const check = CHECK_REGISTRY[0];
    expect(check).toBeDefined();

    const missing = { ...check } as Record<string, unknown>;
    delete missing.evidenceRequirements;
    expect(() => projectCheckEvidenceRequirements([missing as unknown as CheckDefinition])).toThrow(
      /has no evidence requirements/u,
    );
    expect(() => projectCheckEvidenceRequirements([withRequirements(check!, [])])).toThrow(
      /has no evidence requirements/u,
    );
  });

  test('fails closed on duplicate check and evidence identities', () => {
    const [first, second] = CHECK_REGISTRY;
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    expect(() => projectCheckEvidenceRequirements([first!, first!])).toThrow(/duplicate check id/u);

    const duplicateEvidence = withRequirements(second!, [
      { ...second!.evidenceRequirements[0], id: first!.evidenceRequirements[0].id },
    ]);
    expect(() => projectCheckEvidenceRequirements([first!, duplicateEvidence])).toThrow(/duplicate evidence id/u);
  });

  test.each([
    ['foreign key', { foreign: true }, /foreign keys/u],
    ['missing key', { verifier: undefined }, /is missing verifier/u],
    ['malformed id', { id: 'evidence/check/Bad' }, /id must match/u],
    ['unsupported kind', { kind: 'log' }, /kind is unsupported/u],
    ['absolute path', { path: '/tmp/result.json' }, /repository-relative/u],
    ['traversal path', { path: 'reports/../secret.json' }, /repository-relative/u],
    ['foreign producer', { producer: 'check/foreign' }, /producer must equal/u],
    ['empty conditions', { requiredConditions: [] }, /must be non-empty/u],
    ['missing condition', { requiredConditions: ['verdict-pass'] }, /is missing/u],
    ['duplicate conditions', { requiredConditions: ['verdict-pass', 'verdict-pass'] }, /duplicate verdict-pass/u],
    ['unknown condition', { requiredConditions: ['looks-good'] }, /unsupported condition/u],
    ['malformed verifier', { verifier: 'some verifier' }, /verifier is malformed/u],
    ['unsupported verifier', { verifier: 'fiction-v1' }, /verifier is unsupported/u],
  ])('rejects a %s descriptor', (_name, mutation, expected) => {
    const check = CHECK_REGISTRY[0]!;
    const requirement = { ...check.evidenceRequirements[0], ...mutation } as Record<string, unknown>;
    if ('verifier' in mutation && mutation.verifier === undefined) delete requirement.verifier;
    const mutated = withRequirements(check, [requirement as unknown as CheckEvidenceRequirement]);
    expect(() => projectCheckEvidenceRequirements([mutated])).toThrow(expected);
  });
});
