/**
 * Coverage-guided-ish FUZZING harness for the L4 untrusted-byte decode surface.
 *
 * The trust spine ingests serialized bytes from outside the program (a persisted
 * DocumentGraph, a model-proposed GraphPatch, a published ShipCapsule, an HLC
 * stamp off the wire). Every such decoder must satisfy ONE invariant under ANY
 * input — malformed, truncated, oversized, deeply-nested, `__proto__`-keyed,
 * NaN/Infinity, duplicate-key, wrong-version, integer-overflow — :
 *
 *   it either RETURNS a valid typed value, or FAILS CLOSED with ONE canonical
 *   tagged `@czap/error` (a `ParseError` for the throw-style readers, a tagged
 *   `Effect.fail` for the Effect-style reader) — and it NEVER:
 *     - crashes with an UNCAUGHT/untagged error (a `TypeError`, a `RangeError`,
 *       a bare `Error`, a stack overflow surfaced as a raw throw),
 *     - hangs (bounded by the harness's per-input wall budget),
 *     - returns a misparsed / half value (the decoder's own contract decides
 *       "valid"; the harness only enforces fail-closed-or-typed),
 *     - POLLUTES `Object.prototype` (the known CVE class — a `__proto__` /
 *       `constructor` / `prototype` key in a decoded map must become OWN data,
 *       never mutate the global prototype).
 *
 * This module is the SUBSTRATE only: the pure SUT registry, the fail-closed
 * INVARIANT predicate, the prototype-pollution GUARD, and the deterministic
 * fuzz RUNNER (fast-check, fixed master seed → byte-exact reproducible; a found
 * failure replays from its seed). The corpus lives beside it
 * (`tests/fixtures/fuzz-corpus/`); the vitest driver
 * (`tests/fuzz/decode-fuzz.test.ts`) runs corpus + generated inputs and asserts
 * the invariant; the gauntlet `fuzzCorpusGate` folds the host-injected verdicts.
 *
 * Lives under `tests/fuzz/` (NOT a published `packages` src tree) on purpose:
 * `fast-check` is a repo-level test dependency, never a shipped `@czap` runtime
 * dependency — a decode fuzzer is test infrastructure, not product.
 *
 * @module
 */

import * as fc from 'fast-check';
import { Effect, Exit, Cause, Result } from 'effect';
import { isTaggedError } from '@czap/error';
import { decode as cborDecode } from '@czap/canonical';
import { HLC, GraphPatch, decodeDocumentGraph, ShipCapsule } from '@czap/core';

/**
 * The shape of a value a decoder ingests. The CBOR decoder reads bytes; the
 * version-aware readers (`GraphPatch.decode` / `decodeDocumentGraph`) read an
 * already-lowered `unknown` value (JSON / a model proposal); the HLC reader
 * reads a string; `ShipCapsule.decode` reads bytes through an Effect.
 *
 * The harness models each as a SUT that takes an opaque `unknown` and either
 * returns or fails-closed — so one runner exercises all of them, and the
 * fast-check arbitraries widen each to its native input class.
 */
export type DecoderInputKind = 'bytes' | 'value' | 'string';

/**
 * The outcome class of a single decode attempt, decided by {@link classifyDecode}.
 * Only `failed-closed` and `returned-typed` are ACCEPTABLE; every other class is
 * a FINDING (a crash, a pollution, a hang).
 */
export type DecodeOutcomeTag =
  | 'returned-typed' // decoder returned a value, prototype intact — OK
  | 'failed-closed' // decoder threw / Effect-failed a tagged @czap/error — OK
  | 'crashed' // decoder threw an UNTAGGED error (the bug: a raw crash)
  | 'polluted' // Object.prototype was mutated by the decode (the CVE class)
  | 'misparsed'; // reserved: a structurally-impossible return (decoder-specific)

/** A single decode attempt's verdict. Carries enough to reproduce + report. */
export interface DecodeOutcome {
  readonly tag: DecodeOutcomeTag;
  /** The `_tag` of the tagged error, when `failed-closed`. */
  readonly errorTag?: string;
  /** The untagged error's constructor name, when `crashed`. */
  readonly crashName?: string;
  /** The human reason, when not OK. */
  readonly detail?: string;
}

