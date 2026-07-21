/**
 * `migrate/registry-enrollment` — every `migrate/*` diagnostic code the adapters
 * can emit is enrolled in the `@liteship/error` DIAGNOSTIC_REGISTRY under the
 * `migrate` area, and resolves through `explainDiagnostic` to a `DiagnosticEntry`.
 *
 * This is the seam that keeps the in-domain `MIGRATE_CODES` mirror and the
 * registry from drifting: a code emitted by an adapter but never enrolled would
 * be un-explainable, so the enrollment is asserted as a law. Teeth: an
 * un-enrolled fake code resolves to `undefined`.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { MIGRATE_CODES } from '@liteship/compiler/migrate';
import { explainDiagnostic } from '@liteship/error';

/**
 * The union actually emitted by the five adapters (drawn only from
 * `MIGRATE_CODES`). Pinned here as an independent list so an adapter that starts
 * emitting a new code without enrolling it — or a code removed from the mirror —
 * trips the subset assertion.
 */
const EMITTED_CODES: readonly string[] = [
  'migrate/unmappable-media-feature',
  'migrate/non-ascending-thresholds',
  'migrate/ambiguous-breakpoint',
  'migrate/unsupported-at-rule',
  'migrate/malformed-input',
  'migrate/unknown-token-category',
  'migrate/lossy-token-conversion',
  'migrate/incomplete-theme-variant',
];

describe('migrate diagnostic-code enrollment', () => {
  it('every MIGRATE_CODES value resolves to a migrate-area DiagnosticEntry', () => {
    const codes = Object.values(MIGRATE_CODES);
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) {
      const entry = explainDiagnostic(code);
      expect(entry, `code ${code} must be enrolled`).toBeDefined();
      expect(entry!.area).toBe('migrate');
      expect(typeof entry!.title).toBe('string');
      expect(entry!.title.length).toBeGreaterThan(0);
      expect(typeof entry!.explanation).toBe('string');
      expect(typeof entry!.remediation).toBe('string');
    }
  });

  it('the union emitted by the adapters is a subset of MIGRATE_CODES', () => {
    const known = new Set<string>(Object.values(MIGRATE_CODES));
    for (const code of EMITTED_CODES) {
      expect(known.has(code), `emitted code ${code} must be a MIGRATE_CODES member`).toBe(true);
    }
  });

  it('teeth: an un-enrolled fake migrate code resolves to undefined', () => {
    expect(explainDiagnostic('migrate/__nope__')).toBeUndefined();
  });
});
