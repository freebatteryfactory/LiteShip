/**
 * The --ir effective-level integration (Slice B, B3.4) — the propagated levels,
 * once computed, drive BOTH the engine's level-SCOPING (a file pulled into an L4
 * path is in an L4 gate's band even though its glob would exclude it) AND the
 * finding-level ELEVATION (a finding on such a file is reported at L4). And the
 * load-bearing back-compat proof: WITHOUT `effectiveLevels` the engine is
 * byte-identical to before B3.4 (the lean `czap check` / MCP path is untouched).
 */

import { describe, it, expect } from 'vitest';
import {
  scopeContextByLevel,
  runGates,
  memoryContext,
  finding,
  defineGate,
  FACT_CHANNELS,
  LITESHIP_ASSURANCE_MAP,
  type AssuranceLevel,
  type FileId,
  type Finding,
  type Gate,
  type GateContext,
} from '@czap/gauntlet';

// A file that the GLOB map scores L1 (cosmetic CLI lib) but that — on the --ir
// path — was pulled into an L4 path by an import edge.
const PULLED_FILE = 'packages/cli/src/lib/ansi.ts'; // glob → L1
const TRUE_L4_FILE = 'packages/canonical/src/x.ts'; // glob → L4
const PLAIN_L1_FILE = 'packages/cli/src/lib/other.ts'; // glob → L1, NOT pulled

const ctx: GateContext = memoryContext({
  [PULLED_FILE]: 'pulled-into-L4',
  [TRUE_L4_FILE]: 'true-L4',
  [PLAIN_L1_FILE]: 'plain-L1',
});

// The propagated map: PULLED_FILE elevated to L4; TRUE_L4 stays L4; PLAIN stays L1.
const effectiveLevels: ReadonlyMap<FileId, AssuranceLevel> = new Map<FileId, AssuranceLevel>([
  [PULLED_FILE, 'L4'],
  [TRUE_L4_FILE, 'L4'],
  [PLAIN_L1_FILE, 'L1'],
]);

// ── scopeContextByLevel with effective levels ────────────────────────────────