/** True iff the outcome is one of the two acceptable (fail-closed-or-typed) classes. */
export function isFailClosed(outcome: DecodeOutcome): boolean {
  return outcome.tag === 'returned-typed' || outcome.tag === 'failed-closed';
}

/**
 * A pure decoder under test. `run` takes the opaque input and either returns a
 * value or THROWS — Effect-style decoders are adapted to throw-on-failure inside
 * their `run` (see {@link SHIP_CAPSULE_SUT}), so the harness has ONE failure
 * channel. `failClosed` decides whether a thrown error is the decoder's TAGGED
 * fail-closed contract (acceptable) or an untagged crash (a finding).
 */
export interface DecoderSut {
  /** Stable id — the corpus key + the fuzz-fact key. */
  readonly id: string;
  /** What the decoder ingests, so the runner picks the right arbitrary. */
  readonly inputKind: DecoderInputKind;
  /** One-line description of the decode surface. */
  readonly describe: string;
  /** Run the decoder; return on success, throw on failure. */
  readonly run: (input: unknown) => unknown;
  /**
   * Decide whether a value THROWN by `run` is the decoder's tagged fail-closed
   * contract. Default: any `isTaggedError`. Overridable per SUT for a reader that
   * fails-closed through a non-error tagged value (e.g. the ShipCapsule Effect's
   * string failure channel, adapted to a tagged carrier).
   */
  readonly failClosed: (thrown: unknown) => boolean;
}

/**
 * Snapshot the set of keys an attacker could pollute onto `Object.prototype`.
 * A clean run leaves these ABSENT (or unchanged); a polluted run defines one.
 * The sentinels mirror the corpus's adversarial key set.
 */
const POLLUTION_SENTINELS = ['__polluted__', '__proto_pollution__', 'isAdmin', 'polluted'] as const;

/**
 * Read the current pollution witness: the value of each sentinel on
 * `Object.prototype` (via a FRESH empty object so we observe the prototype chain,
 * not an own property). All `undefined` ⇒ prototype is clean.
 */
function pollutionWitness(): Readonly<Record<string, unknown>> {
  const probe = {} as Record<string, unknown>;
  const witness: Record<string, unknown> = {};
  for (const key of POLLUTION_SENTINELS) {
    witness[key] = probe[key];
  }
  return witness;
}

/**
 * True iff two pollution witnesses differ — i.e. a decode mutated
 * `Object.prototype` through one of the sentinel keys. Compared by value so a
 * decode that SET then a later decode that RESET would still be caught at the
 * SET (the test asserts after each decode).
 */
function witnessDiffers(before: Readonly<Record<string, unknown>>, after: Readonly<Record<string, unknown>>): boolean {
  for (const key of POLLUTION_SENTINELS) {
    if (before[key] !== after[key]) return true;
  }
  return false;
}

/**
 * Run ONE decode attempt and classify the outcome. This is the heart of the
 * invariant: it catches every thrown value, sorts it into TAGGED (fail-closed,
 * OK) vs UNTAGGED (crash, a finding), and — regardless of success/failure —
 * asserts `Object.prototype` was not polluted by the attempt.
 *
 * Pure w.r.t. the SUT: it reads `pollutionWitness()` before + after, never
 * installs a sentinel itself (the corpus's adversarial inputs do that), so a
 * `polluted` verdict means the DECODER mutated the prototype.
 */
export function classifyDecode(sut: DecoderSut, input: unknown): DecodeOutcome {
  const before = pollutionWitness();
  let returnedValue: unknown;
  let thrown: unknown;
  let didThrow = false;
  try {
    returnedValue = sut.run(input);
  } catch (error) {
    didThrow = true;
    thrown = error;
  }
  const after = pollutionWitness();

  // POLLUTION is the cardinal class: it overrides return/throw. A decoder that
  // pollutes the prototype is a finding EVEN IF it then fails-closed — the
  // mutation already happened. Checked first so a pollution is never masked by a
  // subsequent tagged failure.
  if (witnessDiffers(before, after)) {
    return {
      tag: 'polluted',
      detail: `decode of input mutated Object.prototype (a sentinel key changed) — prototype-pollution via the decode surface`,
    };
  }

  if (!didThrow) {
    // Returned a value with the prototype intact — acceptable. The decoder's own
    // contract (round-trip tests) decides deeper validity; the fuzz invariant is
    // fail-closed-or-typed, and a clean return satisfies it.
    return { tag: 'returned-typed' };
  }

  // Thrown: TAGGED (the fail-closed contract) is acceptable; anything else is a
  // raw crash — a real security finding on the trust spine.
  if (sut.failClosed(thrown)) {
    const errorTag = isTaggedError(thrown) ? thrown._tag : 'tagged';
    return { tag: 'failed-closed', errorTag };
  }
  const crashName =
    thrown instanceof Error ? thrown.constructor.name : typeof thrown === 'object' ? 'object' : typeof thrown;
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  return {
    tag: 'crashed',
    crashName,
    detail: `decoder threw an UNTAGGED ${crashName} ("${message}") — a raw crash, not a fail-closed @czap/error`,
  };
}

