/**
 * Gate: performance contracts — the avionics-tier (Slice C) gate that enforces
 * the two performance CONTRACTS as a DETERMINISTIC fold over committed data.
 *
 * This gate runs NO benchmark and reads NO clock. The measurement lives in the
 * bench harness + `scripts/bench-contracts.ts` (the producer); this gate is the
 * pure VERIFIER that the committed contract artifacts hold their law. Two
 * contracts, both folds over committed bytes:
 *
 * 1. THE HEADLINE LAW — a benchmark result is INVALID unless its input
 *    distribution is DECLARED. The gate reads the committed
 *    `benchmarks/distributions.json`, reads every governed `tests/bench/*.bench.ts`
 *    it references through the GateContext, strips comments via the shared
 *    {@link codeOnly}, and cross-checks: a registered bench with NO declared
 *    distribution (UNDECLARED — an uncomparable result), or a declared
 *    distribution mapping to NO registered bench (ORPHAN — a silently-drifted
 *    contract), is a finding. Either is blocking.
 *
 * 2. THE COMPLEXITY-CLASS LAW — a hot path's complexity class must not regress.
 *    The gate reads the committed `benchmarks/complexity-map.json` and checks that
 *    every entry is present, fits acceptably (R² floor), and records a class at or
 *    below the {@link ACCEPTED_COMPLEXITY_CEILINGS | accepted ceiling} for that
 *    path. A committed map that records `boundary.evaluateBatch` as `O(n^2)` (a
 *    regression past its O(n) law) is the exact "if this lies, the perf contract
 *    is broken" hazard — the gate fails it. Because the verdict is a CLASS
 *    comparison (not an absolute-ns pin) it is load-robust: the producer's
 *    best-of-k + wide class bands keep the recorded class stable across hardware.
 *
 * It is LEAN (no `typescript`, no IR requirement — a pure fold over GateContext
 * bytes) and ships red/green/mutation fixtures, so it self-proves via the ratchet.
 * It does NOT {@link requireIR}, but it ships in `LITESHIP_IR_GATES` (the IR-host
 * composition the CLI runs on `liteship check --ir`) alongside the other Slice B/C
 * gates — NOT the lean cut `LITESHIP_GATES` the MCP/command path runs.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';
import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { stableEvidenceDigest } from '../verdict-cache.js';
import { commentsBlanked } from './code-only.js';

export const PERFORMANCE_CONTRACTS_RULE_ID = 'gauntlet/performance-contracts';

const DISTRIBUTIONS_PATH = 'benchmarks/distributions.json';
const COMPLEXITY_MAP_PATH = 'benchmarks/complexity-map.json';

/**
 * The accepted complexity-class ceiling per hot path — the regression law. A
 * committed map entry recording a class STRICTER-OR-EQUAL to its ceiling passes;
 * a WORSE class (a higher rank) is a regression and blocks. Both probes are
 * linear by law, so their ceiling is `O(n)`: a recorded `O(n log n)` / `O(n^2)`
 * fails. A path absent from this map is NOT ceiling-checked (it is still
 * presence/fit-checked) — adding a probe here is the opt-in to pin its class.
 */
export const ACCEPTED_COMPLEXITY_CEILINGS: Readonly<Record<string, ComplexityClass>> = {
  'boundary.evaluateBatch': 'O(n)',
  'contentAddress.of': 'O(n)',
};

/** The R² floor below which a complexity fit is too noisy to trust as a verdict. */
const MIN_FIT_R2 = 0.5;

// The complexity-class ladder, ordered ascending by growth — DUPLICATED here as
// the gate's own closed constant (the gauntlet is lean and must NOT import the
// scripts/bench contract library, which pulls @liteship/core). The gate only needs
// the ORDERING to rank a committed class against its ceiling; the ranks must
// match scripts/bench/contracts.ts COMPLEXITY_CLASSES, pinned by a guard test.
const COMPLEXITY_LADDER = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'] as const;
type ComplexityClass = (typeof COMPLEXITY_LADDER)[number];

function rankOfClass(klass: string): number {
  return (COMPLEXITY_LADDER as readonly string[]).indexOf(klass);
}

