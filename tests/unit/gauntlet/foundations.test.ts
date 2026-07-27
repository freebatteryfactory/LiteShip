// PROVES: INV-GATE-AUTHORITY-INTEGRITY
import { describe, it, expect } from 'vitest';
import {
  ASSURANCE,
  ASSURANCE_LEVELS,
  atLeast,
  maxLevel,
  rankOf,
  finding,
  fromError,
  tallyBySeverity,
  defineGate,
  verifyGate,
  earnedAuthority,
  runGates,
  memoryContext,
  noBareThrowGate,
  noTsIgnoreGate,
  noNondeterminismGate,
  noSilentCatchGate,
  noSkippedTestGate,
  noPlaceholderGate,
  type Authority,
  type Gate,
} from '@liteship/gauntlet';
import { ValidationError } from '@liteship/error';

const AUTHORITY_BEHAVIORS = ['advisory', 'blocking'] as const satisfies readonly Authority[];
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const AUTHORITY_IS_EXACT: Equal<Authority, (typeof AUTHORITY_BEHAVIORS)[number]> = true;

// The gauntlet's own foundations are themselves gated by these tests: the
// authority ratchet, the assurance ladder, and the error→finding bridge.

describe('assurance ladder', () => {
  it('keeps release authority binary and leaves finding loudness to Severity', () => {
    expect(AUTHORITY_IS_EXACT).toBe(true);
    expect(AUTHORITY_BEHAVIORS).toEqual(['advisory', 'blocking']);
  });
  it('orders L0..L4 and compares by rank', () => {
    expect(ASSURANCE_LEVELS).toEqual(['L0', 'L1', 'L2', 'L3', 'L4']);
    expect(rankOf('L4')).toBeGreaterThan(rankOf('L1'));
    expect(atLeast('L4', 'L3')).toBe(true);
    expect(atLeast('L1', 'L3')).toBe(false);
    expect(maxLevel('L1', 'L4')).toBe('L4');
  });

  it('every level has a spec with cumulative rigor', () => {
    for (const lvl of ASSURANCE_LEVELS) {
      expect(ASSURANCE[lvl].requires.length).toBeGreaterThan(0);
    }
    expect(ASSURANCE.L4.requires).toContain('deterministic simulation');
  });
});

describe('Finding — the shared vocabulary', () => {
  it('drops undefined optionals so equal meanings are structurally equal', () => {
    const a = finding({ ruleId: 'r', severity: 'error', level: 'L1', title: 't', detail: 'd' });
    expect('location' in a).toBe(false);
    expect('remediation' in a).toBe(false);
  });

  it('projects a tagged @liteship/error into a Finding (one vocabulary)', () => {
    const f = fromError(ValidationError('Mod.x', 'bad input'), { ruleId: 'gate/x', level: 'L2' });
    expect(f.ruleId).toBe('gate/x');
    expect(f.title).toBe('ValidationError');
    expect(f.detail).toBe('Mod.x: bad input');
    expect(f.severity).toBe('error'); // default
  });

  it('tallies by severity', () => {
    const fs = [
      finding({ ruleId: 'r', severity: 'error', level: 'L1', title: 't', detail: 'd' }),
      finding({ ruleId: 'r', severity: 'advisory', level: 'L1', title: 't', detail: 'd' }),
    ];
    expect(tallyBySeverity(fs)).toEqual({ advisory: 1, warning: 0, error: 1 });
  });
});

describe('defineGate — the plugin contract', () => {
  it('rejects a gate with no id / no fixtures (authority ratchet enforced at construction)', () => {
    expect(() => defineGate({ ...noBareThrowGate, id: '' })).toThrow();
    // @ts-expect-error — deliberately missing fixtures
    expect(() => defineGate({ id: 'gauntlet/x', level: 'L1', describe: 'x', run: () => [] })).toThrow();
  });
});

