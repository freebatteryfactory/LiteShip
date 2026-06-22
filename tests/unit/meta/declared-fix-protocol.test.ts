/**
 * The AGENT-SAFETY META-GAUNTLET (the "raccoon rule"), phases B + C — the
 * DECLARED-FIX PROTOCOL's BITE proofs + the gate's self-proof.
 *
 * Phase A blocks a silent standards weakening on the COMMIT path. B/C add the
 * DECLARED-FIX admission control: an agent's auto-fix must DECLARE its intent + scope
 * + size-cap + before/after receipts, and `verifyDeclaredFix` admits it ONLY when the
 * actual change matches the declaration AND weakens nothing. This suite proves it has
 * teeth:
 *
 *  BITE (each rejection class):
 *   - SCOPE-CREEP        — a fix that touches a file outside its declared scope rejects.
 *   - SCOPE-CREEP (std)  — a fix that changes an undeclared standards element rejects.
 *   - SIZE-EXCEEDED      — a fix larger than its declared cap rejects.
 *   - UNSIGNED-WEAKENING — a fix that weakens a standard with no sign-off rejects (phase A).
 *   - FORBIDDEN-WEAKENING— a fix that weakens the always-blocking floor rejects (never-signable).
 *   - FORGED-RECEIPT     — a forged / missing / file-hiding receipt rejects.
 *  ADMIT:
 *   - a clean in-scope, sized, non-weakening, receipted fix is ADMITTED.
 *  ONE ENGINE:
 *   - the SAME verdict drives the gate (phase C) — a rejected verdict BLOCKS the gate;
 *     an admitted one does not; an absent declared-fix is SILENT.
 *  SELF-PROOF:
 *   - the gate self-proves against the authority ratchet (red caught, green clean,
 *     mutation — a verifier blind to scope-creep — killed).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import {
  verifyDeclaredFix,
  fileMatchesGlob,
  declaredFixProtocolGate,
  verifyGate,
  runGates,
  memoryContext,
  type DeclaredFix,
  type FixReceipt,
  type MeasuredFixReality,
  type StandardsElement,
  type StandardsWaiver,
  type DeclaredFixFacts,
} from '@czap/gauntlet';
import { contentAddressOf } from '@czap/core';

/** A fixed reference date — the sign-off-expiry classification is stable regardless of `now`. */
const NOW = new Date('2026-06-22T00:00:00.000Z');

/** A small canonical standards surface (the BEFORE state the fixes mutate). */
const BEFORE_ELEMENTS: readonly StandardsElement[] = [
  { _tag: 'floor', name: 'mutation-score::packages/core/src/fnv.ts', value: 0.9, direction: 'higher-is-stronger' },
  { _tag: 'always-blocking', ruleId: 'gauntlet/no-placeholder' },
  {
    _tag: 'gate',
    ruleId: 'gauntlet/no-bare-throw',
    set: 'LITESHIP_GATES',
    level: 'L4',
    redFixtureCount: 1,
    greenFixtureCount: 1,
    mutationFixtureCount: 1,
  },
];

const ALWAYS_BLOCKING = new Set(['gauntlet/no-placeholder']);

/** The host-minted content address of a standards surface (via the ONE @czap/core kernel). */
function addressOf(elements: readonly StandardsElement[]): string {
  return String(contentAddressOf(elements));
}

/** Build a receipt the way the host would — addressing the surface + the touched files. */
function receipt(elements: readonly StandardsElement[], touched: readonly string[]): FixReceipt {
  const touchedDigests: Record<string, string> = {};
  for (const f of touched) touchedDigests[f] = String(contentAddressOf({ file: f }));
  return {
    _tag: 'fix-receipt',
    standardsAddress: addressOf(elements),
    touchedDigests,
    stampedAt: NOW.toISOString(),
  };
}

/**
 * Assemble a (declared fix, measured reality) pair from the parts under test. Defaults
 * model a CLEAN fix; each BITE overrides exactly the dimension it attacks.
 */
