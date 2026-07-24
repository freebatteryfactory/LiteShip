/**
 * Fuzz-corpus facts — the pre-computed, host-injected DECODE-FUZZ evidence the
 * {@link fuzzCorpusGate} folds into {@link Finding}s (the avionics-tier
 * untrusted-byte hardening verdict).
 *
 * This module defines the {@link FuzzCorpusFacts} INTERFACE and nothing else.
 * Like {@link RepoIR}, {@link SupplyChainFacts}, and {@link SimulationFacts}, it
 * carries NO heavy dependency: `@liteship/gauntlet` stays the lean engine, so it
 * never imports `fast-check`, the corpus, or any decoder. A HOST (the repo's
 * `tests/fuzz` driver via the CLI fuzz path) hammers every L4 decode surface with
 * the committed corpus + a fixed, seeded count of generated inputs, classifies
 * each outcome (fail-closed-or-typed vs a crash / a prototype-pollution / a
 * misparse), and hands the engine these flat, already-decided facts. The gate's
 * only job is to FOLD them into Findings at the avionics level (the lean engine
 * folds facts; the host computes them).
 *
 * THE FAIL-CLOSED SPINE: a decode SURFACE ingests untrusted serialized bytes; the
 * one invariant is that under ANY input it either returns a typed value or fails
 * closed with a tagged `@liteship/error` — never crashes, hangs, misparses, or
 * pollutes `Object.prototype`. A `crashed` / `polluted` / `misparsed` verdict is
 * the cardinal failure — a real security finding on the trust spine. The host
 * records it as a fact (the decoder id + the seed/source that reproduces it); the
 * gate folds it into a self-explaining L4 Finding carrying the reproducer.
 *
 * @module
 */

/**
 * The decode-fuzz evidence the host supplies — the result of running the corpus +
 * the seeded generated fuzz across every L4 decoder. `decoders` is EVERY decode
 * surface the host fuzzed; an empty/absent `decoders` is reported by the gate as
 * an advisory "not-evidenced" finding (honest under-coverage, never a silent
 * green) — see {@link fuzzCorpusGate}.
 */
export interface FuzzCorpusFacts {
  /** Every decoder the host fuzzed (corpus + generated). */
  readonly decoders?: readonly DecoderFuzzFact[];
  /**
   * The content address of the committed corpus the host replayed — pins WHICH
   * corpus produced this verdict (a drifted corpus is a different address). The
   * gate surfaces it on the report; a host that omits it is honest about not
   * having pinned the corpus identity.
   */
  readonly corpusAddress?: string;
}

/**
 * One decoder's fuzz verdict — the host ran the committed corpus seeds AND a
 * fixed, seeded count of generated inputs against it, and classified every
 * outcome. `failClosed` is true IFF EVERY input ended fail-closed-or-typed with
 * no prototype pollution. `violation` is present IFF the invariant broke (a crash
 * / a pollution / a misparse) — the cardinal failure.
 */
export interface DecoderFuzzFact {
  /** The decoder's stable id (the SUT / corpus key). */
  readonly decoderId: string;
  /** Every input was fail-closed-or-typed (no crash, no pollution, no misparse). */
  readonly failClosed: boolean;
  /** How many inputs were exercised (corpus seeds + generated). */
  readonly inputsExercised: number;
  /**
   * Present IFF the invariant broke — the decode-surface violation. Carries the
   * class + the reproducer so the Finding names a concrete, replayable failure,
   * not just "not fail-closed".
   */
  readonly violation?: DecodeViolation;
}

/** The class of a decode-fuzz violation — the cardinal failures the fail-closed contract forbids. */
export type DecodeViolationClass = 'crashed' | 'polluted' | 'misparsed';

/**
 * The recorded detail of a decode-surface violation — enough to act on without
 * re-running the fuzzer. `cls` is the failure class; `source` is the reproducer
 * (a corpus seed id, or `generated@seed=0x…` for a generated input — the fuzz is
 * deterministic, so the source replays byte-exact); `detail` is the human WHY.
 */
export interface DecodeViolation {
  /** The cardinal failure class: a raw crash, a prototype pollution, or a misparse. */
  readonly cls: DecodeViolationClass;
  /** The reproducer — a corpus seed id or a seeded generated source. */
  readonly source: string;
  /** Human WHY — e.g. "decoder threw an UNTAGGED TypeError ('…')". */
  readonly detail: string;
}
