import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { admitDeclaredFix } from '../../scripts/lib/declared-fix-admission.js';
import { admissionScenario, changeIntent, diffFile } from '../support/declared-fix-admission.js';

describe('DeclaredFix host-admission properties', () => {
  it('is invariant to the order of explicit diff file facts', () => {
    const files = [
      diffFile('packages/core/src/a.ts', 'a0\n', 'a1\n'),
      diffFile('packages/core/src/b.ts', 'b0\n', 'b1\n'),
      diffFile('packages/core/src/c.ts', 'c0\n', 'c1\n'),
    ];
    const canonical = admissionScenario({ files });
    const expected = admitDeclaredFix(canonical);

    fc.assert(
      fc.property(fc.shuffledSubarray(files, { minLength: files.length, maxLength: files.length }), (permutation) => {
        const actual = admitDeclaredFix({
          ...canonical,
          diff: { ...canonical.diff, files: permutation },
        });
        expect(actual).toEqual(expected);
      }),
      { seed: 0xd1ffac7, numRuns: 60 },
    );
  });

  it('rejects every post-declaration byte mutation and changes the host receipt identity', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 96 }),
        fc.nat(),
        fc.integer({ min: 1, max: 255 }),
        (authored, rawIndex, delta) => {
          const originalBytes = Uint8Array.from(authored);
          const original = admissionScenario({
            files: [
              {
                path: 'packages/core/src/fnv.ts',
                addedLines: 1,
                removedLines: 1,
                beforeBytes: new Uint8Array([0]),
                afterBytes: originalBytes,
              },
            ],
          });
          const accepted = admitDeclaredFix(original);
          const mutatedBytes = Uint8Array.from(originalBytes);
          const index = rawIndex % mutatedBytes.length;
          mutatedBytes[index] = (mutatedBytes[index]! + delta) % 256;
          const rejected = admitDeclaredFix({
            ...original,
            diff: {
              ...original.diff,
              files: [{ ...original.diff.files[0]!, afterBytes: mutatedBytes }],
            },
          });

          expect(accepted.accepted).toBe(true);
          expect(rejected.accepted).toBe(false);
          expect(rejected.receipt.hostRefusals).toContain('receipt-mismatch');
          expect(rejected.receipt.receiptId).not.toBe(accepted.receipt.receiptId);
        },
      ),
      { seed: 0xb17efac, numRuns: 90 },
    );
  });

  it('never admits agent, self-declared, or non-owner sponsorship for policy paths', () => {
    const hostileSponsor = fc.oneof(
      fc.constant({
        actorClass: 'agent' as const,
        actorProvenance: 'github-verified' as const,
        sponsorOwnership: 'repository-owner' as const,
        sponsorProvenance: 'github-verified' as const,
      }),
      fc.constant({
        actorClass: 'automation' as const,
        actorProvenance: 'github-verified' as const,
        sponsorOwnership: 'code-owner' as const,
        sponsorProvenance: 'github-verified' as const,
      }),
      fc.constant({
        actorClass: 'human' as const,
        actorProvenance: 'agent-self-declared' as const,
        sponsorOwnership: 'repository-owner' as const,
        sponsorProvenance: 'github-verified' as const,
      }),
      fc.constant({
        actorClass: 'human' as const,
        actorProvenance: 'github-verified' as const,
        sponsorOwnership: 'repository-owner' as const,
        sponsorProvenance: 'agent-self-declared' as const,
      }),
      fc.constant({
        actorClass: 'human' as const,
        actorProvenance: 'github-verified' as const,
        sponsorOwnership: 'maintainer' as const,
        sponsorProvenance: 'github-verified' as const,
      }),
    );

    fc.assert(
      fc.property(
        fc.constantFrom(
          '.github/workflows/ci.yml',
          'packages/gauntlet/src/engine.ts',
          'packages/command/src/checks/registry.ts',
          'scripts/standards-integrity-gate.ts',
          'scripts/lib/change-intent.ts',
          'traceability/standards-snapshot.json',
        ),
        hostileSponsor,
        (path, sponsor) => {
          const result = admitDeclaredFix(
            admissionScenario({
              files: [diffFile(path)],
              intent: changeIntent(sponsor),
            }),
          );
          expect(result.accepted).toBe(false);
          const expectedCode =
            sponsor.actorClass !== 'human'
              ? 'policy-sponsor-not-human'
              : sponsor.actorProvenance !== 'github-verified' || sponsor.sponsorProvenance !== 'github-verified'
                ? 'policy-sponsor-self-declared'
                : 'policy-sponsor-not-owner';
          expect(result.receipt.hostRefusals).toEqual(expect.arrayContaining([expectedCode]));
        },
      ),
      { seed: 0x5a0b50, numRuns: 90 },
    );
  });
});
