/**
 * Level-scoping + waivers — the two load-bearing engine foundations.
 *
 * `scopeContextByLevel` narrows a gate's file view to its assurance level (so an
 * L3 gate stops drowning in legit L1 tooling); `applyWaivers` partitions findings
 * with teeth (match → waived, expired → error, stale → warning, forbidden → void
 * + error). Both are pure; the waiver clock is an INJECTED `now` — these tests pin
 * that injecting the same `now` yields the same partition (determinism).
 */

import { describe, it, expect } from 'vitest';
import {
  scopeContextByLevel,
  memoryContext,
  applyWaivers,
  finding,
  defineGate,
  runGates,
  ALWAYS_BLOCKING_RULES,
  LITESHIP_ASSURANCE_MAP,
  type LevelRule,
  type Waiver,
  type Finding,
  type GateContext,
  type Gate,
} from '@liteship/gauntlet';

// ── scopeContextByLevel ──────────────────────────────────────────────────────

describe('scopeContextByLevel', () => {
  const ctx: GateContext = memoryContext({
    'packages/core/src/reactive/zap.ts': 'L3 file', // L3
    'packages/canonical/src/x.ts': 'L4 file', // L4
    'packages/edge/src/manifest.ts': 'L2 file', // L2
    'packages/cli/src/lib/ansi.ts': 'L1 file', // L1
  });

  it('an L3 scope keeps L3 and L4 files, drops L2 and L1', () => {
    const scoped = scopeContextByLevel(ctx, 'L3', LITESHIP_ASSURANCE_MAP);
    expect([...scoped.files()].sort()).toEqual([
      'packages/canonical/src/x.ts',
      'packages/core/src/reactive/zap.ts',
    ]);
  });

  it('an L1 scope keeps everything (every level is at-least L1)', () => {
    const scoped = scopeContextByLevel(ctx, 'L1', LITESHIP_ASSURANCE_MAP);
    expect(scoped.files().length).toBe(4);
  });

  it('an L4 scope keeps only the L4 file', () => {
    const scoped = scopeContextByLevel(ctx, 'L4', LITESHIP_ASSURANCE_MAP);
    expect([...scoped.files()]).toEqual(['packages/canonical/src/x.ts']);
  });

  it('passes readFile and repoRoot through unchanged', () => {
    const scoped = scopeContextByLevel(ctx, 'L3', LITESHIP_ASSURANCE_MAP);
    expect(scoped.repoRoot).toBe(ctx.repoRoot);
    expect(scoped.readFile('packages/core/src/reactive/zap.ts')).toBe('L3 file');
    // readFile is NOT scoped — only the file list is.
    expect(scoped.readFile('packages/cli/src/lib/ansi.ts')).toBe('L1 file');
  });

  it('runGates without a map sees ALL files (back-compat)', () => {
    const seen: string[] = [];
    const probe: Gate = defineGate({
      id: 'test/probe',
      level: 'L3',
      describe: 'records the files it sees',
      run: (c) => {
        for (const f of c.files()) seen.push(f);
        return [];
      },
      fixtures: {
        red: { name: 'red', context: memoryContext({ 'bad.ts': 'flag-me' }) },
        green: { name: 'green', context: memoryContext({ 'good.ts': '' }) },
        mutation: { describe: 'noop', mutate: (g) => ({ ...g, run: () => [] }) },
      },
    });
    runGates([probe], ctx); // no opts → no scoping
    // verifyGate first runs the gate over its red/green fixtures (bad.ts/good.ts);
    // filter those out — we assert on what the REAL context exposed.
    const real = seen.filter((f) => f.startsWith('packages/'));
    expect(real.sort()).toEqual([
      'packages/canonical/src/x.ts',
      'packages/cli/src/lib/ansi.ts',
      'packages/core/src/reactive/zap.ts',
      'packages/edge/src/manifest.ts',
    ]);
  });

  it('runGates WITH the map scopes each gate to its level', () => {
    const seen: string[] = [];
    const probe: Gate = defineGate({
      id: 'test/probe-scoped',
      level: 'L3',
      describe: 'records the files it sees',
      run: (c) => {
        for (const f of c.files()) seen.push(f);
        return [];
      },
      fixtures: {
        red: { name: 'red', context: memoryContext({ 'bad.ts': 'flag-me' }) },
        green: { name: 'green', context: memoryContext({ 'good.ts': '' }) },
        mutation: { describe: 'noop', mutate: (g) => ({ ...g, run: () => [] }) },
      },
    });
    runGates([probe], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP });
    // Filter out the red/green fixture files (bad.ts/good.ts) verifyGate ran over.
    const real = seen.filter((f) => f.startsWith('packages/'));
    expect(real.sort()).toEqual(['packages/canonical/src/x.ts', 'packages/core/src/reactive/zap.ts']);
  });
});