describe('authority ratchet — a gate earns blocking by self-proving', () => {
  it('the reference no-bare-throw gate self-proves (red caught, green clean, mutation killed)', () => {
    const proof = verifyGate(noBareThrowGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });

  it('every built-in gate self-proves (red caught, green clean, mutation killed → blocking)', () => {
    for (const gate of [
      noBareThrowGate,
      noTsIgnoreGate,
      noNondeterminismGate,
      noSilentCatchGate,
      noSkippedTestGate,
      noPlaceholderGate,
    ]) {
      const proof = verifyGate(gate);
      expect(proof.redCaught, `${gate.id} red`).toBe(true);
      expect(proof.greenClean, `${gate.id} green`).toBe(true);
      expect(proof.mutationKilled, `${gate.id} mutation`).toBe(true);
      expect(proof.selfProven, `${gate.id} selfProven`).toBe(true);
      expect(earnedAuthority(proof), `${gate.id} authority`).toBe('blocking');
    }
  });

  it('a gate whose fixtures have no teeth is capped at advisory', () => {
    // A gate whose mutation does NOT change behaviour → mutation not killed → not self-proven.
    const toothless: Gate = defineGate({
      ...noBareThrowGate,
      id: 'gauntlet/toothless',
      fixtures: {
        ...noBareThrowGate.fixtures,
        mutation: { describe: 'identity mutation (no teeth)', mutate: (g) => g },
      },
    });
    const proof = verifyGate(toothless);
    expect(proof.mutationKilled).toBe(false);
    expect(proof.selfProven).toBe(false);
    expect(earnedAuthority(proof)).toBe('advisory');
  });
});

describe('engine — runGates applies earned authority', () => {
  const dirty = memoryContext({ 'x.ts': "throw new Error('boom');\n" });

  it('a self-proven gate blocks on its error findings', () => {
    const result = runGates([noBareThrowGate], dirty);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0]!.severity).toBe('error');
    expect(result.blocked).toBe(true);
    expect(result.outcomes[0]!.authority).toBe('blocking');
  });

  it('keeps an unproven gate semantic finding advisory but blocks on authority integrity', () => {
    const unproven: Gate = defineGate({
      ...noBareThrowGate,
      id: 'gauntlet/unproven',
      run: (context) =>
        noBareThrowGate.run(context).map((entry) => ({ ...entry, ruleId: 'gauntlet/unproven' })),
      fixtures: { ...noBareThrowGate.fixtures, mutation: { describe: 'identity', mutate: (g) => g } },
    });
    const result = runGates([unproven], dirty);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'gauntlet/unproven', severity: 'advisory' }),
        expect.objectContaining({ ruleId: 'gauntlet/authority-integrity', severity: 'error' }),
      ]),
    );
    expect(result.outcomes[0]).toMatchObject({ authority: 'advisory', proof: { selfProven: false } });
    expect(result.blocked).toBe(true);
  });

  it('blocks failed qualification even when a waiver suppresses the gate semantic finding', () => {
    const unproven: Gate = defineGate({
      ...noBareThrowGate,
      id: 'gauntlet/unproven-waived',
      run: (context) =>
        noBareThrowGate.run(context).map((entry) => ({ ...entry, ruleId: 'gauntlet/unproven-waived' })),
      fixtures: { ...noBareThrowGate.fixtures, mutation: { describe: 'identity', mutate: (g) => g } },
    });
    const result = runGates([unproven], dirty, {
      now: new Date('2026-01-01T00:00:00.000Z'),
      waivers: [
        {
          ruleId: 'gauntlet/unproven-waived',
          owner: 'quality-owner',
          reason: 'prove qualification integrity cannot be suppressed with the semantic finding',
          expires: '2026-12-31',
          blastRadius: 'release authority',
          debtScore: 10,
        },
      ],
    });
    expect(result.findings).toEqual([
      expect.objectContaining({ ruleId: 'gauntlet/authority-integrity', severity: 'error' }),
    ]);
    expect(result.outcomes[0]!.waived).toHaveLength(1);
    expect(result.blocked).toBe(true);
  });

  it('turns a thrown qualification fixture into a bounded blocking receipt', () => {
    const fixtureFailure: Gate = defineGate({
      ...noBareThrowGate,
      id: 'gauntlet/fixture-failure',
      run: (ctx) => {
        if (ctx.repoRoot === '/qualification-red') throw new Error('fixture detonated');
        return [];
      },
      fixtures: {
        ...noBareThrowGate.fixtures,
        red: {
          name: 'qualification throws',
          context: memoryContext({ 'x.ts': "throw new Error('boom');" }, '/qualification-red'),
        },
      },
    });
    const result = runGates([fixtureFailure], memoryContext({ 'x.ts': 'export const clean = true;' }));
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: 'gauntlet/authority-integrity',
        severity: 'error',
        detail: expect.stringContaining('Qualification execution failed: fixture detonated'),
      }),
    ]);
    expect(result.outcomes[0]!.proof).toEqual({
      gateId: 'gauntlet/fixture-failure',
      redCaught: false,
      greenClean: false,
      mutationKilled: false,
      subjectCoverage: {
        status: 'opaque',
        enumerator: 'qualification-execution',
        enumeratedCount: 0,
        censusDigest: `sha256:${'0'.repeat(64)}`,
        reason: 'qualification execution failed before subject coverage could be established',
      },
      selfProven: false,
    });
    expect(result.blocked).toBe(true);
  });

  it('preserves a genuine advisory finding from a fully qualified gate', () => {
    const advisoryGate: Gate = defineGate({
      id: 'gauntlet/advisory-observation',
      level: 'L1',
      describe: 'Reports an observation without blocking.',
      run: (ctx) =>
        ctx.readFile('x.ts')?.includes('observe') === true
          ? [
              finding({
                ruleId: 'gauntlet/advisory-observation',
                severity: 'advisory',
                level: 'L1',
                title: 'Observation',
                detail: 'An advisory observation remains non-blocking after qualification.',
              }),
            ]
          : [],
      fixtures: {
        red: { name: 'observable', context: memoryContext({ 'x.ts': 'observe' }) },
        green: { name: 'quiet', context: memoryContext({ 'x.ts': 'clean' }) },
        mutation: { describe: 'misses the observation', mutate: (gate) => ({ ...gate, run: () => [] }) },
      },
    });
    const result = runGates([advisoryGate], memoryContext({ 'x.ts': 'observe' }));
    expect(result.outcomes[0]).toMatchObject({ authority: 'blocking', proof: { selfProven: true } });
    expect(result.findings).toEqual([
      expect.objectContaining({ ruleId: 'gauntlet/advisory-observation', severity: 'advisory' }),
    ]);
    expect(result.blocked).toBe(false);
  });

  it('a clean context produces no findings and does not block', () => {
    const clean = memoryContext({
      'x.ts': "import { ValidationError } from '@liteship/error';\nthrow ValidationError('x', 'y');\n",
    });
    const result = runGates([noBareThrowGate], clean);
    expect(result.findings).toEqual([]);
    expect(result.blocked).toBe(false);
  });
});

