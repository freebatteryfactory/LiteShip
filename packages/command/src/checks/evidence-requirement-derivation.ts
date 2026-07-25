/** Dependency-free derivation of the universal check evidence requirement. @module */

import type { CheckEvidenceCondition, CheckEvidenceRequirement } from './definition.js';

/** Conditions every check-result receipt must prove before it can carry authority. */
export const REQUIRED_EVIDENCE_CONDITIONS = Object.freeze([
  'head-sha-match',
  'plan-id-match',
  'platform-match',
  'producer-match',
  'command-match',
  'verdict-pass',
  'digest-match',
] as const satisfies readonly CheckEvidenceCondition[]);

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