// ── waivers are scoped to their gate (no cross-gate false-staleness) ──────────

describe('runGates — a waiver is evaluated only at the gate whose rule it targets', () => {
  // Two gates with different rule ids, each flagging its one file.
  const ctx: GateContext = memoryContext({ 'a.ts': 'flag-a', 'b.ts': 'flag-b' });
  const mkProbe = (id: string, token: string): Gate =>
    defineGate({
      id,
      level: 'L1',
      describe: `flags files containing ${token}`,
      run: (c): readonly Finding[] =>
        c
          .files()
          .filter((f) => (c.readFile(f) ?? '').includes(token))
          .map((f) => finding({ ruleId: id, severity: 'error', level: 'L1', title: id, detail: f, location: { file: f, line: 1 } })),
      fixtures: {
        red: { name: 'red', context: memoryContext({ 'bad.ts': token }) },
        green: { name: 'green', context: memoryContext({ 'good.ts': '' }) },
        mutation: { describe: 'noop', mutate: (g): Gate => ({ ...g, run: (): readonly Finding[] => [] }) },
      },
    });
  const gateA = mkProbe('test/rule-a', 'flag-a');
  const gateB = mkProbe('test/rule-b', 'flag-b');

  it('a waiver for gate B does NOT register as stale when gate A also runs', () => {
    // One waiver, targeting rule-b's finding only.
    const waivers: readonly Waiver[] = [
      {
        ruleId: 'test/rule-b',
        file: 'b.ts',
        line: 1,
        owner: 'tester',
        reason: 'b is fine',
        expires: '2999-01-01',
        blastRadius: 'none',
        debtScore: 0,
      },
    ];
    const result = runGates([gateA, gateB], ctx, { waivers, now: NOW });

    const outA = result.outcomes.find((o) => o.gateId === 'test/rule-a')!;
    const outB = result.outcomes.find((o) => o.gateId === 'test/rule-b')!;

    // Gate A: its finding is KEPT; the rule-b waiver is NOT evaluated here, so it
    // produces NO stale-waiver noise at gate A (the bug this guards against).
    expect(outA.findings.map((f) => f.location?.file)).toEqual(['a.ts']);
    expect(outA.waiverFindings).toEqual([]);

    // Gate B: the matching waiver suppresses its finding cleanly — no stale, no kept.
    expect(outB.findings).toEqual([]);
    expect(outB.waived.map((f) => f.location?.file)).toEqual(['b.ts']);
    expect(outB.waiverFindings).toEqual([]);
  });
});

// ── applyWaivers ─────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-20'); // injected clock — no Date.now anywhere

function findingAt(ruleId: string, file: string, line: number): Finding {
  return finding({
    ruleId,
    severity: 'error',
    level: 'L3',
    title: 't',
    detail: 'd',
    location: { file, line },
  });
}

function waiver(over: Partial<Waiver> & Pick<Waiver, 'ruleId'>): Waiver {
  return {
    owner: 'owner@x',
    reason: 'documented reason',
    expires: '2099-01-01',
    blastRadius: 'none',
    debtScore: 1,
    ...over,
  };
}