// ---------------------------------------------------------------------------
// The committed-artifact shapes the gate folds over (structurally validated, no
// schema dep — a hand-rolled guard so the lean engine stays lean).
// ---------------------------------------------------------------------------

interface BenchDistributionRecord {
  readonly name: string;
  readonly file: string;
  readonly inputSize: number;
  readonly shape: string;
  readonly replicates: number;
}

interface ComplexityMapEntryRecord {
  readonly path: string;
  readonly class: string;
  readonly fittedR2: number;
}

const BENCH_REGISTRATION = /\bbench(?:\.add)?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw ValidationError(
      PERFORMANCE_CONTRACTS_RULE_ID,
      `committed contract artifact ${path} is not valid JSON: ${String(cause)}`,
    );
  }
}

function readDistributions(context: GateContext): readonly BenchDistributionRecord[] {
  const text = context.readFile(DISTRIBUTIONS_PATH);
  if (text === undefined) {
    return [];
  }
  const parsed = parseJson(text, DISTRIBUTIONS_PATH);
  if (!isRecord(parsed) || !Array.isArray(parsed.distributions)) {
    throw ValidationError(PERFORMANCE_CONTRACTS_RULE_ID, `${DISTRIBUTIONS_PATH} is missing a distributions array`);
  }
  return parsed.distributions.filter(
    (d): d is BenchDistributionRecord => isRecord(d) && typeof d.name === 'string' && typeof d.file === 'string',
  );
}

function readComplexityEntries(context: GateContext): readonly ComplexityMapEntryRecord[] | null {
  const text = context.readFile(COMPLEXITY_MAP_PATH);
  if (text === undefined) {
    return null;
  }
  const parsed = parseJson(text, COMPLEXITY_MAP_PATH);
  if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
    throw ValidationError(PERFORMANCE_CONTRACTS_RULE_ID, `${COMPLEXITY_MAP_PATH} is missing an entries array`);
  }
  return parsed.entries.filter(
    (e): e is ComplexityMapEntryRecord =>
      isRecord(e) && typeof e.path === 'string' && typeof e.class === 'string' && typeof e.fittedR2 === 'number',
  );
}

