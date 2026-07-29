import { describe, expect, it } from 'vitest';
import { admitGitHubChangeIntent } from '../../../scripts/lib/github-change-intent.js';
import {
  GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR,
  validateGitHubChangeIntentDeclaration,
  validateGitHubChangeIntentTemplate,
} from '../../../scripts/lib/github-change-intent-declaration.js';

function declaration(visibility: 'internal' | 'public' | 'trust-boundary' = 'public'): Record<string, unknown> {
  return {
    sponsor: 'heyoub',
    hypothesis: 'The facade change removes one beginner-only concept.',
    affectedUserSurface: { visibility, areas: ['facade', 'starter'] },
    expectedOutcome: 'A fresh consumer completes the first feature with three concepts.',
    guardrails: ['no public package addition', 'preserve low-level semantics'],
    reversibility: { kind: 'reversible', rollback: 'Revert the facade projection.' },
    actorClass: 'agent',
    uncertainty: { level: 'medium', unknowns: ['browser host variation'] },
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

function block(payload: unknown = declaration()): string {
  return `Before\n\n<!-- liteship-change-intent\n${JSON.stringify(payload)}\n-->\n\nAfter`;
}

function input(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: 'pull-request',
    body: block(),
    sourceSha: 'a'.repeat(40),
    repository: { owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_repo' },
    actor: { login: 'heyoub', permission: 'admin' },
    ...overrides,
  };
}

describe('GitHub ChangeIntent host adapter', () => {
  it('keeps the required declaration discoverable and structurally valid in the PR template', () => {
    const template = `<!-- Replace ${GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR} before opening the PR. -->\n${block({
      ...declaration('internal'),
      sponsor: GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR,
    })}`;
    const parsed = validateGitHubChangeIntentTemplate(template);

    expect(parsed['sponsor']).toBe(GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR);
    expect(() =>
      validateGitHubChangeIntentDeclaration('pull_request', {
        pull_request: {
          body: template.replaceAll(GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR, 'heyoub'),
          user: { login: 'heyoub' },
        },
      }),
    ).not.toThrow();
  });

  it('returns an immutable cold-admission snapshot instead of retaining mutable JSON data', () => {
    const template = `<!-- Replace ${GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR} before opening the PR. -->\n${block({
      ...declaration('internal'),
      sponsor: GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR,
    })}`;
    const parsed = validateGitHubChangeIntentTemplate(template);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.affectedUserSurface)).toBe(true);
    expect(Object.isFrozen(parsed.affectedUserSurface.areas)).toBe(true);
    expect(Object.isFrozen(parsed.guardrails)).toBe(true);
    expect(Object.isFrozen(parsed.reversibility)).toBe(true);
    expect(Object.isFrozen(parsed.uncertainty)).toBe(true);
    expect(Object.isFrozen(parsed.uncertainty.unknowns)).toBe(true);
  });

  it('refuses a template that hides or silently pre-fills the author-bound sponsor', () => {
    expect(() => validateGitHubChangeIntentTemplate(block(declaration('internal')))).toThrow(/template sponsor/u);
    expect(() =>
      validateGitHubChangeIntentTemplate(
        block({ ...declaration('internal'), sponsor: GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR }),
      ),
    ).toThrow(/tell the author/u);
  });

  it('cold-validates the exact declaration and GitHub event author before planning', () => {
    expect(
      validateGitHubChangeIntentDeclaration('pull_request', {
        pull_request: { body: block(), user: { login: 'heyoub' } },
      }),
    ).toEqual({ kind: 'declared', sponsor: 'heyoub' });
    expect(validateGitHubChangeIntentDeclaration('push', {})).toEqual({ kind: 'fail-broad', event: 'push' });
  });

  it('cold-refuses the escaped malformed-block and sponsor-mismatch defects', () => {
    expect(() =>
      validateGitHubChangeIntentDeclaration('pull_request', {
        pull_request: { body: '<!-- liteship-change-intent {} -->', user: { login: 'heyoub' } },
      }),
    ).toThrow(/malformed/u);
    expect(() =>
      validateGitHubChangeIntentDeclaration('pull_request', {
        pull_request: { body: block(), user: { login: 'someone-else' } },
      }),
    ).toThrow(/does not match/u);
  });

  it.each([
    ['invalid actor class', { ...declaration(), actorClass: 'robot' }, /actorClass/u],
    ['empty guardrails', { ...declaration(), guardrails: [] }, /guardrails must not be empty/u],
    [
      'malformed affected surface',
      { ...declaration(), affectedUserSurface: { visibility: 'public', areas: [] } },
      /areas must not be empty/u,
    ],
    [
      'foreign nested surface key',
      { ...declaration(), affectedUserSurface: { visibility: 'public', areas: ['facade'], secret: true } },
      /keys must be exactly/u,
    ],
    [
      'malformed reversibility',
      { ...declaration(), reversibility: { kind: 'reversible', rollback: '' } },
      /rollback must be a non-empty string/u,
    ],
    [
      'duplicate uncertainty values',
      { ...declaration(), uncertainty: { level: 'high', unknowns: ['same', 'same'] } },
      /duplicate values/u,
    ],
  ])('cold-refuses %s before planning', (_name, candidate, message) => {
    expect(() =>
      validateGitHubChangeIntentDeclaration('pull_request', {
        pull_request: { body: block(candidate), user: { login: 'heyoub' } },
      }),
    ).toThrow(message);
  });

  it.each([
    ['null event payload', null, /payload must be an object/u],
    ['array event payload', [], /payload must be an object/u],
    ['missing pull object', {}, /pull_request object/u],
    ['scalar pull object', { pull_request: 7 }, /pull_request object/u],
    ['missing body', { pull_request: { user: { login: 'heyoub' } } }, /no body/u],
    ['missing author', { pull_request: { body: block() } }, /no author/u],
    ['empty author login', { pull_request: { body: block(), user: { login: '' } } }, /no author login/u],
    [
      'duplicate declaration',
      { pull_request: { body: `${block()}\n${block()}`, user: { login: 'heyoub' } } },
      /exactly one/u,
    ],
  ])('cold-refuses %s', (_name, payload, message) => {
    expect(() => validateGitHubChangeIntentDeclaration('pull_request', payload)).toThrow(message);
  });

  it('binds declared semantics to GitHub-verified repository, commit, and owner facts', () => {
    const result = admitGitHubChangeIntent(input());
    expect(result.origin).toBe('declared');
    expect(result.admission.accepted).toBe(true);
    expect(result.intent.sponsor).toEqual({
      value: { login: 'heyoub', ownership: 'code-owner' },
      provenance: 'github-verified',
    });
    expect(result.intent.sourceSha).toEqual({ value: 'a'.repeat(40), provenance: 'github-verified' });
    expect(result.intent.repositoryIdentity).toEqual({
      value: { host: 'github.com', owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_repo' },
      provenance: 'github-verified',
    });
    expect(result.intent.hypothesis.provenance).toBe('agent-self-declared');
    expect(result.intent.affectedUserSurface.provenance).toBe('agent-self-declared');
    expect(result.intent.actorClass.provenance).toBe('agent-self-declared');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each(['admin', 'maintain'])('maps GitHub %s permission to verified code-owner authority', (permission) => {
    const result = admitGitHubChangeIntent(input({ actor: { login: 'heyoub', permission } }));
    expect(result.intent.sponsor.value.ownership).toBe('code-owner');
  });

  it.each(['write', 'triage', 'read', 'none'])(
    'refuses a public declaration when GitHub permission is %s',
    (permission) => {
      expect(() => admitGitHubChangeIntent(input({ actor: { login: 'heyoub', permission } }))).toThrow(
        /missing-sponsor-ownership/u,
      );
    },
  );

  it.each(['push', 'tag'])('creates only an explicit internal fail-broad intent for a blockless %s', (event) => {
    const result = admitGitHubChangeIntent(input({ event, body: null }));
    expect(result.origin).toBe(`${event}-fail-broad`);
    expect(result.intent.affectedUserSurface.value).toEqual({
      visibility: 'internal',
      areas: ['repository maintenance'],
    });
    expect(result.intent.actorClass.value).toBe('automation');
    expect(result.intent.uncertainty.value).toEqual({
      level: 'high',
      unknowns: ['authored semantic intent is absent'],
    });
    expect(result.intent.guardrails.value).toContain('select full authority');
  });

  it('does not synthesize intent for a pull request with no exact block', () => {
    expect(() => admitGitHubChangeIntent(input({ body: 'ordinary pull request body' }))).toThrow(
      /requires exactly one/u,
    );
  });

  it('refuses a declared sponsor other than the GitHub-verified actor', () => {
    expect(() =>
      admitGitHubChangeIntent(input({ body: block({ ...declaration(), sponsor: 'someone-else' }) })),
    ).toThrow(/does not match/u);
  });

  it('accepts GitHub login casing differences but retains the trusted canonical login', () => {
    const result = admitGitHubChangeIntent(input({ body: block({ ...declaration(), sponsor: 'HEYOUB' }) }));
    expect(result.intent.sponsor.value.login).toBe('heyoub');
  });

  it.each([
    ['duplicate blocks', `${block()}\n${block()}`],
    ['missing opening newline', '<!-- liteship-change-intent{}\n-->'],
    ['missing closing newline', '<!-- liteship-change-intent\n{}-->'],
    ['invalid JSON', '<!-- liteship-change-intent\n{\n-->'],
  ])('refuses %s', (_name, body) => {
    expect(() => admitGitHubChangeIntent(input({ body }))).toThrow(TypeError);
  });

  it('cold-refuses an agent declaration without execution BEFORE the CI matrix (PR #190 review)', () => {
    // The kernel refuses agent-execution-not-declared at full admission — but
    // full admission runs AFTER the expensive authority matrix. The cold
    // validator is the only pre-matrix check, so it must mirror the rule.
    const payload = { ...declaration('internal'), execution: null };
    expect(() =>
      validateGitHubChangeIntentDeclaration('pull_request', {
        pull_request: { body: block(payload), user: { login: 'heyoub' } },
      }),
    ).toThrow(/agent-execution-not-declared/u);
    expect(() => admitGitHubChangeIntent(input({ body: block(payload) }))).toThrow(/agent-execution-not-declared/u);
  });

  it('cold-refuses approve/release autonomy BEFORE the matrix — a PR-body classification is self-declared (PR #190 review)', () => {
    for (const autonomy of ['approve', 'release'] as const) {
      for (const actorClass of ['human', 'agent', 'automation'] as const) {
        const payload = { ...declaration('internal'), actorClass } as Record<string, unknown> & {
          execution: { autonomy: string };
        };
        payload.execution = { ...(declaration('internal')['execution'] as Record<string, unknown>), autonomy } as never;
        expect(
          () =>
            validateGitHubChangeIntentDeclaration('pull_request', {
              pull_request: { body: block(payload), user: { login: 'heyoub' } },
            }),
          `${actorClass}+${autonomy} must cold-refuse`,
        ).toThrow(/privileged-autonomy-actor-not-verified/u);
        expect(() => admitGitHubChangeIntent(input({ body: block(payload) }))).toThrow(
          /privileged-autonomy-actor-not-verified/u,
        );
      }
    }
  });

  it('refuses foreign or missing declarative fields', () => {
    expect(() => admitGitHubChangeIntent(input({ body: block({ ...declaration(), surprise: true }) }))).toThrow(
      /keys must be exactly/u,
    );
    const missing = declaration();
    delete missing['guardrails'];
    expect(() => admitGitHubChangeIntent(input({ body: block(missing) }))).toThrow(/keys must be exactly/u);
  });

  it('strictly rejects foreign trusted-fact fields', () => {
    expect(() => admitGitHubChangeIntent({ ...input(), installationId: 17 })).toThrow(/keys must be exactly/u);
    expect(() =>
      admitGitHubChangeIntent(
        input({ repository: { owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_repo', private: false } }),
      ),
    ).toThrow(/keys must be exactly/u);
  });
});
