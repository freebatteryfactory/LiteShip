/**
 * Check diagnostics are a public explanation projection, not a second authored
 * interpretation of the check registry. These properties bind every check's
 * title, claim, and remediation to its stable diagnostic identity and prove the
 * comparison catches drift in either direction.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CHECK_REGISTRY, type CheckDefinition } from '@liteship/command';
import { DIAGNOSTIC_REGISTRY, explainDiagnostic, type DiagnosticEntry } from '@liteship/error';

type CheckCode = `check/${string}`;
type ProjectionField = 'title' | 'explanation' | 'remediation' | 'area' | 'owner';

interface ProjectionMismatch {
  readonly code: CheckCode;
  readonly field: ProjectionField | 'missing';
}

const CHECK_DIAGNOSTIC_OWNER = '@liteship/command/checks';

function projectedDiagnostic(check: CheckDefinition): DiagnosticEntry {
  return {
    title: check.title,
    explanation: check.claim,
    remediation: check.remediation,
    area: 'check',
    owner: CHECK_DIAGNOSTIC_OWNER,
  };
}

function diagnosticMismatches(
  checks: readonly CheckDefinition[],
  diagnostics: Readonly<Record<string, DiagnosticEntry>>,
): readonly ProjectionMismatch[] {
  const mismatches: ProjectionMismatch[] = [];
  for (const check of checks) {
    const code = check.id as CheckCode;
    const observed = diagnostics[code];
    if (observed === undefined) {
      mismatches.push({ code, field: 'missing' });
      continue;
    }
    const expected = projectedDiagnostic(check);
    for (const field of ['title', 'explanation', 'remediation', 'area', 'owner'] as const) {
      if (observed[field] !== expected[field]) mismatches.push({ code, field });
    }
  }
  return mismatches;
}

function checkDiagnostics(): Readonly<Record<string, DiagnosticEntry>> {
  return Object.fromEntries(Object.entries(DIAGNOSTIC_REGISTRY).filter(([code]) => code.startsWith('check/')));
}

function replaceDiagnostic(
  diagnostics: Readonly<Record<string, DiagnosticEntry>>,
  code: string,
  replacement: DiagnosticEntry | undefined,
): Readonly<Record<string, DiagnosticEntry>> {
  const next = { ...diagnostics };
  if (replacement === undefined) delete next[code];
  else next[code] = replacement;
  return next;
}

const checkArbitrary = fc.constantFrom(...CHECK_REGISTRY);

describe('check diagnostic projection', () => {
  it('is an exact projection of every canonical check definition', () => {
    expect(diagnosticMismatches(CHECK_REGISTRY, checkDiagnostics())).toEqual([]);
  });

  it('contains exactly the canonical check identities with no orphan explanation', () => {
    const expected = CHECK_REGISTRY.map((check) => check.id).sort();
    const observed = Object.keys(checkDiagnostics()).sort();
    expect(observed).toEqual(expected);
  });

  it('resolves every check through the same public explanation function', () => {
    for (const check of CHECK_REGISTRY) {
      expect(explainDiagnostic(check.id)).toEqual(projectedDiagnostic(check));
    }
  });

  it('does not depend on registry iteration order', () => {
    fc.assert(
      fc.property(fc.shuffledSubarray(CHECK_REGISTRY, { minLength: CHECK_REGISTRY.length }), (permutation) => {
        return diagnosticMismatches(permutation, checkDiagnostics()).length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it('detects a missing diagnostic at the exact check identity', () => {
    fc.assert(
      fc.property(checkArbitrary, (check) => {
        const diagnostics = replaceDiagnostic(checkDiagnostics(), check.id, undefined);
        return diagnosticMismatches(CHECK_REGISTRY, diagnostics).some(
          (mismatch) => mismatch.code === check.id && mismatch.field === 'missing',
        );
      }),
      { numRuns: 100 },
    );
  });

  it('detects a mutated title without misclassifying the other fields', () => {
    fc.assert(
      fc.property(checkArbitrary, fc.string({ minLength: 1 }), (check, suffix) => {
        const original = checkDiagnostics()[check.id]!;
        const diagnostics = replaceDiagnostic(checkDiagnostics(), check.id, {
          ...original,
          title: `${original.title}:${suffix}`,
        });
        const own = diagnosticMismatches(CHECK_REGISTRY, diagnostics).filter((mismatch) => mismatch.code === check.id);
        return own.length === 1 && own[0]?.field === 'title';
      }),
      { numRuns: 100 },
    );
  });

  it('detects a mutated explanation without misclassifying remediation', () => {
    fc.assert(
      fc.property(checkArbitrary, fc.string({ minLength: 1 }), (check, suffix) => {
        const original = checkDiagnostics()[check.id]!;
        const diagnostics = replaceDiagnostic(checkDiagnostics(), check.id, {
          ...original,
          explanation: `${original.explanation}:${suffix}`,
        });
        const own = diagnosticMismatches(CHECK_REGISTRY, diagnostics).filter((mismatch) => mismatch.code === check.id);
        return own.length === 1 && own[0]?.field === 'explanation';
      }),
      { numRuns: 100 },
    );
  });

  it('detects a mutated remediation without misclassifying explanation', () => {
    fc.assert(
      fc.property(checkArbitrary, fc.string({ minLength: 1 }), (check, suffix) => {
        const original = checkDiagnostics()[check.id]!;
        const diagnostics = replaceDiagnostic(checkDiagnostics(), check.id, {
          ...original,
          remediation: `${original.remediation}:${suffix}`,
        });
        const own = diagnosticMismatches(CHECK_REGISTRY, diagnostics).filter((mismatch) => mismatch.code === check.id);
        return own.length === 1 && own[0]?.field === 'remediation';
      }),
      { numRuns: 100 },
    );
  });

  it('detects a diagnostic placed in the wrong area', () => {
    fc.assert(
      fc.property(checkArbitrary, (check) => {
        const original = checkDiagnostics()[check.id]!;
        const diagnostics = replaceDiagnostic(checkDiagnostics(), check.id, {
          ...original,
          area: 'cli',
        });
        return diagnosticMismatches(CHECK_REGISTRY, diagnostics).some(
          (mismatch) => mismatch.code === check.id && mismatch.field === 'area',
        );
      }),
      { numRuns: 100 },
    );
  });

  it('detects a diagnostic assigned to the wrong semantic owner', () => {
    fc.assert(
      fc.property(checkArbitrary, (check) => {
        const original = checkDiagnostics()[check.id]!;
        const diagnostics = replaceDiagnostic(checkDiagnostics(), check.id, {
          ...original,
          owner: '@liteship/cli',
        });
        return diagnosticMismatches(CHECK_REGISTRY, diagnostics).some(
          (mismatch) => mismatch.code === check.id && mismatch.field === 'owner',
        );
      }),
      { numRuns: 100 },
    );
  });

  it('keeps diagnostic identity stable across metadata-preserving object copies', () => {
    fc.assert(
      fc.property(checkArbitrary, (check) => {
        const copied = { ...check } satisfies CheckDefinition;
        return JSON.stringify(projectedDiagnostic(copied)) === JSON.stringify(projectedDiagnostic(check));
      }),
      { numRuns: 100 },
    );
  });

  it('refuses invented check-shaped identities through the explanation surface', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9-]{4,24}$/u), (slug) => {
        const code = `check/__invented-${slug}`;
        return explainDiagnostic(code) === undefined;
      }),
      { numRuns: 100 },
    );
  });

  it('keeps every projected field non-empty and directly actionable', () => {
    for (const check of CHECK_REGISTRY) {
      const diagnostic = projectedDiagnostic(check);
      expect(diagnostic.title.trim()).not.toBe('');
      expect(diagnostic.explanation.trim()).not.toBe('');
      expect(diagnostic.remediation.trim()).not.toBe('');
      expect(diagnostic.owner).toBe(CHECK_DIAGNOSTIC_OWNER);
      expect(diagnostic.area).toBe('check');
    }
  });
});
