import { describe, expect, it } from 'vitest';
import { admitChangeIntent, buildChangeIntent, parseChangeIntent } from '../../../scripts/lib/change-intent.js';

function validInput(visibility: 'internal' | 'public' | 'trust-boundary' = 'public'): Record<string, unknown> {
  return {
    schemaVersion: 1,
    sponsor: {
      value: { login: 'heyoub', ownership: 'repository-owner' },
      provenance: 'github-verified',
    },
    hypothesis: {
      value: 'The change makes the paved road easier to reason about.',
      provenance: 'agent-self-declared',
    },
    affectedUserSurface: {
      value: { visibility, areas: ['liteship facade', 'starter'] },
      provenance: 'agent-self-declared',
    },
    expectedOutcome: {
      value: 'A fresh consumer completes define, apply, and inspect without internal imports.',
      provenance: 'agent-self-declared',
    },
    guardrails: {
      value: ['no public package addition', 'preserve low-level semantics'],
      provenance: 'agent-self-declared',
    },
    reversibility: {
      value: { kind: 'reversible', rollback: 'Revert the isolated facade projection.' },
      provenance: 'agent-self-declared',
    },
    actorClass: { value: 'agent', provenance: 'agent-self-declared' },
    uncertainty: {
      value: { level: 'medium', unknowns: ['packed npm consumer behavior'] },
      provenance: 'agent-self-declared',
    },
    sourceSha: { value: 'a'.repeat(40), provenance: 'github-verified' },
    repositoryIdentity: {
      value: {
        host: 'github.com',
        owner: 'freebatteryfactory',
        name: 'LiteShip',
        nodeId: 'R_kgDOExample',
      },
      provenance: 'github-verified',
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('internal ChangeIntent', () => {
  it('normalizes set-like fields and mints one canonical SHA-256 identity', () => {
    const input = validInput();
    const reversed = Object.fromEntries(Object.entries(input).reverse()) as Record<string, unknown>;
    const surface = clone(reversed['affectedUserSurface']) as {
      value: { visibility: string; areas: string[] };
      provenance: string;
    };
    surface.value.areas.reverse();
    reversed['affectedUserSurface'] = surface;
    const guardrails = clone(reversed['guardrails']) as { value: string[]; provenance: string };
    guardrails.value.reverse();
    reversed['guardrails'] = guardrails;

    const first = buildChangeIntent(input);
    const second = buildChangeIntent(reversed);
    expect(first.intentId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(second.intentId).toBe(first.intentId);
    expect(first.affectedUserSurface.value.areas).toEqual(['liteship facade', 'starter']);
    expect(first.guardrails.value).toEqual(['no public package addition', 'preserve low-level semantics']);
  });

  it('deep-freezes every retained object and array instead of retaining caller ownership', () => {
    const input = validInput();
    const intent = buildChangeIntent(input);
    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.sponsor)).toBe(true);
    expect(Object.isFrozen(intent.sponsor.value)).toBe(true);
    expect(Object.isFrozen(intent.affectedUserSurface.value.areas)).toBe(true);
    expect(Object.isFrozen(intent.guardrails.value)).toBe(true);
    expect(Object.isFrozen(intent.uncertainty.value.unknowns)).toBe(true);

    (input['guardrails'] as { value: string[] }).value.push('late mutation');
    expect(intent.guardrails.value).not.toContain('late mutation');
  });

  it('round-trips serialized evidence and refuses identity forgery', () => {
    const intent = buildChangeIntent(validInput());
    const parsed = parseChangeIntent(JSON.parse(JSON.stringify(intent)));
    expect(parsed).toEqual(intent);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(() => parseChangeIntent({ ...intent, intentId: `sha256:${'0'.repeat(64)}` })).toThrow(/identity mismatch/u);
  });

  it.each([
    ['missing field', (input: Record<string, unknown>) => delete input['sponsor']],
    ['foreign root field', (input: Record<string, unknown>) => (input['approval'] = true)],
    [
      'foreign nested field',
      (input: Record<string, unknown>) =>
        ((input['sponsor'] as { value: Record<string, unknown> }).value['team'] = 'core'),
    ],
    [
      'abbreviated SHA',
      (input: Record<string, unknown>) => ((input['sourceSha'] as { value: string }).value = 'abc123'),
    ],
    [
      'duplicate guardrail',
      (input: Record<string, unknown>) =>
        ((input['guardrails'] as { value: string[] }).value = ['same guard', 'same guard']),
    ],
    [
      'unknown provenance',
      (input: Record<string, unknown>) =>
        ((input['hypothesis'] as { provenance: string }).provenance = 'probably-github'),
    ],
    [
      'foreign repository host',
      (input: Record<string, unknown>) =>
        ((input['repositoryIdentity'] as { value: { host: string } }).value.host = 'example.com'),
    ],
  ])('strictly rejects %s', (_name, mutate) => {
    const input = validInput();
    mutate(input);
    expect(() => buildChangeIntent(input)).toThrow(TypeError);
  });

  it('admits a GitHub-verified owner for a public or trust-boundary change', () => {
    for (const visibility of ['public', 'trust-boundary'] as const) {
      const intent = buildChangeIntent(validInput(visibility));
      expect(admitChangeIntent(intent)).toEqual({ accepted: true, intentId: intent.intentId, reasons: [] });
    }
  });

  it('refuses missing ownership even for an internal change', () => {
    const input = validInput('internal');
    (input['sponsor'] as { value: { ownership: string } }).value.ownership = 'none';
    const admission = admitChangeIntent(buildChangeIntent(input));
    expect(admission.accepted).toBe(false);
    expect(admission.reasons).toContain('missing-sponsor-ownership');
  });

  it('refuses self-declared or non-owner authority for public/trust changes', () => {
    const input = validInput('trust-boundary');
    (input['sponsor'] as { provenance: string; value: { ownership: string } }).provenance = 'agent-self-declared';
    (input['sponsor'] as { value: { ownership: string } }).value.ownership = 'maintainer';
    (input['sourceSha'] as { provenance: string }).provenance = 'agent-self-declared';
    (input['repositoryIdentity'] as { provenance: string }).provenance = 'agent-self-declared';
    const admission = admitChangeIntent(buildChangeIntent(input));
    expect(admission).toMatchObject({
      accepted: false,
      reasons: [
        'public-or-trust-repository-not-github-verified',
        'public-or-trust-source-not-github-verified',
        'public-or-trust-sponsor-lacks-owner-authority',
        'public-or-trust-sponsor-not-github-verified',
      ],
    });
    expect(Object.isFrozen(admission.reasons)).toBe(true);
  });

  it('addresses provenance itself so a verification-class change cannot hide under an old ID', () => {
    const verified = validInput('internal');
    const declared = clone(verified);
    (declared['sourceSha'] as { provenance: string }).provenance = 'agent-self-declared';
    expect(buildChangeIntent(declared).intentId).not.toBe(buildChangeIntent(verified).intentId);
  });
});