describe('applyWaivers', () => {
  it('MATCH (ruleId + file + line) → waived, not kept', () => {
    const f = findingAt('r/a', 'src/x.ts', 10);
    const { kept, waived, waiverFindings } = applyWaivers(
      [f],
      [waiver({ ruleId: 'r/a', file: 'src/x.ts', line: 10 })],
      NOW,
    );
    expect(waived).toEqual([f]);
    expect(kept).toEqual([]);
    expect(waiverFindings).toEqual([]);
  });

  it('a ruleId-only waiver matches any finding of that rule', () => {
    const f1 = findingAt('r/a', 'src/x.ts', 1);
    const f2 = findingAt('r/a', 'src/y.ts', 2);
    const { kept, waived } = applyWaivers([f1, f2], [waiver({ ruleId: 'r/a' })], NOW);
    expect(waived).toEqual([f1, f2]);
    expect(kept).toEqual([]);
  });

  it('a file-scoped waiver does NOT suppress a finding in another file', () => {
    const here = findingAt('r/a', 'src/x.ts', 1);
    const there = findingAt('r/a', 'src/y.ts', 1);
    const { kept, waived } = applyWaivers([here, there], [waiver({ ruleId: 'r/a', file: 'src/x.ts' })], NOW);
    expect(waived).toEqual([here]);
    expect(kept).toEqual([there]);
  });

  it('EXPIRED waiver → error finding (waiver-expired), and the underlying finding is NOT suppressed', () => {
    const f = findingAt('r/a', 'src/x.ts', 10);
    const { kept, waived, waiverFindings } = applyWaivers(
      [f],
      [waiver({ ruleId: 'r/a', file: 'src/x.ts', line: 10, expires: '2020-01-01', owner: 'jane@x' })],
      NOW,
    );
    expect(kept).toEqual([f]); // not suppressed — the debt is live again
    expect(waived).toEqual([]);
    expect(waiverFindings).toHaveLength(1);
    expect(waiverFindings[0]?.ruleId).toBe('gauntlet/waiver-expired');
    expect(waiverFindings[0]?.severity).toBe('error');
    expect(waiverFindings[0]?.detail).toContain('r/a');
    expect(waiverFindings[0]?.detail).toContain('2020-01-01');
    expect(waiverFindings[0]?.detail).toContain('jane@x');
  });

  it('a waiver expiring exactly on `now` is still valid (>= now)', () => {
    const f = findingAt('r/a', 'src/x.ts', 10);
    const { kept, waived, waiverFindings } = applyWaivers(
      [f],
      [waiver({ ruleId: 'r/a', expires: '2026-06-20' })],
      NOW,
    );
    expect(waived).toEqual([f]);
    expect(kept).toEqual([]);
    expect(waiverFindings).toEqual([]);
  });

  it('STALE waiver (matches nothing, not expired) → warning (waiver-stale)', () => {
    const f = findingAt('r/a', 'src/x.ts', 10);
    const { kept, waiverFindings } = applyWaivers([f], [waiver({ ruleId: 'r/NOPE' })], NOW);
    expect(kept).toEqual([f]);
    expect(waiverFindings).toHaveLength(1);
    expect(waiverFindings[0]?.ruleId).toBe('gauntlet/waiver-stale');
    expect(waiverFindings[0]?.severity).toBe('warning');
  });

  it('FORBIDDEN waiver → error (waiver-forbidden) AND the finding stays kept (void)', () => {
    // 'gauntlet/no-placeholder' is seeded in ALWAYS_BLOCKING_RULES — a waiver may
    // NEVER cover a placeholder. The waiver is void: the finding survives.
    expect(ALWAYS_BLOCKING_RULES).toContain('gauntlet/no-placeholder');
    const f = findingAt('gauntlet/no-placeholder', 'src/x.ts', 10);
    const { kept, waived, waiverFindings } = applyWaivers(
      [f],
      [waiver({ ruleId: 'gauntlet/no-placeholder', file: 'src/x.ts', line: 10, owner: 'sneaky@x' })],
      NOW,
    );
    expect(kept).toEqual([f]); // NOT suppressed — you cannot waive a lie
    expect(waived).toEqual([]);
    expect(waiverFindings).toHaveLength(1);
    expect(waiverFindings[0]?.ruleId).toBe('gauntlet/waiver-forbidden');
    expect(waiverFindings[0]?.severity).toBe('error');
    expect(waiverFindings[0]?.detail).toContain('gauntlet/no-placeholder');
  });

  it('a forbidden waiver wins even when not expired and matching (void beats match)', () => {
    const f = findingAt('gauntlet/no-skipped-test', 'src/x.test.ts', 5);
    const { kept, waiverFindings } = applyWaivers(
      [f],
      [waiver({ ruleId: 'gauntlet/no-skipped-test', expires: '2099-01-01' })],
      NOW,
    );
    expect(kept).toEqual([f]);
    expect(waiverFindings.some((w) => w.ruleId === 'gauntlet/waiver-forbidden')).toBe(true);
  });

  it('determinism: same findings + waivers + injected now → identical partition', () => {
    const findings = [findingAt('r/a', 'src/x.ts', 1), findingAt('r/b', 'src/y.ts', 2)];
    const waivers = [waiver({ ruleId: 'r/a' }), waiver({ ruleId: 'r/stale' })];
    const a = applyWaivers(findings, waivers, new Date('2026-06-20'));
    const b = applyWaivers(findings, waivers, new Date('2026-06-20'));
    expect(a).toEqual(b);
  });
});

