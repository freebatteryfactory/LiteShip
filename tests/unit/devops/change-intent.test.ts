import { describe, expect, it } from 'vitest';
import { admitChangeIntent, buildChangeIntent, parseChangeIntent } from '../../../scripts/lib/change-intent.js';

function validInput(visibility: 'internal' | 'public' | 'trust-boundary' = 'public'): Record<string, unknown> {
  return {
    schemaVersion: 2,
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
    execution: {
      value: {
        executionId: 'session-fd5a8c98',
        model: { provider: 'anthropic', id: 'claude-fable-5' },
        toolScopes: ['network', 'read', 'write'],
        budgets: { wallClockMs: null, tokens: 500000 },
        digests: { prompt: null, context: `sha256:${'c'.repeat(64)}`, toolPolicy: null },
        actionTrace: null,
        autonomy: 'execute',
      },
      provenance: 'agent-self-declared',
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

  it('refuses an AGENT actor without declared execution identity (issue #163 fail-closed)', () => {
    const input = validInput('internal');
    (input['execution'] as { value: unknown }).value = null;
    const admission = admitChangeIntent(buildChangeIntent(input));
    expect(admission.accepted).toBe(false);
    expect(admission.reasons).toContain('agent-execution-not-declared');
  });

  it('an explicit-null execution is admissible for humans and HOST-DERIVED automation only', () => {
    // human (any provenance): a human run has no machine execution to attribute.
    const human = validInput('internal');
    (human['actorClass'] as { value: string }).value = 'human';
    (human['execution'] as { value: unknown }).value = null;
    expect(admitChangeIntent(buildChangeIntent(human)).accepted).toBe(true);
    // github-verified automation: the host itself derived the classification
    // (the push/tag fail-broad fallback) — null execution is the honest state.
    const derived = validInput('internal');
    (derived['actorClass'] as { value: string; provenance: string }).value = 'automation';
    (derived['actorClass'] as { value: string; provenance: string }).provenance = 'github-verified';
    (derived['execution'] as { value: unknown }).value = null;
    expect(admitChangeIntent(buildChangeIntent(derived)).accepted).toBe(true);
  });

  it('a SELF-DECLARED automation actor without execution is refused (PR #190 review — no attribution dodge)', () => {
    // The bypass class: an agent-authored PR declares actorClass 'automation'
    // with execution null and escapes the agent attribution requirement. A
    // self-declared non-human always requires a declared execution identity.
    const input = validInput('internal');
    (input['actorClass'] as { value: string }).value = 'automation';
    (input['execution'] as { value: unknown }).value = null;
    const admission = admitChangeIntent(buildChangeIntent(input));
    expect(admission.accepted).toBe(false);
    expect(admission.reasons).toContain('agent-execution-not-declared');
  });

  it('refuses a non-human execution claiming the human-owned autonomy tiers (no self-approval)', () => {
    for (const actorClass of ['agent', 'automation'] as const) {
      for (const autonomy of ['approve', 'release'] as const) {
        const input = validInput('internal');
        (input['actorClass'] as { value: string }).value = actorClass;
        (input['execution'] as { value: { autonomy: string } }).value.autonomy = autonomy;
        const admission = admitChangeIntent(buildChangeIntent(input));
        expect(admission.accepted, `${actorClass}+${autonomy} must refuse`).toBe(false);
        expect(admission.reasons).toContain('execution-self-approval-refused');
      }
    }
  });

  it('a VERIFIED human actor may hold approve/release autonomy (human ownership retains the gavel)', () => {
    const input = validInput('internal');
    (input['actorClass'] as { value: string; provenance: string }).value = 'human';
    (input['actorClass'] as { value: string; provenance: string }).provenance = 'github-verified';
    (input['execution'] as { value: { autonomy: string } }).value.autonomy = 'approve';
    expect(admitChangeIntent(buildChangeIntent(input)).accepted).toBe(true);
  });

  it('a SELF-DECLARED human claiming approve/release is refused (PR #190 review — no species self-attestation)', () => {
    // The bypass class: the GitHub adapter verifies sponsor login + permission
    // but stamps actorClass 'agent-self-declared' — so an agent could declare
    // actorClass 'human' and hold the human-owned tiers. The classification
    // must be host-verified before it unlocks approve/release.
    for (const autonomy of ['approve', 'release'] as const) {
      const input = validInput('internal');
      (input['actorClass'] as { value: string }).value = 'human';
      (input['execution'] as { value: { autonomy: string } }).value.autonomy = autonomy;
      const admission = admitChangeIntent(buildChangeIntent(input));
      expect(admission.accepted, `self-declared human + ${autonomy} must refuse`).toBe(false);
      expect(admission.reasons).toContain('privileged-autonomy-actor-not-verified');
    }
  });

  it('digest fields refuse raw text — private context is structurally unrepresentable', () => {
    const input = validInput('internal');
    (input['execution'] as { value: { digests: { prompt: unknown } } }).value.digests.prompt =
      'You are a helpful assistant with access to secrets.';
    expect(() => buildChangeIntent(input)).toThrow(/sha256:<64-hex> content address \(never raw content\)/u);
  });

  it('a foreign field smuggled into the execution block is refused (exact keys)', () => {
    const input = validInput('internal');
    (input['execution'] as { value: Record<string, unknown> }).value['rawPrompt'] = 'leak me';
    expect(() => buildChangeIntent(input)).toThrow(/keys must be exactly/u);
  });

  it('an undeclared tool scope is refused (authority cannot be invented)', () => {
    const input = validInput('internal');
    (input['execution'] as { value: { toolScopes: unknown } }).value.toolScopes = ['read', 'sudo'];
    expect(() => buildChangeIntent(input)).toThrow(/toolScopes must be a subset/u);
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