/** The registered bench names in one comment-stripped bench file, with lines. */
function registeredBenchNames(codeOnlyText: string): ReadonlyArray<{ readonly name: string; readonly line: number }> {
  const out: Array<{ name: string; line: number }> = [];
  const lines = codeOnlyText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    BENCH_REGISTRATION.lastIndex = 0;
    let match: RegExpExecArray | null = BENCH_REGISTRATION.exec(line);
    while (match !== null) {
      const name = match[2];
      if (name !== undefined && name.length > 0) {
        out.push({ name, line: i + 1 });
      }
      match = BENCH_REGISTRATION.exec(line);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The fold.
// ---------------------------------------------------------------------------

function checkDeclaredDistributions(context: GateContext, declared: readonly BenchDistributionRecord[]): Finding[] {
  const findings: Finding[] = [];
  const declaredKeys = new Set(declared.map((d) => `${d.file}::${d.name}`));

  // The governed bench files are exactly those the registry references — the gate
  // reads each through the context (no dependence on the glob scope), strips
  // comments, and cross-checks both directions.
  const governedFiles = [...new Set(declared.map((d) => d.file))];
  const discoveredKeys = new Set<string>();

  for (const file of governedFiles) {
    const text = context.readFile(file);
    if (text === undefined) {
      findings.push(
        finding({
          ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: 'Declared distribution references a missing bench file',
          detail: `benchmarks/distributions.json declares distributions for ${file}, but that bench file could not be read. The declaration is the comparability anchor; it must point at a real bench file.`,
          location: { file: DISTRIBUTIONS_PATH },
          remediation: {
            kind: 'instruction',
            description: 'Fix the declared file path or remove the stale declaration.',
            steps: [
              `Confirm ${file} exists; if it was moved/renamed, update the "file" field of its distributions.`,
              'If the bench was removed, remove its distributions from benchmarks/distributions.json.',
            ],
          },
        }),
      );
      continue;
    }

    for (const bench of registeredBenchNames(commentsBlanked(text))) {
      const key = `${file}::${bench.name}`;
      discoveredKeys.add(key);
      if (!declaredKeys.has(key)) {
        findings.push(
          finding({
            ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
            severity: 'error',
            level: 'L3',
            title: 'Benchmark with no declared input distribution',
            detail: `${file}:${bench.line} registers bench "${bench.name}" with NO declared input distribution. A benchmark result is INVALID unless its input distribution is declared — the number is uncomparable across runs without the declared size + shape of its input.`,
            location: { file, line: bench.line },
            remediation: {
              kind: 'instruction',
              description: 'Declare the bench input distribution.',
              steps: [
                `Add a BenchDistribution to benchmarks/distributions.json: { name: "${bench.name}", file: "${file}", inputSize, shape, replicates }.`,
                'inputSize is the size of the SUT input the bench drives; shape is the qualitative distribution (e.g. boundary-thresholds, ecs-entities).',
              ],
            },
          }),
        );
      }
    }
  }

  for (const d of declared) {
    const key = `${d.file}::${d.name}`;
    if (!discoveredKeys.has(key)) {
      findings.push(
        finding({
          ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: 'Orphan declared distribution — silently drifted contract',
          detail: `declared distribution "${d.name}" in ${d.file} maps to NO registered bench. The bench was renamed or removed and the declaration silently drifted — the comparability anchor now points at nothing. A result compared against a stale declaration is invalid.`,
          location: { file: DISTRIBUTIONS_PATH },
          remediation: {
            kind: 'instruction',
            description: 'Remove the stale declaration or fix its name.',
            steps: [
              `Find bench "${d.name}" in ${d.file}; if it was renamed, update the declaration's "name".`,
              'If the bench was removed, delete its distribution from benchmarks/distributions.json.',
            ],
          },
        }),
      );
    }
  }

  return findings;
}

function checkComplexityMap(entries: readonly ComplexityMapEntryRecord[] | null): Finding[] {
  if (entries === null) {
    return [
      finding({
        ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
        severity: 'error',
        level: 'L3',
        title: 'Complexity map is missing',
        detail: `${COMPLEXITY_MAP_PATH} is absent. The complexity-class contract pins each hot path's measured class against regression; without the committed map there is no baseline to compare against.`,
        location: { file: COMPLEXITY_MAP_PATH },
        remediation: {
          kind: 'instruction',
          description: 'Generate the committed complexity map.',
          steps: [
            'Run `tsx scripts/bench-contracts.ts` to fit the hot-path complexity curves and write benchmarks/complexity-map.json.',
          ],
        },
      }),
    ];
  }

  const findings: Finding[] = [];
  const seen = new Set(entries.map((e) => e.path));

  for (const entry of entries) {
    if (rankOfClass(entry.class) < 0) {
      findings.push(
        finding({
          ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: 'Complexity map records an unrecognized class',
          detail: `${COMPLEXITY_MAP_PATH} records path "${entry.path}" with class "${entry.class}", which is not one of ${COMPLEXITY_LADDER.join(', ')}. An unrecognized class cannot be ranked against its regression ceiling.`,
          location: { file: COMPLEXITY_MAP_PATH },
        }),
      );
      continue;
    }

    if (entry.fittedR2 < MIN_FIT_R2) {
      findings.push(
        finding({
          ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: 'Complexity fit too noisy to trust',
          detail: `${COMPLEXITY_MAP_PATH} records path "${entry.path}" with R² ${entry.fittedR2} (below the ${MIN_FIT_R2} floor). A fit this noisy gives no trustworthy class verdict — re-measure with more replicates/sizes.`,
          location: { file: COMPLEXITY_MAP_PATH },
        }),
      );
    }

    const ceiling = ACCEPTED_COMPLEXITY_CEILINGS[entry.path];
    if (ceiling !== undefined && rankOfClass(entry.class) > rankOfClass(ceiling)) {
      findings.push(
        finding({
          ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: 'Complexity class regressed past its accepted ceiling',
          detail: `Hot path "${entry.path}" is recorded as ${entry.class}, WORSE than its accepted ceiling ${ceiling}. This is a complexity-class regression — if this lies, the perf contract is broken. A path that was ${ceiling} now grows faster; investigate the change that raised its class before accepting it.`,
          location: { file: COMPLEXITY_MAP_PATH },
          remediation: {
            kind: 'instruction',
            description: 'Restore the path to its accepted complexity class.',
            steps: [
              `Find the change that raised "${entry.path}" above ${ceiling} (e.g. a linear scan turned into a nested loop).`,
              'If the new class is genuinely correct + intended, update ACCEPTED_COMPLEXITY_CEILINGS deliberately — never silently widen the ceiling to launder a real regression.',
            ],
          },
        }),
      );
    }
  }

  // Every ceiling-pinned path MUST be present in the committed map — a pinned path
  // silently dropped from the map would slip its regression check.
  for (const path of Object.keys(ACCEPTED_COMPLEXITY_CEILINGS)) {
    if (!seen.has(path)) {
      findings.push(
        finding({
          ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
          severity: 'error',
          level: 'L3',
          title: 'Ceiling-pinned hot path missing from the complexity map',
          detail: `Hot path "${path}" has an accepted complexity ceiling but is absent from ${COMPLEXITY_MAP_PATH}. A pinned path dropped from the map escapes its regression check — re-run scripts/bench-contracts.ts to restore it.`,
          location: { file: COMPLEXITY_MAP_PATH },
        }),
      );
    }
  }

  return findings;
}

function scan(context: GateContext): readonly Finding[] {
  const declared = readDistributions(context);
  // No committed registry at all → the headline law cannot be enforced. That is
  // itself a finding (the contract artifact must exist for the law to hold).
  if (declared.length === 0 && context.readFile(DISTRIBUTIONS_PATH) === undefined) {
    return [
      finding({
        ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
        severity: 'error',
        level: 'L3',
        title: 'Declared-distribution registry is missing',
        detail: `${DISTRIBUTIONS_PATH} is absent. A benchmark result is invalid unless its input distribution is declared; the committed registry is that declaration and must exist.`,
        location: { file: DISTRIBUTIONS_PATH },
        remediation: {
          kind: 'instruction',
          description: 'Author the declared-distribution registry.',
          steps: [
            'Create benchmarks/distributions.json declaring every governed bench in tests/bench/*.bench.ts (name, file, inputSize, shape, replicates).',
          ],
        },
      }),
      ...checkComplexityMap(readComplexityEntries(context)),
    ];
  }

  return [...checkDeclaredDistributions(context, declared), ...checkComplexityMap(readComplexityEntries(context))];
}

/**
 * The OUT-OF-IR EVIDENCE digest — the verdict-cache soundness fold. This gate reads its
 * entire evidence from OUTSIDE the IR: `benchmarks/distributions.json`,
 * `benchmarks/complexity-map.json`, and every governed `tests/bench/*.bench.ts` the
 * distributions reference (under `benchmarks/` and `tests/` — neither in the IR's
 * package-source scope). Editing a benchmark registry or a bench file WITHOUT touching
 * package source flips the verdict, so the cache would serve a stale result unless those
 * bytes are folded. We fold all three sources (the bench-file set derived from the
 * distributions exactly as {@link checkDeclaredDistributions} does), each present/absent-
 * tagged so adding/removing/editing any of them flips the digest.
 */
function performanceContractsEvidenceDigest(context: GateContext): string {
  const tag = (text: string | undefined): string => (text === undefined ? 'A' : `P${text}`);
  const entries: [string, string][] = [
    [DISTRIBUTIONS_PATH, tag(context.readFile(DISTRIBUTIONS_PATH))],
    [COMPLEXITY_MAP_PATH, tag(context.readFile(COMPLEXITY_MAP_PATH))],
  ];
  // The governed bench files are exactly those the distributions registry references —
  // the same set the fold reads (no glob dependence). Fold each file's bytes so editing
  // a bench registration (adding an undeclared bench) flips the digest.
  for (const file of new Set(readDistributions(context).map((d) => d.file))) {
    entries.push([file, tag(context.readFile(file))]);
  }
  return stableEvidenceDigest(entries);
}

// ---------------------------------------------------------------------------
// Fixtures — the authority ratchet's evidence (red catches, green stays clean,
// mutation proves the fixtures have teeth). All in-memory; no filesystem.
// ---------------------------------------------------------------------------

const GREEN_DISTRIBUTIONS = JSON.stringify({
  schemaVersion: 1,
  distributions: [
    {
      name: 'Boundary.evaluate -- 3 thresholds',
      file: 'tests/bench/core.bench.ts',
      inputSize: 3,
      shape: 'boundary-thresholds',
      replicates: 1,
    },
  ],
});
const GREEN_BENCH_FILE =
  "import { Bench } from 'tinybench';\nconst bench = new Bench();\nbench.add('Boundary.evaluate -- 3 thresholds', () => {});\n";
const GREEN_COMPLEXITY_MAP = JSON.stringify({
  schemaVersion: 1,
  entries: [
    { path: 'boundary.evaluateBatch', class: 'O(n)', fittedR2: 0.98 },
    { path: 'contentAddress.of', class: 'O(n)', fittedR2: 0.97 },
  ],
});

// RED: a bench registered with NO declared distribution (an extra bench the
// registry does not cover) AND a complexity map that regressed
// boundary.evaluateBatch (a ceiling-pinned path) to O(n^2). Both contracts fire.
const RED_BENCH_FILE =
  "import { Bench } from 'tinybench';\nconst bench = new Bench();\nbench.add('Boundary.evaluate -- 3 thresholds', () => {});\nbench.add('Undeclared.bench -- no distribution', () => {});\n";
const RED_COMPLEXITY_MAP = JSON.stringify({
  schemaVersion: 1,
  entries: [
    { path: 'boundary.evaluateBatch', class: 'O(n^2)', fittedR2: 0.99 },
    { path: 'contentAddress.of', class: 'O(n)', fittedR2: 0.97 },
  ],
});

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const performanceContractsGate: Gate = defineGate({
  id: PERFORMANCE_CONTRACTS_RULE_ID,
  level: 'L3',
  describe:
    'Performance contracts — a bench result is invalid unless its input distribution is declared; a hot path must not regress its complexity class.',
  run: scan,
  evidenceDigest: performanceContractsEvidenceDigest,
  fixtures: {
    red: {
      name: 'an undeclared bench + a complexity-class regression to O(n^2)',
      context: memoryContext({
        'benchmarks/distributions.json': GREEN_DISTRIBUTIONS,
        'tests/bench/core.bench.ts': RED_BENCH_FILE,
        'benchmarks/complexity-map.json': RED_COMPLEXITY_MAP,
      }),
    },
    green: {
      name: 'every bench declared + every hot path within its complexity ceiling',
      context: memoryContext({
        'benchmarks/distributions.json': GREEN_DISTRIBUTIONS,
        'tests/bench/core.bench.ts': GREEN_BENCH_FILE,
        'benchmarks/complexity-map.json': GREEN_COMPLEXITY_MAP,
      }),
    },
    mutation: {
      describe:
        'A gate that ignores the accepted ceiling (treats every recorded class as acceptable) catches nothing — the red O(n^2) regression then goes unflagged.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] =>
          // Mutant: only run the distribution check, dropping the complexity-class
          // ceiling check entirely. The red fixture's O(n^2) regression is no longer
          // caught, but its undeclared bench still is — so the mutant must DIFFER
          // from the original on the red fixture (fewer findings), proving the
          // complexity check has teeth. To make the mutant fully toothless on the
          // red's regression while keeping it a plausible variant, we also blank the
          // undeclared-bench check by reading an impossible registry path.
          checkComplexityMapMutant(context),
      }),
    },
  },
});

/**
 * The mutation's neutered logic, extracted so the mutant is a real plausible
 * variant: it reads the complexity map but NEVER applies the ceiling check, so a
 * recorded O(n^2) regression slips through. The harness asserts this mutant fails
 * the red fixture (the regression goes uncaught) — proving the ceiling check is
 * load-bearing, not theatre.
 */
function checkComplexityMapMutant(context: GateContext): readonly Finding[] {
  const entries = readComplexityEntries(context);
  if (entries === null) {
    return [
      finding({
        ruleId: PERFORMANCE_CONTRACTS_RULE_ID,
        severity: 'error',
        level: 'L3',
        title: 'Complexity map is missing',
        detail: `${COMPLEXITY_MAP_PATH} is absent.`,
        location: { file: COMPLEXITY_MAP_PATH },
      }),
    ];
  }
  // Mutant: presence-only, NO ceiling comparison — the regression is invisible.
  return [];
}