// ── The SUT registry — the L4 decode surfaces that ingest untrusted bytes ─────

/** Default fail-closed predicate: a thrown value is the contract iff it is a tagged @czap/error. */
const taggedFailClosed = (thrown: unknown): boolean => isTaggedError(thrown);

/** CBOR decode — the canonical-CBOR reader (the CVE site: `__proto__` map key). */
export const CBOR_SUT: DecoderSut = {
  id: 'canonical-cbor.decode',
  inputKind: 'bytes',
  describe: 'Canonical CBOR decoder (@czap/canonical) — the strict RFC 8949 §4.2.1 reader; the __proto__ CVE site.',
  run: (input) => cborDecode(input as Uint8Array),
  failClosed: taggedFailClosed,
};

/** HLC decode — the colon-separated hex stamp reader. */
export const HLC_SUT: DecoderSut = {
  id: 'hlc.decode',
  inputKind: 'string',
  describe: 'HLC.decode (@czap/core) — the hybrid-logical-clock stamp reader (wall:counter:node hex).',
  run: (input) => HLC.decode(input as string),
  failClosed: taggedFailClosed,
};

/** GraphPatch decode — the version-aware tagged-delta envelope reader (#44). */
export const GRAPH_PATCH_SUT: DecoderSut = {
  id: 'graph-patch.decode',
  inputKind: 'value',
  describe: 'GraphPatch.decode (@czap/core) — the version-aware fail-closed reader for an untrusted patch envelope.',
  run: (input) => GraphPatch.decode(input),
  failClosed: taggedFailClosed,
};

/** DocumentGraph decode — the version-aware graph-envelope reader (#44). */
export const DOCUMENT_GRAPH_SUT: DecoderSut = {
  id: 'document-graph.decode',
  inputKind: 'value',
  describe:
    'decodeDocumentGraph (@czap/core) — the version-aware fail-closed reader for an untrusted DocumentGraph envelope.',
  run: (input) => decodeDocumentGraph(input),
  failClosed: taggedFailClosed,
};

/**
 * ShipCapsule decode — the version-aware release-artifact reader (ADR-0011).
 *
 * `ShipCapsule.decode` returns an `Effect` whose FAILURE channel is a tagged
 * STRING (`'malformed_cbor' | 'invalid_shape' | 'unsupported_version' |
 * 'non_canonical'`), not a thrown @czap/error. The harness has ONE failure
 * channel (throw), so `run` runs the Effect to an `Exit` and:
 *   - SUCCESS → returns the capsule (the `returned-typed` path),
 *   - the EXPECTED tagged failure → THROWS a sentinel carrying that string, which
 *     `failClosed` recognizes (the decoder's fail-closed contract, acceptable),
 *   - a DEFECT (an Effect die — an uncaught throw inside the decode) → re-throws
 *     the raw cause, which `failClosed` does NOT recognize (a real crash finding).
 *
 * The sentinel is a tagged carrier (not a raw string throw) so the harness's
 * single tagged-vs-untagged classifier stays uniform across every SUT.
 */
const SHIP_CAPSULE_TAGS = ['malformed_cbor', 'invalid_shape', 'unsupported_version', 'non_canonical'] as const;
type ShipCapsuleFailTag = (typeof SHIP_CAPSULE_TAGS)[number];

/** A tagged carrier for an EXPECTED ShipCapsule fail-closed verdict (the Effect's failure channel). */
interface ShipCapsuleFailClosed {
  readonly _tag: 'ShipCapsuleFailClosed';
  readonly reason: ShipCapsuleFailTag;
}
const isShipCapsuleFailClosed = (u: unknown): u is ShipCapsuleFailClosed =>
  typeof u === 'object' &&
  u !== null &&
  (u as { _tag?: unknown })._tag === 'ShipCapsuleFailClosed' &&
  SHIP_CAPSULE_TAGS.includes((u as ShipCapsuleFailClosed).reason);

