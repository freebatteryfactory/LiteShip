/** Pure projection and validation for check-owned delivery-evidence requirements. @module */

import type {
  CheckAuthority,
  CheckDefinition,
  CheckEvidenceCondition,
  CheckEvidenceKind,
  CheckEvidenceRequirement,
  CheckEvidenceVerifier,
  CheckProfile,
} from './definition.js';

const EVIDENCE_KINDS = new Set<CheckEvidenceKind>(['check-report']);

const REQUIRED_EVIDENCE_CONDITIONS = [
  'head-sha-match',
  'plan-id-match',
  'platform-match',
  'producer-match',
  'command-match',
  'verdict-pass',
  'digest-match',
] as const satisfies readonly CheckEvidenceCondition[];

const EVIDENCE_CONDITIONS = new Set<CheckEvidenceCondition>(REQUIRED_EVIDENCE_CONDITIONS);
const EVIDENCE_VERIFIERS = new Set<CheckEvidenceVerifier>(['delivery-evidence/check-report-v1']);

const REQUIREMENT_KEYS = ['id', 'kind', 'path', 'producer', 'requiredConditions', 'verifier'] as const;

const REQUIREMENT_KEY_SET = new Set<string>(REQUIREMENT_KEYS);
const CHECK_ID_PATTERN = /^check\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const EVIDENCE_ID_PATTERN = /^evidence\/check\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const VERIFIER_PATTERN = /^[a-z0-9]+(?:[/-][a-z0-9]+)*(?:-v[1-9][0-9]*)$/u;

/** The exact normalized row consumed by evidence-manifest construction. */
export interface CheckEvidenceManifestRequirement extends CheckEvidenceRequirement {
  readonly checkId: string;
  readonly command: string;
  readonly authority: CheckAuthority;
  readonly profiles: readonly CheckProfile[];
}

function fail(message: string): never {
  throw new TypeError(`invalid check evidence requirements: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(`${label} must be a non-empty trimmed string`);
  }
}

function assertRelativeArtifactPath(value: unknown, label: string): asserts value is string {
  assertNonEmptyString(value, label);
  if (
    value.includes('\\') ||
    value.startsWith('/') ||
    /^[A-Za-z]:\//u.test(value) ||
    value.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(`${label} must be a normalized repository-relative path`);
  }
}

function assertRequirement(
  check: CheckDefinition,
  value: unknown,
  index: number,
): asserts value is CheckEvidenceRequirement {
  const label = `${check.id}.evidenceRequirements[${index}]`;
  if (!isRecord(value)) fail(`${label} must be an object`);

  const keys = Object.keys(value);
  const missing = REQUIREMENT_KEYS.filter((key) => !Object.hasOwn(value, key));
  const foreign = keys.filter((key) => !REQUIREMENT_KEY_SET.has(key));
  if (missing.length > 0) fail(`${label} is missing ${missing.join(', ')}`);
  if (foreign.length > 0) fail(`${label} has foreign keys ${foreign.join(', ')}`);

  assertNonEmptyString(value.id, `${label}.id`);
  if (!EVIDENCE_ID_PATTERN.test(value.id)) fail(`${label}.id must match evidence/check/<slug>`);
  if (!EVIDENCE_KINDS.has(value.kind as CheckEvidenceKind)) fail(`${label}.kind is unsupported`);
  assertRelativeArtifactPath(value.path, `${label}.path`);
  assertNonEmptyString(value.producer, `${label}.producer`);
  if (value.producer !== check.id) fail(`${label}.producer must equal ${check.id}`);
  assertNonEmptyString(value.verifier, `${label}.verifier`);
  if (!VERIFIER_PATTERN.test(value.verifier)) fail(`${label}.verifier is malformed`);
  if (!EVIDENCE_VERIFIERS.has(value.verifier as CheckEvidenceVerifier)) fail(`${label}.verifier is unsupported`);

  if (!Array.isArray(value.requiredConditions) || value.requiredConditions.length === 0) {
    fail(`${label}.requiredConditions must be non-empty`);
  }
  const conditions = value.requiredConditions as unknown[];
  const seenConditions = new Set<string>();
  for (const condition of conditions) {
    if (typeof condition !== 'string' || !EVIDENCE_CONDITIONS.has(condition as CheckEvidenceCondition)) {
      fail(`${label}.requiredConditions contains an unsupported condition`);
    }
    if (seenConditions.has(condition)) fail(`${label}.requiredConditions contains duplicate ${condition}`);
    seenConditions.add(condition);
  }
  const missingConditions = REQUIRED_EVIDENCE_CONDITIONS.filter((condition) => !seenConditions.has(condition));
  if (missingConditions.length > 0) {
    fail(`${label}.requiredConditions is missing ${missingConditions.join(', ')}`);
  }
}

function sortedConditions(
  conditions: CheckEvidenceRequirement['requiredConditions'],
): CheckEvidenceRequirement['requiredConditions'] {
  const [first, ...rest] = [...conditions].sort();
  if (first === undefined) fail('validated evidence conditions became empty');
  return Object.freeze([first, ...rest]);
}

/** Derive the universal check-result obligation from the check's own canonical id. */
export function deriveCheckEvidenceRequirements(checkId: string): readonly [CheckEvidenceRequirement] {
  const slug = checkId.replace(/^check\//u, '');
  return Object.freeze([
    Object.freeze({
      id: `evidence/check/${slug}`,
      kind: 'check-report',
      path: `reports/checks/${slug}.json`,
      producer: checkId,
      requiredConditions: REQUIRED_EVIDENCE_CONDITIONS,
      verifier: 'delivery-evidence/check-report-v1',
    }),
  ]);
}

/**
 * Project a registry into deterministic, independently validated evidence
 * requirements. The input is the canonical registry itself; no check-id mirror
 * is accepted. A malformed or evidence-empty check fails closed.
 */
export function projectCheckEvidenceRequirements(
  registry: readonly CheckDefinition[],
): readonly CheckEvidenceManifestRequirement[] {
  const checkIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const projected: CheckEvidenceManifestRequirement[] = [];

  for (const check of registry) {
    if (!CHECK_ID_PATTERN.test(check.id)) fail(`check id is malformed: ${check.id}`);
    if (checkIds.has(check.id)) fail(`duplicate check id: ${check.id}`);
    checkIds.add(check.id);

    const requirements = (check as { readonly evidenceRequirements?: unknown }).evidenceRequirements;
    if (!Array.isArray(requirements) || requirements.length === 0) {
      fail(`${check.id} is complete but has no evidence requirements`);
    }

    for (const [index, requirement] of requirements.entries()) {
      assertRequirement(check, requirement, index);
      if (evidenceIds.has(requirement.id)) fail(`duplicate evidence id: ${requirement.id}`);
      evidenceIds.add(requirement.id);
      projected.push({
        ...requirement,
        requiredConditions: sortedConditions(requirement.requiredConditions),
        checkId: check.id,
        command: check.command,
        authority: check.authority,
        profiles: Object.freeze([...check.profiles].sort()),
      });
    }
  }

  projected.sort((left, right) => left.checkId.localeCompare(right.checkId) || left.id.localeCompare(right.id));
  return Object.freeze(projected.map((requirement) => Object.freeze(requirement)));
}
