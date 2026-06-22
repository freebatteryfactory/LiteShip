/**
 * The kill/survive VERDICT — the mutant-as-second-oracle's answer (Slice C, the
 * avionics tier).
 *
 * A {@link Mutant} is a deliberate second oracle (see `mutation-engine.ts`): mutate
 * one operator at one site, run the tests that COVER that site, and read the
 * disagreement.
 *  - KILLED — a covering test FAILED on the mutated source. The two oracles
 *    (original vs mutated) diverged exactly as they should: the test noticed the
 *    behaviour change. Adequate coverage, no finding.
 *  - SURVIVED — every covering test PASSED on the mutated source. The original and
 *    the mutant produced IDENTICAL test results when they should have diverged → a
 *    coverage divergence → a Finding ("this behaviour is untested").
 *  - NO-COVERAGE — no test covers the site at all. Itself a finding (untested code),
 *    and a STRICTLY worse signal than a survivor (a survivor at least has a test
 *    that merely missed; a no-coverage mutant has nothing).
 *
 * The TEST RUNNER is INJECTED. {@link evaluateMutant} never spawns vitest itself —
 * it takes a `runner(mutatedSource, coveringTests) → { failed }`. Production injects
 * the real (heavy) vitest runner; the recursive META-PROOF injects a DETERMINISTIC
 * STUB runner (a pure predicate over tiny in-memory code+test pairs), so the whole
 * engine is provable at sub-millisecond speed with zero nondeterminism. This is the
 * same injected-capability discipline as the IR/cache/supply-chain seams.
 *
 * The COVERING-TESTS mapping is DETERMINISTIC: a {@link CoverageMap} resolves a
 * mutant's `(file, line)` to the sorted, de-duplicated set of test ids that exercise
 * it. The mapping is data the host supplies (from a coverage report); the verdict is
 * a pure fold over it + the runner.
 *
 * The verdict is CACHED against `(mutant.id + coveringTestsDigest + toolchainDigest)`
 * via the B2 content-addressed pattern (the injectable {@link MutantVerdictCache},
 * mirroring the gate-verdict cache): an unchanged mutant whose covering tests + the
 * toolchain are unchanged → a cached verdict tied to exactly that code. A mutant
 * whose covering tests changed (a new test, an edited assertion) → a new digest →
 * MISS → re-run. This makes whole-repo mutation a CHANGED-ONLY cost, the only way
 * mutation over real L4 seams is affordable.
 *
 * Composition over inheritance: a verdict is a `_tag` union (`killed` /
 * `survived` / `no-coverage`) — standalone functions over the open contract, no
 * class hierarchy.
 *
 * @module
 */
import { InvariantViolationError } from '@czap/error';
import { CanonicalCbor, addressedDigestOf } from '@czap/canonical';
import type { Mutant } from './mutation-engine.js';
import { applyMutant } from './mutation-engine.js';

/**
 * The injected test runner — run `coveringTests` against `mutatedSource` and report
 * whether ANY of them FAILED. `failed: true` ⇒ at least one covering test caught the
 * mutation (the mutant is killed). Pure w.r.t. its inputs in the stub; the
 * production runner is effectful (spawns vitest) but its CONTRACT is the same
 * boolean. It receives the FULL mutated source (so the production runner can write
 * it to a temp file and run the suite) and the covering test ids (so it runs only
 * the relevant subset).
 */
export type MutantTestRunner = (mutatedSource: string, coveringTests: readonly string[]) => { readonly failed: boolean };

/**
 * The deterministic covering-tests mapping — `(file, line)` → the sorted, unique
 * test ids that exercise that site. The host builds it from a coverage report; the
 * verdict reads it. A site with no entry (or an empty entry) is NO-COVERAGE.
 */
export interface CoverageMap {
  /** The sorted, de-duplicated test ids covering `(file, line)`, or `[]` if none. */
  covering(file: string, line: number): readonly string[];
}

/**
 * Build a deterministic {@link CoverageMap} from a flat `(file, line, testId)`
 * relation. The relation is de-duplicated and the per-site test lists are SORTED, so
 * the resulting covering set — and therefore its digest — is byte-stable regardless
 * of the relation's input order. The host supplies the relation from its coverage
 * tool; this composer makes it deterministic.
 */