describe('extension — a downstream gate composes through the same engine', () => {
  it('a custom gate with real fixtures self-proves and runs alongside built-ins', () => {
    const noTodo: Gate = defineGate({
      id: 'app/no-todo',
      extension: { namespace: 'app', owner: '@acme/app' },
      level: 'L0',
      describe: 'flags TODO markers',
      run: (ctx) =>
        ctx
          .files()
          .filter((f) => (ctx.readFile(f) ?? '').includes('TODO'))
          .map((f) => finding({ ruleId: 'app/no-todo', severity: 'error', level: 'L0', title: 'TODO', detail: f })),
      fixtures: {
        red: { name: 'has todo', context: memoryContext({ 'a.ts': '// TODO: x' }) },
        green: { name: 'no todo', context: memoryContext({ 'a.ts': '// done' }) },
        mutation: {
          describe: 'scan for an impossible token',
          mutate: (g) => ({
            ...g,
            run: (ctx) =>
              ctx
                .files()
                .filter((f) => (ctx.readFile(f) ?? '').includes('__never__'))
                .map((f) => finding({ ruleId: g.id, severity: 'error', level: 'L0', title: 'm', detail: f })),
          }),
        },
      },
    });
    expect(verifyGate(noTodo).selfProven).toBe(true);
    const result = runGates([noTodo], memoryContext({ 'b.ts': '// TODO: later' }));
    expect(result.blocked).toBe(true);
  });

  it('refuses unowned downstream namespaces and reserved-namespace squatters', () => {
    expect(() => defineGate({ ...noBareThrowGate, id: 'acme/no-todo' })).toThrow(/extension metadata/);
    expect(() =>
      defineGate({
        ...noBareThrowGate,
        id: 'gauntlet/no-todo',
        extension: { namespace: 'gauntlet', owner: '@acme/app' },
      }),
    ).toThrow(/reserved LiteShip namespace/);
    expect(() =>
      defineGate({
        ...noBareThrowGate,
        id: 'acme/no-todo',
        extension: { namespace: 'other', owner: '@acme/app' },
      }),
    ).toThrow(/exact namespace/);
  });
});
