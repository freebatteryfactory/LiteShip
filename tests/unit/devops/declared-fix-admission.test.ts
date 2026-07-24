import { describe, expect, it } from 'vitest';
import {
  admitDeclaredFix,
  recomputeFixFacts,
  type DeclaredFixAdmissionInput,
  type GitDiffFacts,
} from '../../../scripts/lib/declared-fix-admission.js';
import { admitChangeIntent } from '../../../scripts/lib/change-intent.js';
import {
  FIX_HEAD_SHA,
  FIX_NOW,
  FIX_STANDARDS,
  admission,
  admissionScenario,
  changeIntent,
  diffFile,
} from '../../support/declared-fix-admission.js';

function refusalCodes(input: DeclaredFixAdmissionInput): readonly string[] {
  return admitDeclaredFix(input).receipt.hostRefusals;
}

describe('DeclaredFix host admission', () => {
  it('admits an honest in-scope fix and emits a deterministic canonical receipt', () => {
    const first = admission();
    const second = admission();

    expect(first.accepted).toBe(true);
    expect(first.receipt.verifierVerdict).toEqual({ _tag: 'admitted' });
    expect(first.receipt.hostRefusals).toEqual([]);
    expect(first.receipt.receiptId).toBe(second.receipt.receiptId);
    expect(first.receipt.receiptId).toMatch(/^fnv1a:[0-9a-f]{8}$/u);
  });

  it('delegates measured scope and line ceilings to the existing verifier', () => {
    const outOfScope = admission({
      files: [diffFile(), diffFile('packages/core/src/extra.ts')],
      fileGlobs: ['packages/core/src/fnv.ts'],
      maxChangedFiles: 2,
      maxChangedLines: 4,
    });
    expect(outOfScope.accepted).toBe(false);
    expect(outOfScope.receipt.verifierVerdict).toMatchObject({
      _tag: 'rejected',
      reasons: expect.arrayContaining([expect.objectContaining({ class: 'scope-creep' })]),
    });

    const oversized = admission({ maxChangedLines: 1 });
    expect(oversized.accepted).toBe(false);
    expect(oversized.receipt.verifierVerdict).toMatchObject({
      _tag: 'rejected',
      reasons: expect.arrayContaining([expect.objectContaining({ class: 'size-exceeded' })]),
    });
  });

  it('rejects a declaration whose file digests do not match the explicit diff bytes', () => {
    const original = admissionScenario();
    const tampered: GitDiffFacts = {
      ...original.diff,
      files: [diffFile('packages/core/src/fnv.ts', 'export const value = 1;\n', 'export const value = 3;\n')],
    };
    const result = admitDeclaredFix({ ...original, diff: tampered });

    expect(result.receipt.verifierVerdict).toEqual({ _tag: 'admitted' });
    expect(result.receipt.hostRefusals).toContain('receipt-mismatch');
    expect(result.accepted).toBe(false);
  });

  it.each([
    {
      name: 'agent actor',
      intent: changeIntent({ actorClass: 'agent' }),
      code: 'policy-sponsor-not-human',
    },
    {
      name: 'automation actor',
      intent: changeIntent({ actorClass: 'automation' }),
      code: 'policy-sponsor-not-human',
    },
    {
      name: 'self-declared actor provenance',
      intent: changeIntent({ actorProvenance: 'agent-self-declared' }),
      code: 'policy-sponsor-self-declared',
    },
    {
      name: 'self-declared sponsor provenance',
      intent: changeIntent({ sponsorProvenance: 'agent-self-declared' }),
      code: 'policy-sponsor-self-declared',
    },
    {
      name: 'maintainer without owner authority',
      intent: changeIntent({ sponsorOwnership: 'maintainer' }),
      code: 'policy-sponsor-not-owner',
    },
  ] as const)('rejects $name for a policy change', ({ intent, code }) => {
    const result = admission({
      files: [diffFile('packages/gauntlet/src/engine.ts')],
      intent,
    });
    expect(result.accepted).toBe(false);
    expect(result.receipt.hostRefusals).toContain(code);
  });

  it('admits a policy change only with a verified human owner sponsor', () => {
    const result = admission({
      files: [diffFile('packages/gauntlet/src/engine.ts')],
      intent: changeIntent({
        actorClass: 'human',
        actorProvenance: 'github-verified',
        sponsorOwnership: 'code-owner',
        sponsorProvenance: 'github-verified',
      }),
    });
    expect(result.accepted).toBe(true);
  });

  it('applies the same human-owner rule to a standards change outside policy paths', () => {
    const after = FIX_STANDARDS.map((element) =>
      element._tag === 'floor' ? { ...element, value: element.value + 0.01 } : element,
    );
    const result = admission({
      standards: {
        before: FIX_STANDARDS,
        after,
        signoffs: [],
        alwaysBlockingRuleIds: new Set<string>(),
      },
      standardsElementKeys: ['floor::mutation-score::packages/core/src/fnv.ts'],
      intent: changeIntent({ actorClass: 'agent' }),
    });
    expect(result.receipt.verifierVerdict).toEqual({ _tag: 'admitted' });
    expect(result.receipt.hostRefusals).toContain('policy-sponsor-not-human');
    expect(result.accepted).toBe(false);
  });

  it('freezes the complete addressed receipt, including verifier rejection details', () => {
    const result = admission({ maxChangedLines: 0 });
    expect(result.receipt.verifierVerdict._tag).toBe('rejected');
    expect(Object.isFrozen(result.receipt)).toBe(true);
    expect(Object.isFrozen(result.receipt.verifierVerdict)).toBe(true);
    if (result.receipt.verifierVerdict._tag === 'rejected') {
      expect(Object.isFrozen(result.receipt.verifierVerdict.reasons)).toBe(true);
      expect(Object.isFrozen(result.receipt.verifierVerdict.reasons[0])).toBe(true);
    }
  });

  it('recomputes ChangeIntent admission instead of trusting a supplied verdict', () => {
    const intent = changeIntent({ visibility: 'public', sponsorOwnership: 'none' });
    const forgedAdmission = { accepted: true as const, intentId: intent.intentId, reasons: [] as const };
    const input = admissionScenario({ intent, intentAdmission: forgedAdmission });
    const result = admitDeclaredFix(input);

    expect(result.accepted).toBe(false);
    expect(result.receipt.hostRefusals).toEqual(
      expect.arrayContaining(['change-intent-admission-mismatch', 'change-intent-refused']),
    );
    expect(admitChangeIntent(intent).accepted).toBe(false);
  });

  it('binds the admitted ChangeIntent source SHA to the measured diff head', () => {
    const intent = changeIntent({ sourceSha: '3'.repeat(40) });
    expect(refusalCodes(admissionScenario({ intent }))).toContain('source-sha-mismatch');
  });

  it('rejects malformed diff facts before minting a receipt', () => {
    const valid = admissionScenario();
    const invalidFiles = [
      [{ ...diffFile(), path: '../escape.ts' }],
      [diffFile(), diffFile()],
      [{ ...diffFile(), addedLines: -1 }],
      [{ ...diffFile(), beforeBytes: null, afterBytes: null }],
    ];

    for (const files of invalidFiles) {
      expect(() =>
        recomputeFixFacts({ baseSha: valid.diff.baseSha, headSha: FIX_HEAD_SHA, files }, valid.standards, FIX_NOW),
      ).toThrow(TypeError);
    }

    expect(() => recomputeFixFacts({ ...valid.diff, headSha: 'short' }, valid.standards, FIX_NOW)).toThrow(
      /full Git SHA/u,
    );
  });

  it('permits dots in normalized filenames without permitting traversal segments', () => {
    const measured = recomputeFixFacts(
      {
        baseSha: '1'.repeat(40),
        headSha: FIX_HEAD_SHA,
        files: [diffFile('packages/core/src/version..compat.ts')],
      },
      admissionScenario().standards,
      FIX_NOW,
    );
    expect(measured.actualChange.changedFiles).toEqual(['packages/core/src/version..compat.ts']);
  });
});
