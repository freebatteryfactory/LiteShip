/** Closed count algebra for claims that report a covered population. @module */

export interface ClaimCoverage {
  readonly present: number;
  readonly required: number;
  readonly missing: number;
}

function count(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
  return value;
}

/**
 * THE CLASS RULE — ANCHOR: every coverage claim with a present numerator.
 * ALLOWLIST: the claim also carries its required population and the missing
 * complement, and the three safe-integer counts close exactly. A ratio alone
 * cannot reveal which denominator was measured, so incomplete or non-closing
 * counts are refused rather than normalized.
 */
export function buildClaimCoverage(present: number, required: number): ClaimCoverage {
  const parsedPresent = count(present, 'claim coverage present');
  const parsedRequired = count(required, 'claim coverage required');
  if (parsedPresent > parsedRequired) {
    throw new TypeError('claim coverage present exceeds required');
  }
  return Object.freeze({
    present: parsedPresent,
    required: parsedRequired,
    missing: parsedRequired - parsedPresent,
  });
}

/** Strictly parse a serialized coverage claim and prove that its counts close. */
export function parseClaimCoverage(value: unknown, label = 'claim coverage'): ClaimCoverage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (JSON.stringify(keys) !== JSON.stringify(['missing', 'present', 'required'])) {
    throw new TypeError(`${label} keys are invalid`);
  }
  const present = count(record['present'], `${label} present`);
  const required = count(record['required'], `${label} required`);
  const missing = count(record['missing'], `${label} missing`);
  if (required !== present + missing) {
    throw new TypeError(`${label} counts do not close: required must equal present plus missing`);
  }
  return Object.freeze({ present, required, missing });
}

/** The stable ratio projection; an empty required population is not complete. */
export function claimCoverageRate(coverage: ClaimCoverage): number {
  return coverage.required === 0 ? 0 : coverage.present / coverage.required;
}