export const SHIP_CAPSULE_SUT: DecoderSut = {
  id: 'ship-capsule.decode',
  inputKind: 'bytes',
  describe:
    'ShipCapsule.decode (@czap/core) — the version-aware release-artifact reader (ADR-0011); Effect-failure channel.',
  run: (input) => {
    const exit = Effect.runSyncExit(ShipCapsule.decode(input as Uint8Array));
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }
    // A FAILURE (the expected tagged string) vs a DEFECT (an uncaught throw =
    // a crash). Exit.causeOption gives the cause; a Fail carries the tagged
    // string, a Die carries the raw defect.
    const cause = exit.cause;
    // Effect's Cause: a Fail has `.error` (the tagged string); a Die has `.defect`.
    const failure = extractShipCapsuleFailure(cause);
    if (failure !== undefined) {
      // EXPECTED fail-closed — throw the tagged carrier the classifier accepts.
      const carrier: ShipCapsuleFailClosed = { _tag: 'ShipCapsuleFailClosed', reason: failure };
      throw carrier;
    }
    // A DEFECT: re-throw the raw cause so the classifier sees an UNTAGGED crash.
    throw extractShipCapsuleDefect(cause);
  },
  failClosed: (thrown) => isShipCapsuleFailClosed(thrown) || isTaggedError(thrown),
};

/**
 * Walk an Effect `Cause` for the ShipCapsule decode's EXPECTED string failure,
 * or `undefined` if the cause is a defect / interruption (a crash, not the
 * tagged channel). Reads only the public Cause shape (no `as unknown`): a `Fail`
 * cause exposes its tagged value, which the decode types as `ShipCapsuleDecodeError`.
 */
function extractShipCapsuleFailure(cause: Cause.Cause<ShipCapsuleFailTag>): ShipCapsuleFailTag | undefined {
  // `Cause.findError` returns a `Result<E, …>` — Success holds the FIRST EXPECTED
  // failure (the decode's tagged string), Failure means the cause carries no
  // expected error (a defect / interruption). Only an EXPECTED, recognized tag is
  // the decoder's fail-closed contract.
  const found = Cause.findError(cause);
  // `Result.getOrNull` extracts the Success value (the expected tagged failure) or
  // null when the cause carries no expected error (a defect / interruption).
  const tag = Result.getOrNull(found);
  if (tag !== null && SHIP_CAPSULE_TAGS.includes(tag)) {
    return tag;
  }
  return undefined;
}

/**
 * Extract a DEFECT (uncaught throw) from a Cause, as a raw value for the crash
 * classifier. A cause with no expected failure is a DEFECT — `Cause.squash`
 * collapses it to the underlying thrown value (a TypeError, a RangeError, …), so
 * the classifier sees the real untagged crash. A non-defect terminal (an
 * interruption) collapses to a tagged carrier the classifier treats as
 * fail-closed (a non-crash, non-pollution terminal the harness does not flag).
 */
function extractShipCapsuleDefect(cause: Cause.Cause<ShipCapsuleFailTag>): unknown {
  const squashed = Cause.squash(cause);
  if (squashed instanceof Error) {
    return squashed;
  }
  const carrier: ShipCapsuleFailClosed = { _tag: 'ShipCapsuleFailClosed', reason: 'malformed_cbor' };
  return carrier;
}

/** The full L4 decode-surface SUT registry — every untrusted-byte reader the fuzzer hammers. */
export const DECODER_SUTS: readonly DecoderSut[] = [
  CBOR_SUT,
  HLC_SUT,
  GRAPH_PATCH_SUT,
  DOCUMENT_GRAPH_SUT,
  SHIP_CAPSULE_SUT,
];

/** Look up a SUT by id — the corpus binds its seeds to a SUT by this id. */
export function sutById(id: string): DecoderSut | undefined {
  return DECODER_SUTS.find((s) => s.id === id);
}

// ── The adversarial arbitraries — the structurally-malformed input classes ────

/**
 * A `__proto__` / `constructor` / `prototype`-keyed nested object — the
 * prototype-pollution attack shape. Built so a NAIVE decoder (one that does
 * `out[key] = value`) would mutate `Object.prototype`. The sentinel payloads
 * mirror {@link POLLUTION_SENTINELS} so the guard catches a real mutation.
 */
const pollutionValueArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.record({
    __proto__: fc.record({ __polluted__: fc.constant(true), isAdmin: fc.constant(true) }),
  }),
  fc.record({
    constructor: fc.record({ prototype: fc.record({ polluted: fc.constant(true) }) }),
  }),
  fc.record({
    __proto__: fc.record({ __proto_pollution__: fc.boolean() }),
    constructor: fc.record({ prototype: fc.record({ isAdmin: fc.boolean() }) }),
  }),
);

/**
 * NaN / Infinity / -0 / huge / tiny numbers — the float adversaries. A decoder
 * that round-trips through a number must not crash on these.
 */
const adversarialNumberArb: fc.Arbitrary<number> = fc.oneof(
  fc.constant(Number.NaN),
  fc.constant(Number.POSITIVE_INFINITY),
  fc.constant(Number.NEGATIVE_INFINITY),
  fc.constant(-0),
  fc.constant(Number.MAX_SAFE_INTEGER),
  fc.constant(Number.MIN_SAFE_INTEGER),
  fc.constant(Number.MAX_VALUE),
  fc.constant(2 ** 53), // first unsafe integer
  fc.double(),
);

/**
 * A deeply-nested value (bounded depth) — the recursion-depth adversary. Decoders
 * that recurse per-level must not stack-overflow into a raw crash on a legal
 * input the harness can generate; the bound keeps the generator itself terminating.
 */
const deeplyNestedArb: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  nested: fc.oneof(
    { maxDepth: 12, depthIdentifier: 'nested' },
    fc.constant(null),
    fc.array(tie('nested'), { maxLength: 3 }),
    fc.record({ next: tie('nested'), tag: fc.string() }),
  ),
})).nested;

/**
 * A structurally-adversarial VALUE for the version-aware readers (GraphPatch /
 * DocumentGraph): wrong `_tag`, wrong `_version` (incl. future versions, NaN,
 * strings), missing fields, pollution keys, deep nesting, adversarial numbers,
 * and raw `fc.anything()` chaos. This is the input class the version-aware
 * fail-closed contract must survive.
 */
export const adversarialValueArb: fc.Arbitrary<unknown> = fc.oneof(
  pollutionValueArb,
  deeplyNestedArb,
  // Envelopes with adversarial _tag / _version — the version-skew class.
  fc.record({
    _tag: fc.oneof(fc.constant('GraphPatch'), fc.constant('DocumentGraph'), fc.string(), fc.constant(null)),
    _version: fc.oneof(adversarialNumberArb, fc.string(), fc.constant(null), fc.constant(undefined)),
    nodes: fc.oneof(fc.array(fc.anything(), { maxLength: 4 }), fc.anything()),
    edges: fc.oneof(fc.array(fc.anything(), { maxLength: 4 }), fc.anything()),
    ops: fc.oneof(fc.array(fc.anything(), { maxLength: 4 }), fc.anything()),
    base: fc.oneof(fc.string(), fc.anything()),
    meta: fc.oneof(fc.anything(), fc.constant(undefined)),
  }),
  // Raw chaos — the no-assumptions class.
  fc.anything(),
);

/**
 * A structurally-adversarial BYTE buffer for the CBOR / ShipCapsule readers:
 * arbitrary bytes (most are malformed CBOR), bounded so a single decode stays
 * within the wall budget. Truncation, oversized lengths, reserved additional-info,
 * and non-canonical encodings all fall naturally out of arbitrary bytes; the
 * corpus pins the SPECIFIC adversarial encodings (incl. the `__proto__` CVE bytes).
 */
export const adversarialBytesArb: fc.Arbitrary<Uint8Array> = fc.oneof(
  fc.uint8Array({ minLength: 0, maxLength: 64 }),
  // A CBOR map head (major 5) followed by chaos — biases toward the map-decode
  // path where the __proto__ CVE lives.
  fc
    .tuple(fc.constantFrom(0xa0, 0xa1, 0xa2, 0xbf), fc.uint8Array({ minLength: 0, maxLength: 48 }))
    .map(([head, rest]) => Uint8Array.from([head, ...rest])),
  // A CBOR array head (major 4) followed by chaos — the nested-array path.
  fc
    .tuple(fc.constantFrom(0x80, 0x9f, 0x98), fc.uint8Array({ minLength: 0, maxLength: 48 }))
    .map(([head, rest]) => Uint8Array.from([head, ...rest])),
);

