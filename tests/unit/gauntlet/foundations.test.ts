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
  type Gate,
} from '@czap/gauntlet';
import { ValidationError } from '@czap/error';

// The gauntlet's own foundations are themselves gated by these tests: the
// authority ratchet, the assurance ladder, and the error→finding bridge.

describe('assurance ladder', () => {
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

  it('projects a tagged @czap/error into a Finding (one vocabulary)', () => {
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
    expect(() => defineGate({ id: 'x', level: 'L1', describe: 'x', run: () => [] })).toThrow();
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

  it('a gate whose fixtures have no teeth is capped at advisory', () => {
    // A gate whose mutation does NOT change behaviour → mutation not killed → not self-proven.
    const toothless: Gate = defineGate({
      ...noBareThrowGate,
      id: 'toothless',
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

  it('an UNPROVEN gate surfaces findings but is demoted to advisory (never blocks)', () => {
    const unproven: Gate = defineGate({
      ...noBareThrowGate,
      id: 'unproven',
      fixtures: { ...noBareThrowGate.fixtures, mutation: { describe: 'identity', mutate: (g) => g } },
    });
    const result = runGates([unproven], dirty);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0]!.severity).toBe('advisory'); // demoted
    expect(result.blocked).toBe(false);
  });

  it('a clean context produces no findings and does not block', () => {
    const clean = memoryContext({
      'x.ts': "import { ValidationError } from '@czap/error';\nthrow ValidationError('x', 'y');\n",
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
});