function scenario(opts: {
  readonly fileGlobs?: readonly string[];
  readonly standardsKeys?: readonly string[];
  readonly maxFiles?: number;
  readonly maxLines?: number;
  readonly changedFiles?: readonly string[];
  readonly changedLines?: number;
  readonly after?: readonly StandardsElement[];
  readonly signoffs?: readonly StandardsWaiver[];
  /** Override the declared receipts (for forged-receipt proofs); else honest receipts. */
  readonly beforeReceipt?: FixReceipt;
  readonly afterReceipt?: FixReceipt;
}): { fix: DeclaredFix; reality: MeasuredFixReality } {
  const changedFiles = opts.changedFiles ?? ['packages/core/src/fnv.ts'];
  const after = opts.after ?? BEFORE_ELEMENTS;
  const fix: DeclaredFix = {
    _tag: 'declared-fix',
    intent: 'fix the fnv off-by-one in packages/core/src/fnv.ts',
    scope: {
      fileGlobs: opts.fileGlobs ?? ['packages/core/src/fnv.ts'],
      standardsElementKeys: opts.standardsKeys ?? [],
    },
    sizeCap: { maxChangedFiles: opts.maxFiles ?? 1, maxChangedLines: opts.maxLines ?? 5 },
    beforeReceipt: opts.beforeReceipt ?? receipt(BEFORE_ELEMENTS, []),
    afterReceipt: opts.afterReceipt ?? receipt(after, changedFiles),
  };
  const reality: MeasuredFixReality = {
    actualChange: { _tag: 'actual-change', changedFiles, changedLines: opts.changedLines ?? 3 },
    standardsBefore: BEFORE_ELEMENTS,
    standardsAfter: after,
    measuredBeforeAddress: addressOf(BEFORE_ELEMENTS),
    measuredAfterAddress: addressOf(after),
    signoffs: opts.signoffs ?? [],
    alwaysBlockingRuleIds: ALWAYS_BLOCKING,
    now: NOW,
  };
  return { fix, reality };
}

/** The rejection classes present in a verdict. */
function rejectionClasses(fix: DeclaredFix, reality: MeasuredFixReality): readonly string[] {
  const v = verifyDeclaredFix(fix, reality);
  return v._tag === 'rejected' ? v.reasons.map((r) => r.class) : [];
}

describe('the declared-fix verifier ADMITS a clean fix', () => {
  test('an in-scope, sized, non-weakening, receipted fix is admitted', () => {
    const { fix, reality } = scenario({});
    expect(verifyDeclaredFix(fix, reality)).toEqual({ _tag: 'admitted' });
  });

  test('the verifier is deterministic (twice → identical verdict)', () => {
    const { fix, reality } = scenario({ changedFiles: ['packages/core/src/other.ts'] });
    expect(verifyDeclaredFix(fix, reality)).toEqual(verifyDeclaredFix(fix, reality));
  });
});