/**
 * An adversarial STRING for the HLC reader: missing colons, non-hex parts, huge
 * counts of colons, pollution-shaped strings, control characters.
 */
export const adversarialStringArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constant(''),
  fc.constant(':::'),
  fc.constant('__proto__:0:x'),
  fc.constant('zzzz:0:n'), // non-hex wall
  fc.constant('0:zzzz:n'), // non-hex counter
  fc.array(fc.string(), { maxLength: 8 }).map((parts) => parts.join(':')),
  // Well-formed-ish HLC strings (hex wall:hex counter:node) — exercises the
  // SUCCESS path + boundary hex. `nat().toString(16)` is the hex-string source
  // (fast-check v4 dropped `hexaString`); the node id is arbitrary text.
  fc
    .tuple(fc.nat(), fc.nat({ max: 0xffff }), fc.string())
    .map(([w, c, n]) => `${w.toString(16)}:${c.toString(16)}:${n}`),
);

/** The arbitrary feeding a SUT, picked by its input kind. */
export function arbitraryFor(sut: DecoderSut): fc.Arbitrary<unknown> {
  switch (sut.inputKind) {
    case 'bytes':
      return adversarialBytesArb;
    case 'value':
      return adversarialValueArb;
    case 'string':
      return adversarialStringArb;
  }
}

// ── The deterministic fuzz runner ─────────────────────────────────────────────

/**
 * The FIXED master seed for the generated-input fuzz. A fuzzer MUST be
 * reproducible: this seed + a SUT's arbitrary → the SAME input stream every run,
 * so a found failure replays byte-exact. The same value the repo's benches use
 * (`0x5eed`) — one repo-wide fuzz seed, no per-call literals.
 */
export const FUZZ_MASTER_SEED = 0x5eed;

/**
 * The per-decoder GENERATED-input budget. Bounded so the fuzz run is CI-safe (no
 * unbounded fuzzing): the corpus is ALWAYS replayed (regression), and the fuzzer
 * explores exactly this many seeded inputs BEYOND it. Raise locally for a deeper
 * soak; the committed budget is the always-green CI floor.
 */
export const FUZZ_RUNS_PER_DECODER = 500;

/** The aggregate verdict for one decoder over the corpus + the generated fuzz. */
export interface DecoderFuzzVerdict {
  readonly decoderId: string;
  /** Every input was fail-closed-or-typed (no crash, no pollution). */
  readonly failClosed: boolean;
  /** How many inputs were exercised (corpus seeds + generated). */
  readonly inputsExercised: number;
  /** The first OFFENDING outcome, when `failClosed` is false (the reproducer). */
  readonly firstViolation?: {
    readonly outcome: DecodeOutcome;
    /** The seed that reproduces this input class (the master seed for generated; the corpus id for a seed). */
    readonly source: string;
  };
}

/**
 * Run the deterministic generated fuzz for ONE decoder: `FUZZ_RUNS_PER_DECODER`
 * inputs from `FUZZ_MASTER_SEED`, each classified, the FIRST non-fail-closed
 * outcome captured as the reproducer. Pure: no clock, no ambient randomness —
 * fast-check's seed is the only entropy source, so the result is byte-exact
 * reproducible. Does NOT throw on a finding (it REPORTS it in the verdict) — the
 * caller (the vitest driver / the gate-fact producer) decides how to surface it.
 */
export function fuzzGenerated(sut: DecoderSut, runs = FUZZ_RUNS_PER_DECODER): DecoderFuzzVerdict {
  const arb = arbitraryFor(sut);
  const samples = fc.sample(arb, { numRuns: runs, seed: FUZZ_MASTER_SEED });
  for (const sample of samples) {
    const outcome = classifyDecode(sut, sample);
    if (!isFailClosed(outcome)) {
      return {
        decoderId: sut.id,
        failClosed: false,
        inputsExercised: samples.length,
        firstViolation: { outcome, source: `generated@seed=0x${FUZZ_MASTER_SEED.toString(16)}` },
      };
    }
  }
  return { decoderId: sut.id, failClosed: true, inputsExercised: samples.length };
}
