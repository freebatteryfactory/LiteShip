/**
 * Gate: fuzz-corpus — the avionics-tier (L4) fold over host-supplied
 * {@link FuzzCorpusFacts}, the UNTRUSTED-BYTE DECODE-SURFACE hardening verdict.
 *
 * The trust spine ingests serialized bytes from outside the program (a persisted
 * DocumentGraph, a model-proposed GraphPatch, a published ShipCapsule, a CBOR
 * payload, an HLC stamp). Each such decoder must satisfy ONE invariant under ANY
 * input: it either returns a typed value or FAILS CLOSED with a tagged
 * `@liteship/error` — it NEVER crashes (a raw untagged throw), hangs, misparses, or
 * POLLUTES `Object.prototype` (the known `__proto__` CVE class). The host's
 * decode fuzzer (the `tests/fuzz` harness — `fast-check` over the committed
 * corpus + a fixed, seeded count of generated inputs) PROVES that per decoder by
 * classifying every outcome. A `crashed` / `polluted` / `misparsed` verdict is a
 * real security finding on the trust spine. This gate folds that verdict into a
 * self-explaining L4 Finding, carrying the REPRODUCER (a corpus seed id or a
 * `generated@seed=0x…` source) so the bug replays byte-for-byte.
 *
 * REPORT-not-DECIDE: a violation finding names the decoder, the failure class,
 * and the reproducer — the engine picks no winner; the reader (or an agent) acts
 * on the source. The gate NEVER re-runs the fuzzer, imports `fast-check`, or
 * touches the corpus — the HOST ran it and decided; the gate only folds the
 * already-decided facts (the same lean pattern as {@link simulationDeterminismGate}).
 *
 * LEAN BY CONSTRUCTION: the gate fuzzes nothing, imports no decoder, no corpus, no
 * `fast-check`. An ABSENT facts record is an HONEST advisory "not-evidenced"
 * finding (never a silent green) — a host that supplied no fuzz facts gets one
 * advisory, surfacing the under-coverage.
 *
 * It ships red / green / mutation fixtures, so it self-proves against the
 * authority ratchet and earns blocking authority.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { DecoderFuzzFact, DecodeViolationClass, FuzzCorpusFacts } from '../facts/fuzz-facts.js';

const RULE_NS = 'gauntlet/fuzz-corpus';

/** Human label for each cardinal violation class — woven into the finding title/detail. */
const CLASS_LABEL: Readonly<Record<DecodeViolationClass, string>> = {
  crashed: 'a raw untagged crash (not a fail-closed @liteship/error)',
  polluted: 'a prototype pollution (Object.prototype was mutated by the decode — the __proto__ CVE class)',
  misparsed: 'a misparse (a malformed input produced a value instead of failing closed)',
};

/**
 * Project one decoder's fuzz VIOLATION into an error Finding at the avionics
 * level. The reproducer (the corpus seed id or the seeded generated source) is
 * woven into the detail so the bug is reproducible from the finding alone.
 */
function violationFinding(fact: DecoderFuzzFact): Finding {
  // Present only for a violated decoder (the caller guards), but read defensively
  // so the projection never assumes a field the type marks optional.
  const cls = fact.violation?.cls ?? 'crashed';
  const source = fact.violation?.source ?? '(unknown reproducer)';
  const why = fact.violation?.detail ?? 'the decode-fuzz invariant (fail-closed-or-typed, no pollution) broke';
  return finding({
    ruleId: `${RULE_NS}/${cls}`,
    severity: 'error',
    level: 'L4',
    title: `Decode-surface violation in "${fact.decoderId}" — ${cls}`,
    detail:
      `The decoder "${fact.decoderId}" failed the fail-closed-or-typed invariant on a fuzz input: ${CLASS_LABEL[cls]}. ` +
      `Reproducer: ${source}. ${why}. The decode surface ingests UNTRUSTED serialized bytes, so this is a security ` +
      `finding on the trust spine — a decoder must NEVER crash, hang, misparse, or pollute Object.prototype; it must ` +
      `return a typed value or fail closed with a tagged @liteship/error. The engine picks no winner; reproduce it from "${source}".`,
    location: { file: fact.decoderId },
    remediation: {
      kind: 'instruction',
      description:
        'Make the decoder fail closed on the offending input — return a typed value or throw ONE tagged @liteship/error.',
      steps: [
        `Reproduce: replay the source \`${source}\` through the \`tests/fuzz\` harness against "${fact.decoderId}" (the fuzz is deterministic — the seed/seed-id reproduces the input byte-exact).`,
        cls === 'polluted'
          ? 'Close the pollution: a decoded map key (__proto__ / constructor / prototype) must become an OWN data property via Object.defineProperty, never a bare `out[key] = value` that walks the prototype setter.'
          : cls === 'crashed'
            ? 'Close the crash: wrap the offending read so every malformed-input path raises a tagged @liteship/error (ParseError) instead of a raw TypeError/RangeError/stack-overflow throw.'
            : 'Close the misparse: a malformed input that currently RETURNS a value must instead fail closed — tighten the reader so the structural/version check rejects it with a tagged @liteship/error.',
        'Promote the reproducer to a PERMANENT corpus seed (the deopt→test slot in `tests/fixtures/fuzz-corpus`) so the fixed bug can never silently regress, then re-run the fuzzer — the violation must clear.',
      ],
    },
  });
}