describe('BITE — each rejection class is caught', () => {
  test('SCOPE-CREEP — a file touched outside the declared scope rejects', () => {
    const { fix, reality } = scenario({
      changedFiles: ['packages/core/src/fnv.ts', 'packages/gauntlet/src/gates/no-placeholder.ts'],
    });
    expect(rejectionClasses(fix, reality)).toContain('scope-creep');
  });

  test('SCOPE-CREEP (standards) — an undeclared standards element change rejects (even a strengthen)', () => {
    // Raise a floor (a STRENGTHEN) but do NOT declare the element key → undeclared edit.
    const after: readonly StandardsElement[] = BEFORE_ELEMENTS.map((e) =>
      e._tag === 'floor' && e.name === 'mutation-score::packages/core/src/fnv.ts' ? { ...e, value: 0.95 } : e,
    );
    const { fix, reality } = scenario({ after, standardsKeys: [] });
    const v = verifyDeclaredFix(fix, reality);
    expect(v._tag).toBe('rejected');
    expect(rejectionClasses(fix, reality)).toContain('scope-creep');
  });

  test('SCOPE-CREEP (standards) — DECLARING the changed element key admits the strengthen', () => {
    const after: readonly StandardsElement[] = BEFORE_ELEMENTS.map((e) =>
      e._tag === 'floor' && e.name === 'mutation-score::packages/core/src/fnv.ts' ? { ...e, value: 0.95 } : e,
    );
    const { fix, reality } = scenario({
      after,
      standardsKeys: ['floor::mutation-score::packages/core/src/fnv.ts'],
    });
    expect(verifyDeclaredFix(fix, reality)).toEqual({ _tag: 'admitted' });
  });

  test('SIZE-EXCEEDED — too many changed files rejects', () => {
    const { fix, reality } = scenario({
      fileGlobs: ['packages/core/src/**'],
      changedFiles: ['packages/core/src/a.ts', 'packages/core/src/b.ts'],
      maxFiles: 1,
    });
    expect(rejectionClasses(fix, reality)).toContain('size-exceeded');
  });

  test('SIZE-EXCEEDED — too many changed lines rejects', () => {
    const { fix, reality } = scenario({ changedLines: 999, maxLines: 5 });
    expect(rejectionClasses(fix, reality)).toContain('size-exceeded');
  });

  test('UNSIGNED-WEAKENING — lowering a floor with no sign-off rejects (reuses phase A)', () => {
    const after: readonly StandardsElement[] = BEFORE_ELEMENTS.map((e) =>
      e._tag === 'floor' && e.name === 'mutation-score::packages/core/src/fnv.ts' ? { ...e, value: 0.5 } : e,
    );
    // Declare the standards key so the ONLY remaining reason is the unsigned weakening.
    const { fix, reality } = scenario({
      after,
      standardsKeys: ['floor::mutation-score::packages/core/src/fnv.ts'],
    });
    expect(rejectionClasses(fix, reality)).toContain('unsigned-weakening');
  });

  test('UNSIGNED-WEAKENING — an OWNER-SIGNED floor weakening is admitted (the honest escape)', () => {
    const after: readonly StandardsElement[] = BEFORE_ELEMENTS.map((e) =>
      e._tag === 'floor' && e.name === 'mutation-score::packages/core/src/fnv.ts' ? { ...e, value: 0.5 } : e,
    );
    const signoff: StandardsWaiver = {
      elementKey: 'floor::mutation-score::packages/core/src/fnv.ts',
      weakening: 'floor-lowered',
      owner: 'heyoub',
      justification: 'intentional floor relaxation under review',
      expiry: '2999-01-01',
    };
    const { fix, reality } = scenario({
      after,
      standardsKeys: ['floor::mutation-score::packages/core/src/fnv.ts'],
      signoffs: [signoff],
    });
    expect(verifyDeclaredFix(fix, reality)).toEqual({ _tag: 'admitted' });
  });

  test('FORBIDDEN-WEAKENING — removing an always-blocking rule rejects + can NEVER be signed', () => {
    const after: readonly StandardsElement[] = BEFORE_ELEMENTS.filter(
      (e) => !(e._tag === 'always-blocking' && e.ruleId === 'gauntlet/no-placeholder'),
    );
    const signoff: StandardsWaiver = {
      elementKey: 'always-blocking::gauntlet/no-placeholder',
      weakening: 'always-blocking-removed',
      owner: 'raccoon',
      justification: 'trust me',
      expiry: '2999-01-01',
    };
    const { fix, reality } = scenario({
      after,
      standardsKeys: ['always-blocking::gauntlet/no-placeholder'],
      signoffs: [signoff],
    });
    const classes = rejectionClasses(fix, reality);
    // Even WITH a sign-off, the always-blocking weakening is forbidden (never-signable).
    expect(classes).toContain('forbidden-weakening');
    expect(classes).not.toContain('unsigned-weakening');
  });

  test('FORGED-RECEIPT — an after-receipt address that does not match measured reality rejects', () => {
    const { fix, reality } = scenario({
      afterReceipt: {
        _tag: 'fix-receipt',
        standardsAddress: 'fnv1a:forged00',
        touchedDigests: { 'packages/core/src/fnv.ts': 'x' },
        stampedAt: NOW.toISOString(),
      },
    });
    expect(rejectionClasses(fix, reality)).toContain('forged-receipt');
  });

  test('FORGED-RECEIPT — a missing (empty) standards address rejects', () => {
    const { fix, reality } = scenario({
      beforeReceipt: { _tag: 'fix-receipt', standardsAddress: '', touchedDigests: {}, stampedAt: NOW.toISOString() },
    });
    expect(rejectionClasses(fix, reality)).toContain('forged-receipt');
  });

  test('FORGED-RECEIPT — a receipt that HIDES a touched file rejects', () => {
    // The change touches a file the after-receipt's touchedDigests omits.
    const { fix, reality } = scenario({
      fileGlobs: ['packages/core/src/**'],
      changedFiles: ['packages/core/src/fnv.ts', 'packages/core/src/extra.ts'],
      maxFiles: 2,
      // Honest surface address, but the receipt only records ONE of the two touched files.
      afterReceipt: receipt(BEFORE_ELEMENTS, ['packages/core/src/fnv.ts']),
    });
    expect(rejectionClasses(fix, reality)).toContain('forged-receipt');
  });
});

