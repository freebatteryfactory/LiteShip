import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { admitGitHubChangeIntent } from '../../scripts/lib/github-change-intent.js';

function declaration(visibility: 'internal' | 'public' | 'trust-boundary' = 'public'): Record<string, unknown> {
  return {
    sponsor: 'heyoub',
    hypothesis: 'The change should improve the governed surface.',
    affectedUserSurface: { visibility, areas: ['facade'] },
    expectedOutcome: 'The selected proof observes the expected behavior.',
    guardrails: ['do not widen public API'],
    reversibility: { kind: 'reversible', rollback: 'Revert the isolated change.' },
    actorClass: 'agent',
    uncertainty: { level: 'medium', unknowns: ['host variance'] },
  };
}

const comment = (payload: unknown): string => `<!-- liteship-change-intent\n${JSON.stringify(payload)}\n-->`;

function input(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: 'pull-request',
    body: comment(declaration()),
    sourceSha: 'a'.repeat(40),
    repository: { owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_repo' },
    actor: { login: 'heyoub', permission: 'admin' },
    ...overrides,
  };
}

const harmlessText = fc.string({ maxLength: 80 }).filter((value) => !value.includes('<!-- liteship-change-intent'));
const hex40 = fc
  .array(fc.constantFrom(...'0123456789abcdef'), { minLength: 40, maxLength: 40 })
  .map((digits) => digits.join(''));

describe('GitHub ChangeIntent adapter properties', () => {
  it('ignores harmless surrounding prose while preserving the addressed declaration', () => {
    fc.assert(
      fc.property(harmlessText, harmlessText, (before, after) => {
        const bare = admitGitHubChangeIntent(input());
        const surrounded = admitGitHubChangeIntent(input({ body: `${before}\n${comment(declaration())}\n${after}` }));
        expect(surrounded.intent.intentId).toBe(bare.intent.intentId);
      }),
      { seed: 0x607b, numRuns: 80 },
    );
  });

  it('admits public and trust declarations only for admin or maintain permission', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('public', 'trust-boundary'),
        fc.constantFrom('admin', 'maintain', 'write', 'triage', 'read', 'none'),
        (visibility, permission) => {
          const candidate = input({
            body: comment(declaration(visibility)),
            actor: { login: 'heyoub', permission },
          });
          if (permission === 'admin' || permission === 'maintain') {
            expect(admitGitHubChangeIntent(candidate).admission.accepted).toBe(true);
          } else {
            expect(() => admitGitHubChangeIntent(candidate)).toThrow(/refused/u);
          }
        },
      ),
      { seed: 0x0a7e, numRuns: 100 },
    );
  });

  it('rejects every duplicated exact block regardless of surrounding prose', () => {
    fc.assert(
      fc.property(harmlessText, (middle) => {
        expect(() =>
          admitGitHubChangeIntent(input({ body: `${comment(declaration())}\n${middle}\n${comment(declaration())}` })),
        ).toThrow(/exactly one/u);
      }),
      { seed: 0xd0b1e, numRuns: 60 },
    );
  });

  it('creates the same explicit internal fail-broad intent for every blockless push body', () => {
    fc.assert(
      fc.property(harmlessText, (body) => {
        const absent = admitGitHubChangeIntent(input({ event: 'push', body: null }));
        const proseOnly = admitGitHubChangeIntent(input({ event: 'push', body }));
        expect(proseOnly.origin).toBe('push-fail-broad');
        expect(proseOnly.intent.intentId).toBe(absent.intent.intentId);
        expect(proseOnly.intent.affectedUserSurface.value.visibility).toBe('internal');
      }),
      { seed: 0xfa11b, numRuns: 70 },
    );
  });

  it('addresses trusted source SHA changes even when declaration bytes are identical', () => {
    fc.assert(
      fc.property(hex40, (sha) => {
        fc.pre(sha !== 'a'.repeat(40));
        const baseline = admitGitHubChangeIntent(input());
        const changed = admitGitHubChangeIntent(input({ sourceSha: sha }));
        expect(changed.intent.intentId).not.toBe(baseline.intent.intentId);
      }),
      { seed: 0x5a17, numRuns: 70 },
    );
  });

  it('refuses arbitrary foreign declarative keys instead of ignoring metadata', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^foreign_[a-z]{1,12}$/), fc.jsonValue(), (key, value) => {
        expect(() => admitGitHubChangeIntent(input({ body: comment({ ...declaration(), [key]: value }) }))).toThrow(
          /keys must be exactly/u,
        );
      }),
      { seed: 0xf0e16, numRuns: 70 },
    );
  });
});