export function makeCoverageMap(relation: readonly { readonly file: string; readonly line: number; readonly testId: string }[]): CoverageMap {
  const byKey = new Map<string, Set<string>>();
  for (const { file, line, testId } of relation) {
    const key = `${file}${line}`;
    const set = byKey.get(key) ?? new Set<string>();
    set.add(testId);
    byKey.set(key, set);
  }
  const resolved = new Map<string, readonly string[]>();
  for (const [key, set] of byKey) resolved.set(key, [...set].sort((a, b) => a.localeCompare(b)));
  return {
    covering(file: string, line: number): readonly string[] {
      return resolved.get(`${file}${line}`) ?? [];
    },
  };
}

/** A killed mutant — a covering test failed on it (adequate coverage). */
export interface KilledVerdict {
  readonly _tag: 'killed';
  readonly mutant: Mutant;
  /** The covering tests that were run (the evidence the mutation was exercised). */
  readonly coveringTests: readonly string[];
}

/** A surviving mutant — every covering test passed on it (a coverage divergence). */
export interface SurvivedVerdict {
  readonly _tag: 'survived';
  readonly mutant: Mutant;
  /** The covering tests that all passed (the evidence the behaviour is untested). */
  readonly coveringTests: readonly string[];
}

/** A mutant with no covering test at all — untested code (the worst signal). */
export interface NoCoverageVerdict {
  readonly _tag: 'no-coverage';
  readonly mutant: Mutant;
}

/** The closed verdict union — a `_tag` data discriminant (composition). */
export type MutantVerdict = KilledVerdict | SurvivedVerdict | NoCoverageVerdict;

/**
 * The injected verdict store — the B2 content-addressed cache for mutant verdicts,
 * mirroring `@czap/gauntlet`'s `GateVerdictCache`. Keys on the mutant's content
 * address bound to its covering-tests digest + the toolchain digest. `read` returns
 * `null` on any MISS (absent / unreadable / stale) — every uncertain case re-runs,
 * never serves a stale verdict (a stale "killed" hiding a now-surviving mutant would
 * be a LIE, the worst failure class). In-memory for the meta-proof; fs-backed in the
 * host.
 */
export interface MutantVerdictCache {
  /** The cached verdict tag for `key`, or `null` on a MISS (re-run). */
  read(key: string): MutantVerdict['_tag'] | null;
  /** Record the verdict tag produced for `key`. */
  write(key: string, tag: MutantVerdict['_tag']): void;
}

/** Options for {@link evaluateMutant} — the injected runner + (optional) cache. */
export interface EvaluateMutantOptions {
  /** The injected test runner (stub in the meta-proof, vitest in production). */
  readonly runner: MutantTestRunner;
  /** The deterministic covering-tests mapping. */
  readonly coverage: CoverageMap;
  /** The original (un-mutated) source the mutant splices into. */
  readonly originalSource: string;
  /**
   * The B2 verdict cache (optional). When present, the verdict is keyed against
   * `(mutant.id + coveringTestsDigest + toolchainDigest)` and a cache HIT skips the
   * runner entirely. Omit it → the runner always runs (the uncached path).
   */
  readonly cache?: MutantVerdictCache;
  /**
   * The host's toolchain digest (the gauntlet/test-runner build fingerprint) — the
   * anti-lie keystone of the verdict key, exactly as in the gate-verdict cache. A
   * runner-logic change → a new toolchain digest → every cached mutant verdict
   * invalidated even when the mutant + its covering tests are unchanged. REQUIRED
   * when `cache` is present (a cache without it could serve a verdict from a
   * different runner — a stale-serve lie).
   */
  readonly toolchainDigest?: string;
}

/** The field/record separators for the verdict key (US/RS control bytes). */
const UNIT = '';
const RECORD = '';

/**
 * The deterministic verdict-cache key for a mutant — `mutant.id` bound to the
 * digest of its covering tests and the toolchain digest. A change in ANY of the
 * three flips the key (→ MISS → re-run). The covering-tests digest is a stable fold
 * over the SORTED test ids (so insertion order never forks the key), routed through
 * the same `addressedDigestOf` content-addressing the engine uses.
 */
export function mutantVerdictKey(mutant: Mutant, coveringTests: readonly string[], toolchainDigest: string): string {
  const coveringDigest = addressedDigestOf(
    CanonicalCbor.encode([...coveringTests].sort((a, b) => a.localeCompare(b))),
    'blake3',
  ).integrity_digest;
  return [`mut${UNIT}${mutant.id}`, `cov${UNIT}${coveringDigest}`, `tc${UNIT}${toolchainDigest}`].join(RECORD);
}