describe('BITE — a rejection reports EVERY reason (exhaustive, not first-fail-wins)', () => {
  test('a fix that creeps scope AND exceeds size AND forges a receipt reports all three', () => {
    const { fix, reality } = scenario({
      changedFiles: ['packages/core/src/fnv.ts', 'packages/web/src/sneaky.ts'],
      maxFiles: 1,
      afterReceipt: {
        _tag: 'fix-receipt',
        standardsAddress: 'fnv1a:forged00',
        touchedDigests: { 'packages/core/src/fnv.ts': 'x', 'packages/web/src/sneaky.ts': 'y' },
        stampedAt: NOW.toISOString(),
      },
    });
    const classes = rejectionClasses(fix, reality);
    expect(classes).toContain('scope-creep');
    expect(classes).toContain('size-exceeded');
    expect(classes).toContain('forged-receipt');
  });
});

describe('ONE ENGINE — the SAME verdict drives the commit gate (phase C)', () => {
  function gateBlocks(facts: DeclaredFixFacts): boolean {
    const ctx = { ...memoryContext({}), declaredFix: facts };
    return runGates([declaredFixProtocolGate], ctx, { now: NOW }).blocked;
  }

  test('a REJECTED fix BLOCKS the gate', () => {
    const { fix, reality } = scenario({
      changedFiles: ['packages/core/src/fnv.ts', 'packages/web/src/sneaky.ts'],
    });
    const verdict = verifyDeclaredFix(fix, reality);
    expect(gateBlocks({ intent: fix.intent, verdict })).toBe(true);
  });

  test('an ADMITTED fix does NOT block the gate', () => {
    const { fix, reality } = scenario({});
    const verdict = verifyDeclaredFix(fix, reality);
    expect(verdict._tag).toBe('admitted');
    expect(gateBlocks({ intent: fix.intent, verdict })).toBe(false);
  });

  test('NO declared-fix present (a normal commit) is SILENT (zero findings, no block)', () => {
    const result = runGates([declaredFixProtocolGate], memoryContext({}), { now: NOW });
    expect(result.findings).toEqual([]);
    expect(result.blocked).toBe(false);
  });
});

describe('the scope glob matcher — `*` within a segment, `**` across (no inline slash-normalizer)', () => {
  test('a literal path matches itself only', () => {
    expect(fileMatchesGlob('packages/core/src/fnv.ts', 'packages/core/src/fnv.ts')).toBe(true);
    expect(fileMatchesGlob('packages/core/src/other.ts', 'packages/core/src/fnv.ts')).toBe(false);
  });

  test('`*` matches within ONE segment but NOT across `/`', () => {
    expect(fileMatchesGlob('packages/core/src/fnv.ts', 'packages/core/src/*.ts')).toBe(true);
    // `*` must not cross a slash: a nested file is NOT matched by a single-star.
    expect(fileMatchesGlob('packages/core/src/sub/fnv.ts', 'packages/core/src/*.ts')).toBe(false);
  });

  test('`**` matches across segments', () => {
    expect(fileMatchesGlob('packages/core/src/sub/deep/fnv.ts', 'packages/core/src/**')).toBe(true);
    expect(fileMatchesGlob('packages/web/src/fnv.ts', 'packages/core/src/**')).toBe(false);
  });

  test('a regex metachar in a path is matched LITERALLY (escaped), never as a pattern', () => {
    // The `.` in `.ts` must be a literal dot, not "any char" — otherwise `axts` would match.
    expect(fileMatchesGlob('packages/core/src/axts', 'packages/core/src/a.ts')).toBe(false);
    expect(fileMatchesGlob('packages/core/src/a.ts', 'packages/core/src/a.ts')).toBe(true);
  });
});

describe('SELF-PROOF — the gate earns blocking authority via the ratchet', () => {
  test('red caught, green clean, mutation killed (a verifier blind to scope-creep is caught)', () => {
    const proof = verifyGate(declaredFixProtocolGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});
