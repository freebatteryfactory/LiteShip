import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { admitChangeIntent, buildChangeIntent, parseChangeIntent } from '../../scripts/lib/change-intent.js';

function input(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    sponsor: {
      value: { login: 'heyoub', ownership: 'repository-owner' },
      provenance: 'github-verified',
    },
    hypothesis: { value: 'The model closes an evidence gap.', provenance: 'agent-self-declared' },
    affectedUserSurface: {
      value: { visibility: 'public', areas: ['CLI', 'facade'] },
      provenance: 'agent-self-declared',
    },
    expectedOutcome: { value: 'The change has one inspectable intent.', provenance: 'agent-self-declared' },
    guardrails: { value: ['no public API', 'no per-PR file'], provenance: 'agent-self-declared' },
    reversibility: {
      value: { kind: 'reversible', rollback: 'Revert the internal evidence producer.' },
      provenance: 'agent-self-declared',
    },
    actorClass: { value: 'agent', provenance: 'agent-self-declared' },
    uncertainty: {
      value: { level: 'medium', unknowns: ['CI integration is deliberately out of scope'] },
      provenance: 'agent-self-declared',
    },
    sourceSha: { value: 'b'.repeat(40), provenance: 'github-verified' },
    repositoryIdentity: {
      value: { host: 'github.com', owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_repo' },
      provenance: 'github-verified',
    },
  };
}

const requiredFields = [
  'schemaVersion',
  'sponsor',
  'hypothesis',
  'affectedUserSurface',
  'expectedOutcome',
  'guardrails',
  'reversibility',
  'actorClass',
  'uncertainty',
  'sourceSha',
  'repositoryIdentity',
] as const;

describe('ChangeIntent hostile properties', () => {
  it('has the same identity for every key and set-like ordering', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(requiredFields, {
          minLength: requiredFields.length,
          maxLength: requiredFields.length,
        }),
        fc.boolean(),
        fc.boolean(),
        (fieldOrder, reverseAreas, reverseGuardrails) => {
          const original = input();
          if (reverseAreas) {
            (original['affectedUserSurface'] as { value: { areas: string[] } }).value.areas.reverse();
          }
          if (reverseGuardrails) (original['guardrails'] as { value: string[] }).value.reverse();
          const reordered = Object.fromEntries(fieldOrder.map((key) => [key, original[key]]));
          expect(buildChangeIntent(reordered).intentId).toBe(buildChangeIntent(input()).intentId);
        },
      ),
      { seed: 0xc1a0e, numRuns: 80 },
    );
  });

  it('rejects removal of every required field', () => {
    fc.assert(
      fc.property(fc.constantFrom(...requiredFields), (field) => {
        const candidate = input();
        delete candidate[field];
        expect(() => buildChangeIntent(candidate)).toThrow(TypeError);
      }),
      { seed: 0xde1e7e, numRuns: 60 },
    );
  });

  it('rejects arbitrary foreign fields at the root and provenance wrapper', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^foreign_[a-z]{1,12}$/), fc.jsonValue(), (field, value) => {
        const atRoot = input();
        atRoot[field] = value;
        expect(() => buildChangeIntent(atRoot)).toThrow(TypeError);

        const nested = input();
        (nested['hypothesis'] as Record<string, unknown>)[field] = value;
        expect(() => buildChangeIntent(nested)).toThrow(TypeError);
      }),
      { seed: 0xf0e16, numRuns: 70 },
    );
  });

  it('changes identity for every generated semantic hypothesis change', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,40}$/),
        fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,40}$/),
        (left, right) => {
          fc.pre(left.trim() !== right.trim());
          const first = input();
          const second = input();
          (first['hypothesis'] as { value: string }).value = left;
          (second['hypothesis'] as { value: string }).value = right;
          expect(buildChangeIntent(first).intentId).not.toBe(buildChangeIntent(second).intentId);
        },
      ),
      { seed: 0x1de17, numRuns: 80 },
    );
  });

  it('admits public/trust changes iff owner, source, and repository provenance are verified', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('public', 'trust-boundary'),
        fc.constantFrom('repository-owner', 'code-owner', 'maintainer', 'none'),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (visibility, ownership, sponsorVerified, sourceVerified, repositoryVerified) => {
          const candidate = input();
          (candidate['affectedUserSurface'] as { value: { visibility: string } }).value.visibility = visibility;
          (candidate['sponsor'] as { value: { ownership: string }; provenance: string }).value.ownership = ownership;
          (candidate['sponsor'] as { provenance: string }).provenance = sponsorVerified
            ? 'github-verified'
            : 'agent-self-declared';
          (candidate['sourceSha'] as { provenance: string }).provenance = sourceVerified
            ? 'github-verified'
            : 'agent-self-declared';
          (candidate['repositoryIdentity'] as { provenance: string }).provenance = repositoryVerified
            ? 'github-verified'
            : 'agent-self-declared';
          const admission = admitChangeIntent(buildChangeIntent(candidate));
          const expected =
            ['repository-owner', 'code-owner'].includes(ownership) &&
            sponsorVerified &&
            sourceVerified &&
            repositoryVerified;
          expect(admission.accepted).toBe(expected);
        },
      ),
      { seed: 0xad017, numRuns: 120 },
    );
  });

  it('rejects every generated forged SHA-256 identity', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...'0123456789abcdef'), { minLength: 64, maxLength: 64 }), (digits) => {
        const intent = buildChangeIntent(input());
        const forged = `sha256:${digits.join('')}`;
        fc.pre(forged !== intent.intentId);
        expect(() => parseChangeIntent({ ...intent, intentId: forged })).toThrow(/identity mismatch/u);
      }),
      { seed: 0xf046e, numRuns: 60 },
    );
  });
});
