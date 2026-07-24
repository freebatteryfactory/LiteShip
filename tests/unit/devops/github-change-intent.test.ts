import { describe, expect, it } from 'vitest';
import { admitGitHubChangeIntent } from '../../../scripts/lib/github-change-intent.js';

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
