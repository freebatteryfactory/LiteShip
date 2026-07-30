import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { admitGitHubChangeIntent } from '../../scripts/lib/github-change-intent.js';
import { validateGitHubChangeIntentDeclaration } from '../../scripts/lib/github-change-intent-declaration.js';

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
    execution: {
      executionId: 'session-gh',
      model: { provider: 'anthropic', id: 'claude-fable-5' },
      toolScopes: ['read', 'write'],
      budgets: { wallClockMs: null, tokens: null },
      digests: { prompt: null, context: null, toolPolicy: null },
      actionTrace: null,
      autonomy: 'execute',
    },
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
const authoredText = fc.string({ minLength: 1, maxLength: 48 }).filter((value) => value.trim().length > 0);
const authoredSet = fc.uniqueArray(authoredText, {
  minLength: 1,
  maxLength: 4,
  selector: (value) => value.trim(),
});

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

  it('cold validation preserves arbitrary harmless prose and login casing', () => {
    fc.assert(
      fc.property(harmlessText, harmlessText, fc.boolean(), (before, after, uppercase) => {
        const sponsor = uppercase ? 'HEYOUB' : 'heyoub';
        const payload = { ...declaration(), sponsor };
        const result = validateGitHubChangeIntentDeclaration('pull_request', {
          pull_request: {
            body: `${before}\n${comment(payload)}\n${after}`,
            user: { login: 'heyoub' },
          },
        });
        expect(result).toEqual({ kind: 'declared', sponsor: 'heyoub' });
      }),
      { seed: 0xc01d, numRuns: 100 },
    );
  });

  it('cold validation rejects every non-author sponsor before planning', () => {
    const foreignLogin = fc
      .stringMatching(/^[a-z][a-z0-9-]{0,20}$/u)
      .filter((login) => login.toLowerCase() !== 'heyoub');
    fc.assert(
      fc.property(foreignLogin, (sponsor) => {
        expect(() =>
          validateGitHubChangeIntentDeclaration('pull_request', {
            pull_request: {
              body: comment({ ...declaration(), sponsor }),
              user: { login: 'heyoub' },
            },
          }),
        ).toThrow(/does not match/u);
      }),
      { seed: 0x5a0e, numRuns: 80 },
    );
  });

  it('cold validation rejects any missing required declaration field', () => {
    fc.assert(
      fc.property(fc.constantFrom(...Object.keys(declaration())), (missing) => {
        const candidate = declaration();
        delete candidate[missing];
        expect(() =>
          validateGitHubChangeIntentDeclaration('pull_request', {
            pull_request: { body: comment(candidate), user: { login: 'heyoub' } },
          }),
        ).toThrow(/keys must be exactly/u);
      }),
      { seed: 0x0eac, numRuns: 60 },
    );
  });

  it('cold and full admission converge on malformed nested declarations', () => {
    const invalidDeclarations = [
      { ...declaration(), actorClass: 'robot' },
      { ...declaration(), guardrails: [] },
      { ...declaration(), affectedUserSurface: { visibility: 'public', areas: [] } },
      { ...declaration(), reversibility: { kind: 'reversible', rollback: '' } },
      { ...declaration(), uncertainty: { level: 'medium', unknowns: ['duplicate', 'duplicate'] } },
    ];
    fc.assert(
      fc.property(fc.constantFrom(...invalidDeclarations), (candidate) => {
        expect(() =>
          validateGitHubChangeIntentDeclaration('pull_request', {
            pull_request: { body: comment(candidate), user: { login: 'heyoub' } },
          }),
        ).toThrow();
        expect(() => admitGitHubChangeIntent(input({ body: comment(candidate) }))).toThrow();
      }),
      { seed: 0xc01dc01d, numRuns: 50 },
    );
  });

  it('cold parsing and full admission preserve every valid authored semantic axis', () => {
    fc.assert(
      fc.property(
        authoredText,
        authoredText,
        authoredText,
        authoredSet,
        authoredSet,
        fc.uniqueArray(authoredText, { maxLength: 4, selector: (value) => value.trim() }),
        fc.constantFrom('internal', 'public', 'trust-boundary'),
        fc.constantFrom('human', 'agent', 'automation'),
        fc.constantFrom('low', 'medium', 'high'),
        fc.boolean(),
        (
          hypothesis,
          expectedOutcome,
          rollbackOrRationale,
          areas,
          guardrails,
          unknowns,
          visibility,
          actorClass,
          level,
          reversible,
        ) => {
          const payload = {
            sponsor: 'heyoub',
            hypothesis,
            affectedUserSurface: { visibility, areas },
            expectedOutcome,
            guardrails,
            reversibility: reversible
              ? { kind: 'reversible', rollback: rollbackOrRationale }
              : { kind: 'irreversible', rationale: rollbackOrRationale },
            actorClass,
            uncertainty: { level, unknowns },
            // Always-declared execution keeps every generated actorClass
            // admissible (agent actors REQUIRE it; autonomy 'execute' is below
            // the human-owned approve/release tiers for every class).
            execution: {
              executionId: 'session-prop-gh',
              model: null,
              toolScopes: ['read', 'write'],
              budgets: { wallClockMs: null, tokens: null },
              digests: { prompt: null, context: null, toolPolicy: null },
              actionTrace: null,
              autonomy: 'execute',
            },
          };
          const cold = validateGitHubChangeIntentDeclaration('pull_request', {
            pull_request: { body: comment(payload), user: { login: 'heyoub' } },
          });
          const full = admitGitHubChangeIntent(input({ body: comment(payload) }));

          expect(cold).toEqual({ kind: 'declared', sponsor: 'heyoub' });
          expect(full.intent.hypothesis.value).toBe(hypothesis.trim());
          expect(full.intent.expectedOutcome.value).toBe(expectedOutcome.trim());
          expect(full.intent.affectedUserSurface.value).toEqual({
            visibility,
            areas: areas.map((value) => value.trim()).sort((left, right) => left.localeCompare(right)),
          });
          expect(full.intent.guardrails.value).toEqual(
            guardrails.map((value) => value.trim()).sort((left, right) => left.localeCompare(right)),
          );
          expect(full.intent.actorClass.value).toBe(actorClass);
          expect(full.intent.uncertainty.value).toEqual({
            level,
            unknowns: unknowns.map((value) => value.trim()).sort((left, right) => left.localeCompare(right)),
          });
          expect(full.intent.reversibility.value).toEqual(
            reversible
              ? { kind: 'reversible', rollback: rollbackOrRationale.trim() }
              : { kind: 'irreversible', rationale: rollbackOrRationale.trim() },
          );
        },
      ),
      { seed: 0x5e6a17c, numRuns: 120 },
    );
  });

  it('cold validation remains explicitly fail-broad for every non-PR event name', () => {
    fc.assert(
      fc.property(harmlessText, (event) => {
        fc.pre(event !== 'pull_request');
        expect(validateGitHubChangeIntentDeclaration(event, null)).toEqual({ kind: 'fail-broad', event });
      }),
      { seed: 0xfa11, numRuns: 80 },
    );
  });
});