/** The advisory finding for absent decode-fuzz evidence (honest under-coverage). */
function notEvidencedFinding(): Finding {
  return finding({
    ruleId: `${RULE_NS}/not-evidenced`,
    severity: 'advisory',
    level: 'L4',
    title: 'Decode-surface fuzzing not evidenced',
    detail:
      'No fuzz-corpus facts were injected on the GateContext, so the gate cannot attest the untrusted-byte decode surface is hardened. ' +
      'This is honest under-coverage (advisory), never a silent pass — a host (the `tests/fuzz` decode fuzzer) must hammer every L4 ' +
      'decoder with the committed corpus + a seeded count of generated inputs and inject the per-decoder verdicts via context.fuzzCorpus.',
    remediation: {
      kind: 'instruction',
      description: 'Supply the decode-fuzz facts so the avionics gate can attest the decode surface is fail-closed.',
      steps: [
        'Run the `tests/fuzz` decode fuzzer (the committed corpus + the seeded generated fuzz over every L4 decoder).',
        'Inject the resulting FuzzCorpusFacts via the GateContext (context.fuzzCorpus.decoders).',
      ],
    },
  });
}

/** The fold: project the injected decode-fuzz facts into Findings. */
function fold(context: GateContext): readonly Finding[] {
  const facts: FuzzCorpusFacts | undefined = context.fuzzCorpus;
  // ABSENT facts OR an empty decoder set are both honest under-coverage: the gate
  // attested nothing, so it says so (advisory) rather than passing silently.
  if (facts === undefined || facts.decoders === undefined || facts.decoders.length === 0) {
    return [notEvidencedFinding()];
  }
  const findings: Finding[] = [];
  for (const fact of facts.decoders) {
    // A decoder is a finding iff it is NOT fail-closed — the violation carries the
    // class + reproducer. `failClosed === true` with no violation is a clean decode
    // surface (no finding).
    if (!fact.failClosed || fact.violation !== undefined) {
      findings.push(violationFinding(fact));
    }
  }
  return findings;
}

/** A GateContext carrying a literal FuzzCorpusFacts record (fixture helper). */
function factsContext(facts: FuzzCorpusFacts): GateContext {
  return { ...memoryContext({}), fuzzCorpus: facts };
}

/** A clean corpus: every decoder fail-closed-or-typed across the corpus + the generated fuzz. */
const CLEAN_FACTS: FuzzCorpusFacts = {
  corpusAddress: 'fnv1a:0a0b0c0d',
  decoders: [
    { decoderId: 'canonical-cbor.decode', failClosed: true, inputsExercised: 511 },
    { decoderId: 'hlc.decode', failClosed: true, inputsExercised: 506 },
    { decoderId: 'graph-patch.decode', failClosed: true, inputsExercised: 515 },
    { decoderId: 'document-graph.decode', failClosed: true, inputsExercised: 514 },
    { decoderId: 'ship-capsule.decode', failClosed: true, inputsExercised: 503 },
  ],
};

/**
 * A corpus with one decode-surface violation — a prototype pollution (the CVE
 * class reopened on the CBOR decoder). The red the gate MUST flag.
 */
const VIOLATED_FACTS: FuzzCorpusFacts = {
  corpusAddress: 'fnv1a:0a0b0c0d',
  decoders: [
    { decoderId: 'hlc.decode', failClosed: true, inputsExercised: 506 },
    {
      decoderId: 'canonical-cbor.decode',
      failClosed: false,
      inputsExercised: 12,
      violation: {
        cls: 'polluted',
        source: 'cve-proto-pollution-cbor',
        detail:
          'decode of the canonical CBOR for { __proto__: [] } mutated Object.prototype (the __polluted__ sentinel appeared on the prototype chain) — the prototype-pollution CVE reopened',
      },
    },
  ],
};

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const fuzzCorpusGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    'Avionics-tier fold over host-supplied decode-fuzz facts: a decode-surface violation (a crash / a prototype pollution / a misparse on an untrusted-byte decoder) is a self-explaining L4 Finding carrying the reproducer — the untrusted-byte decode surface is the trust spine.',
  run: fold,
  // OUT-OF-IR evidence: the injected FuzzCorpusFacts come from an EXTERNAL fuzzer run
  // over the committed `tests/fixtures/fuzz-corpus` + seeded generated inputs (a decoder
  // flips clean↔violation as the corpus / seed changes), NOT from any IR source byte.
  // Fold the fact content so the cache refolds on a decoder-verdict change (the
  // soundness keystone for this gate).
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('fuzzCorpus', context.fuzzCorpus),
  fixtures: {
    red: {
      name: 'a corpus where the CBOR decoder pollutes Object.prototype on the __proto__ CVE seed (the fail-closed invariant broke)',
      context: factsContext(VIOLATED_FACTS),
    },
    green: {
      name: 'a corpus where every decoder is fail-closed-or-typed across the corpus + the generated fuzz (no crash, no pollution)',
      context: factsContext(CLEAN_FACTS),
    },
    mutation: {
      describe:
        'A gate that ignores the recorded violation (folds only "not-evidenced") leaves the red corpus unflagged — the mutant must then fail the red.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: drop every violation on the floor (a toothless fold that never
        // reports a real decode-surface violation) — it must fail the red fixture.
        run: (context: GateContext): readonly Finding[] =>
          context.fuzzCorpus === undefined ? [notEvidencedFinding()] : [],
      }),
    },
  },
});