// ── forbidden enforcement, end-to-end, with a fixture-forbidden rule ─────────

describe('forbidden-rule enforcement (a waiver can never cover a skip/placeholder)', () => {
  it('runGates BLOCKS when a waiver targets a forbidden rule, and keeps the finding', () => {
    const gate: Gate = defineGate({
      id: 'gauntlet/no-placeholder',
      level: 'L1',
      describe: 'flags any file containing "TODO"',
      run: (c: GateContext) =>
        c
          .files()
          .filter((f) => (c.readFile(f) ?? '').includes('TODO'))
          .map((f) =>
            finding({ ruleId: 'gauntlet/no-placeholder', severity: 'error', level: 'L1', title: 't', detail: 'd', location: { file: f, line: 1 } }),
          ),
      fixtures: {
        red: { name: 'red', context: memoryContext({ 'bad.ts': 'TODO' }) },
        green: { name: 'green', context: memoryContext({ 'good.ts': 'clean' }) },
        mutation: { describe: 'noop', mutate: (g) => ({ ...g, run: () => [] }) },
      },
    });
    const ctx = memoryContext({ 'a.ts': 'TODO' });
    const sneaky: Waiver = waiver({ ruleId: 'gauntlet/no-placeholder', file: 'a.ts', line: 1 });
    const result = runGates([gate], ctx, { waivers: [sneaky], now: NOW });
    // The placeholder finding is NOT suppressed, and a forbidden-waiver error blocks.
    expect(result.findings.some((f) => f.ruleId === 'gauntlet/no-placeholder')).toBe(true);
    expect(result.findings.some((f) => f.ruleId === 'gauntlet/waiver-forbidden')).toBe(true);
    expect(result.blocked).toBe(true);
  });

  it('an expired waiver makes runGates BLOCK (waiver teeth fail the run)', () => {
    const gate: Gate = defineGate({
      id: 'test/flag',
      level: 'L1',
      describe: 'flags any file containing "flag-me"',
      run: (c: GateContext) =>
        c
          .files()
          .filter((f) => (c.readFile(f) ?? '').includes('flag-me'))
          .map((f) => finding({ ruleId: 'test/flag', severity: 'error', level: 'L1', title: 't', detail: 'd', location: { file: f, line: 1 } })),
      fixtures: {
        red: { name: 'red', context: memoryContext({ 'bad.ts': 'flag-me' }) },
        green: { name: 'green', context: memoryContext({ 'good.ts': 'clean' }) },
        mutation: { describe: 'noop', mutate: (g) => ({ ...g, run: () => [] }) },
      },
    });
    const ctx = memoryContext({ 'a.ts': 'flag-me' });
    const expiredWaiver: Waiver = waiver({ ruleId: 'test/flag', expires: '2000-01-01' });
    const result = runGates([gate], ctx, { waivers: [expiredWaiver], now: NOW });
    // The expired waiver does NOT suppress (finding kept) AND adds an expired error.
    expect(result.findings.some((f) => f.ruleId === 'gauntlet/waiver-expired')).toBe(true);
    expect(result.findings.some((f) => f.ruleId === 'test/flag')).toBe(true);
    expect(result.blocked).toBe(true);
  });

  it('a valid waiver suppresses the finding and the run does not block on it', () => {
    const gate: Gate = defineGate({
      id: 'test/flag2',
      level: 'L1',
      describe: 'flags any file containing "flag-me"',
      run: (c: GateContext) =>
        c
          .files()
          .filter((f) => (c.readFile(f) ?? '').includes('flag-me'))
          .map((f) => finding({ ruleId: 'test/flag2', severity: 'error', level: 'L1', title: 't', detail: 'd', location: { file: f, line: 1 } })),
      fixtures: {
        red: { name: 'red', context: memoryContext({ 'bad.ts': 'flag-me' }) },
        green: { name: 'green', context: memoryContext({ 'good.ts': 'clean' }) },
        mutation: { describe: 'noop', mutate: (g) => ({ ...g, run: () => [] }) },
      },
    });
    const ctx = memoryContext({ 'a.ts': 'flag-me' });
    const validWaiver: Waiver = waiver({ ruleId: 'test/flag2', file: 'a.ts', line: 1 });
    const result = runGates([gate], ctx, { waivers: [validWaiver], now: NOW });
    const outcome = result.outcomes.find((o) => o.gateId === 'test/flag2');
    expect(outcome?.waived).toHaveLength(1);
    expect(outcome?.findings).toHaveLength(0);
    expect(result.blocked).toBe(false);
  });
});