describe('scopeContextByLevel — effective levels override the glob for scoping', () => {
  it('an L4 scope WITH effective levels keeps the pulled-in file (glob would drop it)', () => {
    const scoped = scopeContextByLevel(ctx, 'L4', LITESHIP_ASSURANCE_MAP, effectiveLevels);
    expect([...scoped.files()].sort()).toEqual([PULLED_FILE, TRUE_L4_FILE].sort());
  });

  it('an L4 scope WITHOUT effective levels uses the glob (drops the L1-glob file)', () => {
    const scoped = scopeContextByLevel(ctx, 'L4', LITESHIP_ASSURANCE_MAP);
    expect([...scoped.files()]).toEqual([TRUE_L4_FILE]);
  });

  it('a file absent from the effective map falls back to its glob level (no crash)', () => {
    const partial = new Map<FileId, AssuranceLevel>([[PULLED_FILE, 'L4']]); // others absent
    const scoped = scopeContextByLevel(ctx, 'L4', LITESHIP_ASSURANCE_MAP, partial);
    // PULLED → L4 (in map); TRUE_L4 → glob L4 (absent, fallback); PLAIN → glob L1 (dropped).
    expect([...scoped.files()].sort()).toEqual([PULLED_FILE, TRUE_L4_FILE].sort());
  });

  it('passes the injected mutation facts THROUGH (file-scoping never drops them)', () => {
    // REGRESSION GUARD: scoping narrows files(), NEVER the injected facts. An L4 gate
    // is ALWAYS scoped, so if scopeContextByLevel dropped `mutation` the
    // mutationDivergenceGate would throw `mutation-facts unavailable` on the real
    // `czap check --ir --mutate` path even though the host injected the facts. The
    // facts carry each mutant's own `file`; the gate scopes itself, so the context
    // must hand the WHOLE facts set to every scope (exactly like `ir` / `supplyChain`).
    const withFacts: GateContext = {
      ...ctx,
      mutation: {
        outcomes: [
          {
            mutantId: 'blake3:fixture',
            verdict: 'survived',
            file: TRUE_L4_FILE,
            line: 1,
            column: 1,
            operator: 'equality',
            originalText: '===',
            mutatedText: '!==',
          },
        ],
        scoreBaseline: {},
      },
    };
    const scoped = scopeContextByLevel(withFacts, 'L4', LITESHIP_ASSURANCE_MAP, effectiveLevels);
    expect(scoped.mutation).toBe(withFacts.mutation);
  });

  it('preserves EVERY injected fact channel through L4 scoping (the FACT_CHANNELS class — no hand-list drift)', () => {
    // REGRESSION GUARD (codex round-8, #1b): scopeContextByLevel HAND-LISTS the fact channels it
    // carries forward, and that list can DRIFT from FACT_CHANNELS. It did: `capabilityLink` was added
    // to GateContext + FACT_CHANNELS but NOT to the scoping carry-list, so the L4 capabilityGateLinkGate
    // (always scoped) saw NO facts and threw on the real `czap check --ir --capability-gate` path —
    // invisible to the unit gate tests, which inject facts into an UNSCOPED context. Pin the whole
    // class: a sentinel on EVERY channel must survive L4 scoping, so adding a channel to FACT_CHANNELS
    // without teaching the scoper reds HERE, not in a far-downstream `--ir` run.
    for (const channel of FACT_CHANNELS) {
      const sentinel = { __sentinel: channel } as never;
      const withChannel = { ...ctx, [channel]: sentinel } as GateContext;
      const scoped = scopeContextByLevel(withChannel, 'L4', LITESHIP_ASSURANCE_MAP, effectiveLevels);
      expect(
        scoped[channel],
        `scopeContextByLevel dropped the '${channel}' fact channel — add it to the carry-list in engine.ts`,
      ).toBe(sentinel);
    }
  });

  it('preserves the injected CAPABILITY functions (skipDetector, codeOnly) through L4 scoping', () => {
    // Capabilities are EXCLUDED from FACT_CHANNELS, so the class guard above does NOT cover them — yet
    // scopeContextByLevel must carry them or a scoped (assurance-map) run silently falls back to the
    // lean implementations. `codeOnly` was dropped exactly this way (codex review, PR #60), making the
    // injected sound scanner inert on the production `litelaunchGauntlet*` path; `skipDetector` would
    // re-open the whack-a-mole. Pin both — adding a capability without teaching the scoper reds HERE.
    const skipSentinel = ((): readonly never[] => []) as GateContext['skipDetector'];
    const codeSentinel = ((source: string): string => source) as GateContext['codeOnly'];
    const withCaps = { ...ctx, skipDetector: skipSentinel, codeOnly: codeSentinel } as GateContext;
    const scoped = scopeContextByLevel(withCaps, 'L4', LITESHIP_ASSURANCE_MAP, effectiveLevels);
    expect(scoped.skipDetector).toBe(skipSentinel);
    expect(scoped.codeOnly).toBe(codeSentinel);
  });
});

// ── runGates: a gate scoped by effective levels sees the pulled-in file ───────

/** A probe gate at `level` that records the files it is handed and flags each. */
function probeGate(id: string, level: AssuranceLevel): Gate {
  return defineGate({
    id,
    level,
    describe: 'flags every file it sees',
    run: (c: GateContext): readonly Finding[] =>
      c
        .files()
        .filter((f) => f.startsWith('packages/'))
        .map((f) =>
          finding({ ruleId: id, severity: 'error', level, title: id, detail: f, location: { file: f, line: 1 } }),
        ),
    fixtures: {
      red: { name: 'red', context: memoryContext({ 'packages/x/src/bad.ts': 'x' }) },
      green: { name: 'green', context: memoryContext({ 'packages/x/src/good.ts': '' }) },
      mutation: { describe: 'noop', mutate: (g): Gate => ({ ...g, run: (): readonly Finding[] => [] }) },
    },
  });
}

describe('runGates — effectiveLevels scope an L4 gate onto a pulled-in file', () => {
  const gate = probeGate('test/l4-probe', 'L4');

  it('WITH effectiveLevels the L4 gate flags the pulled-in (glob-L1) file', () => {
    const result = runGates([gate], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP, effectiveLevels });
    const files = result.findings.map((f) => f.location?.file).sort();
    expect(files).toEqual([PULLED_FILE, TRUE_L4_FILE].sort()); // PLAIN_L1 still excluded
  });

  it('WITHOUT effectiveLevels the same L4 gate sees only the true-L4 file (glob scoping)', () => {
    const result = runGates([gate], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP });
    const files = result.findings.map((f) => f.location?.file);
    expect(files).toEqual([TRUE_L4_FILE]);
  });
});