/**
 * Evaluate ONE mutant to its kill/survive/no-coverage verdict — the second oracle's
 * answer. Pure w.r.t. the injected runner + coverage:
 *  1. Resolve the deterministic covering tests for the mutant's `(file, line)`.
 *  2. NO covering test → NO-COVERAGE (untested; the runner is never invoked).
 *  3. Otherwise reconstruct the mutated source ({@link applyMutant}) and run the
 *     covering tests through the injected runner: `failed` → KILLED, else SURVIVED.
 *
 * When a cache + toolchain digest are injected, a HIT short-circuits the runner. The
 * cache stores only the verdict TAG (the mutant + covering tests are re-resolved
 * from the inputs, so the cache is a pure speedup, never the source of truth).
 */
export function evaluateMutant(mutant: Mutant, options: EvaluateMutantOptions): MutantVerdict {
  const coveringTests = options.coverage.covering(mutant.file, mutant.line);
  if (coveringTests.length === 0) {
    return { _tag: 'no-coverage', mutant };
  }

  // The B2 cache path — armed ONLY when both the cache and the toolchain digest are
  // present (a cache without the toolchain digest could serve a verdict minted under
  // a different runner build — the stale-serve lie). Any uncertainty MISSES.
  const cacheKey = cacheKeyFor(mutant, coveringTests, options);
  if (cacheKey !== null && options.cache !== undefined) {
    const cachedTag = options.cache.read(cacheKey);
    if (cachedTag !== null) {
      return rehydrate(cachedTag, mutant, coveringTests);
    }
  }

  const mutatedSource = applyMutant(options.originalSource, mutant);
  const { failed } = options.runner(mutatedSource, coveringTests);
  const verdict: MutantVerdict = failed
    ? { _tag: 'killed', mutant, coveringTests }
    : { _tag: 'survived', mutant, coveringTests };

  if (cacheKey !== null && options.cache !== undefined) {
    options.cache.write(cacheKey, verdict._tag);
  }
  return verdict;
}

/**
 * The cache key for a mutant, or `null` when caching is NOT armed (no toolchain
 * digest supplied). Armed iff a toolchain digest is present — never a key without
 * the anti-lie keystone.
 */
function cacheKeyFor(mutant: Mutant, coveringTests: readonly string[], options: EvaluateMutantOptions): string | null {
  if (options.toolchainDigest === undefined) return null;
  return mutantVerdictKey(mutant, coveringTests, options.toolchainDigest);
}

/**
 * Rehydrate a cached verdict TAG into a full {@link MutantVerdict}. A `no-coverage`
 * tag can never be cached against a covered key (the no-coverage branch returns
 * before the cache path), so a `no-coverage` tag here is an impossible cache state —
 * a tagged invariant violation, never a silent coercion.
 */
function rehydrate(tag: MutantVerdict['_tag'], mutant: Mutant, coveringTests: readonly string[]): MutantVerdict {
  if (tag === 'killed') return { _tag: 'killed', mutant, coveringTests };
  if (tag === 'survived') return { _tag: 'survived', mutant, coveringTests };
  throw InvariantViolationError(
    'evaluateMutant',
    `cache returned a "no-coverage" verdict for a covered mutant (${mutant.id}) — a no-coverage verdict is never cached against a covered key`,
  );
}

/** The mutation SCORE summary over a set of verdicts — killed / total + survivors. */
export interface MutationScore {
  /** Total mutants evaluated (killed + survived + no-coverage). */
  readonly total: number;
  /** Mutants a covering test killed. */
  readonly killed: number;
  /** Mutants every covering test passed on (coverage divergences). */
  readonly survived: number;
  /** Mutants with no covering test at all (untested). */
  readonly noCoverage: number;
  /**
   * The kill score in [0, 1] — `killed / total`. A no-coverage mutant counts
   * AGAINST the score (it is in `total` but not `killed`): untested code is not
   * adequately tested. `total === 0` → a score of `1` (vacuously perfect — no
   * mutable behaviour to test). This is the number the L4 kill-floor compares and
   * the ratchet baseline pins.
   */
  readonly score: number;
}

/** Summarize a set of verdicts into a {@link MutationScore}. Pure + deterministic. */
export function scoreVerdicts(verdicts: readonly MutantVerdict[]): MutationScore {
  let killed = 0;
  let survived = 0;
  let noCoverage = 0;
  for (const v of verdicts) {
    if (v._tag === 'killed') killed += 1;
    else if (v._tag === 'survived') survived += 1;
    else noCoverage += 1;
  }
  const total = verdicts.length;
  return { total, killed, survived, noCoverage, score: total === 0 ? 1 : killed / total };
}