// ── finding-level elevation ──────────────────────────────────────────────────

describe('runGates — a finding on a pulled-in file is elevated to its effective level', () => {
  // A LOW-level gate (L1) that flags the pulled-in file. On the --ir path the
  // finding's level must be ELEVATED to L4 (the file's real assurance), even though
  // the gate emitted it at L1.
  function l1FlagGate(): Gate {
    return defineGate({
      id: 'test/l1-flagger',
      level: 'L1',
      describe: 'flags the pulled-in file at L1',
      run: (c: GateContext): readonly Finding[] =>
        c
          .files()
          .filter((f) => f === PULLED_FILE)
          .map((f) =>
            finding({
              ruleId: 'test/l1-flagger',
              severity: 'error',
              level: 'L1',
              title: 't',
              detail: 'd',
              location: { file: f, line: 1 },
            }),
          ),
      fixtures: {
        red: { name: 'red', context: memoryContext({ [PULLED_FILE]: 'x' }) },
        green: { name: 'green', context: memoryContext({ 'packages/x/src/good.ts': '' }) },
        mutation: { describe: 'noop', mutate: (g): Gate => ({ ...g, run: (): readonly Finding[] => [] }) },
      },
    });
  }

  it('the finding is reported at L4 (the file effective level), not the gate L1', () => {
    const result = runGates([l1FlagGate()], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP, effectiveLevels });
    const f = result.findings.find((x) => x.ruleId === 'test/l1-flagger');
    expect(f?.level).toBe('L4'); // elevated from L1 to the file's effective L4
    expect(f?.location?.file).toBe(PULLED_FILE);
  });

  it('WITHOUT effectiveLevels the finding stays at the gate level L1 (lean path)', () => {
    const result = runGates([l1FlagGate()], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP });
    const f = result.findings.find((x) => x.ruleId === 'test/l1-flagger');
    expect(f?.level).toBe('L1'); // unchanged
  });

  it('elevation NEVER lowers — an L4 finding on a glob-L1 effective file stays L4', () => {
    // A gate emitting at L4 a finding on a file whose effective level is L1.
    const gate = defineGate({
      id: 'test/l4-emit',
      level: 'L1',
      describe: 'emits an L4 finding on the plain-L1 file',
      run: (c: GateContext): readonly Finding[] =>
        c
          .files()
          .filter((f) => f === PLAIN_L1_FILE)
          .map((f) =>
            finding({
              ruleId: 'test/l4-emit',
              severity: 'error',
              level: 'L4',
              title: 't',
              detail: 'd',
              location: { file: f, line: 1 },
            }),
          ),
      fixtures: {
        red: { name: 'red', context: memoryContext({ [PLAIN_L1_FILE]: 'x' }) },
        green: { name: 'green', context: memoryContext({ 'packages/x/src/good.ts': '' }) },
        mutation: { describe: 'noop', mutate: (g): Gate => ({ ...g, run: (): readonly Finding[] => [] }) },
      },
    });
    const result = runGates([gate], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP, effectiveLevels });
    const f = result.findings.find((x) => x.ruleId === 'test/l4-emit');
    expect(f?.level).toBe('L4'); // effective is L1 but finding L4 > L1 → unchanged (max)
  });
});

// ── back-compat: the lean path is byte-identical to before B3.4 ──────────────

describe('runGates — the lean path (no effectiveLevels) is byte-identical to before B3.4', () => {
  it('omitting effectiveLevels yields a result deep-equal to the same run with no B3.4 option', () => {
    const gate = probeGate('test/l1-all', 'L1');
    // Two runs: one with NO B3.4 option present at all, one passing effectiveLevels:
    // undefined explicitly. Both must be the lean (glob-only) behaviour, identical.
    const baseline = runGates([gate], ctx, { assuranceMap: LITESHIP_ASSURANCE_MAP });
    const explicitUndefined = runGates([gate], ctx, {
      assuranceMap: LITESHIP_ASSURANCE_MAP,
      effectiveLevels: undefined,
    });
    expect(explicitUndefined).toEqual(baseline);
    // And the findings carry their ORIGINAL gate-emitted level (no elevation).
    for (const f of baseline.findings) expect(f.level).toBe('L1');
  });
});
