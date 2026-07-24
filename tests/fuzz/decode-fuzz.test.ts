/**
 * The decode-fuzz DRIVER — the LIVE run of the untrusted-byte decode-surface
 * fuzzer, the gate self-proof, and the CVE-closed regression.
 *
 * This is the vitest face of `decode-fuzz.ts` (the harness) + `fuzz-corpus`
 * (the corpus). It:
 *  1. REPLAYS the committed corpus against every decoder — every seed must end
 *     fail-closed-or-typed with NO prototype pollution (the regression floor,
 *     incl. the `__proto__` CVE seed which MUST stay closed).
 *  2. RUNS the deterministic generated fuzz (`FUZZ_RUNS_PER_DECODER` inputs from
 *     `FUZZ_MASTER_SEED`) against every decoder — the same invariant.
 *  3. FOLDS the per-decoder verdicts into `FuzzCorpusFacts` and asserts the
 *     `fuzzCorpusGate` reports a CLEAN run (no error finding) — the live tie from
 *     the harness to the gauntlet gate.
 *  4. SELF-PROVES the gate against its own red/green/mutation fixtures (the
 *     authority ratchet) — red caught, green clean, mutation killed → blocking.
 *
 * Determinism: the only entropy is `fast-check`'s fixed seed, so a found failure
 * replays byte-exact (its source is on the verdict). The corpus is replayed in
 * full every run; the generated count is bounded + seeded (CI-safe).
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  verifyGate,
  earnedAuthority,
  fuzzCorpusGate,
  memoryContext,
  type GateContext,
  type FuzzCorpusFacts,
  type DecoderFuzzFact,
} from '@liteship/gauntlet';
import { scaledTimeout } from '../../vitest.shared.js';
import {
  DECODER_SUTS,
  classifyDecode,
  isFailClosed,
  fuzzGenerated,
  sutById,
  FUZZ_MASTER_SEED,
  type DecoderSut,
  type DecodeOutcome,
} from './decode-fuzz.js';
import { FUZZ_CORPUS, seedsForDecoder, corpusAddress, CORPUS_SEEDS } from '../fixtures/fuzz-corpus/index.js';

/** A snapshot of the pollution sentinels on Object.prototype — the global-state guard. */
function prototypeIsClean(): boolean {
  const probe = {} as Record<string, unknown>;
  return (
    probe['__polluted__'] === undefined &&
    probe['__proto_pollution__'] === undefined &&
    probe['isAdmin'] === undefined &&
    probe['polluted'] === undefined
  );
}

describe('decode-fuzz — the corpus replays fail-closed (the regression floor)', () => {
  // Sanity: the harness never starts from a polluted prototype.
  it('Object.prototype is clean before any decode runs', () => {
    expect(prototypeIsClean()).toBe(true);
  });

  for (const sut of DECODER_SUTS) {
    const seeds = seedsForDecoder(sut.id);
    it(`${sut.id}: every corpus seed ends fail-closed-or-typed, no pollution`, () => {
      for (const seed of seeds) {
        const outcome: DecodeOutcome = classifyDecode(sut, seed.input);
        // The full contract: the outcome is acceptable AND matches the seed's
        // declared expectation (a malformed seed must FAIL closed, never return).
        expect(
          isFailClosed(outcome),
          `seed "${seed.id}" (${seed.note}) produced ${outcome.tag}: ${outcome.detail ?? ''}`,
        ).toBe(true);
        expect(
          seed.expect.includes(outcome.tag as 'failed-closed' | 'returned-typed'),
          `seed "${seed.id}" expected one of [${seed.expect.join(', ')}] but got ${outcome.tag}`,
        ).toBe(true);
        // The prototype must be clean after EACH decode — a pollution is caught at
        // the SET, not masked by a later reset.
        expect(prototypeIsClean(), `seed "${seed.id}" polluted Object.prototype`).toBe(true);
      }
    });
  }
});

describe('decode-fuzz — the CVE is confirmed CLOSED', () => {
  it('the __proto__ CBOR seed decodes to OWN data, never pollutes the prototype', () => {
    const cbor = sutById('canonical-cbor.decode');
    expect(cbor).toBeDefined();
    const cveSeed = CORPUS_SEEDS.find((s) => s.id === 'cve-proto-pollution-cbor');
    expect(cveSeed).toBeDefined();
    const outcome = classifyDecode(cbor as DecoderSut, (cveSeed as { input: unknown }).input);
    // Acceptable + specifically NOT a pollution.
    expect(outcome.tag).not.toBe('polluted');
    expect(isFailClosed(outcome)).toBe(true);
    expect(prototypeIsClean()).toBe(true);
    // And the global prototype is untouched after the decode (belt + suspenders).
    expect(({} as Record<string, unknown>)['__polluted__']).toBeUndefined();
    expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
  });

  it('the constructor.prototype CBOR seed also does not pollute', () => {
    const cbor = sutById('canonical-cbor.decode') as DecoderSut;
    const seed = CORPUS_SEEDS.find((s) => s.id === 'cve-constructor-pollution-cbor');
    const outcome = classifyDecode(cbor, (seed as { input: unknown }).input);
    expect(outcome.tag).not.toBe('polluted');
    expect(prototypeIsClean()).toBe(true);
  });
});

describe('decode-fuzz — the deterministic generated fuzz finds no new crash/pollution', () => {
  for (const sut of DECODER_SUTS) {
    it(
      `${sut.id}: every generated input (seed 0x${FUZZ_MASTER_SEED.toString(16)}) is fail-closed`,
      () => {
        const verdict = fuzzGenerated(sut);
        // If the fuzzer found a NEW violation, this fails LOUD with the reproducer —
        // it is NEVER swallowed. The reproducer (source) replays it byte-exact.
        expect(
          verdict.failClosed,
          verdict.firstViolation
            ? `NEW decode-surface violation in ${sut.id}: ${verdict.firstViolation.outcome.tag} from ${verdict.firstViolation.source} — ${verdict.firstViolation.outcome.detail ?? ''}. Add this input to the deopt→test corpus slot and FIX the decoder.`
            : 'expected fail-closed',
        ).toBe(true);
        expect(verdict.inputsExercised).toBeGreaterThan(0);
        expect(prototypeIsClean()).toBe(true);
      },
      scaledTimeout(30000),
    );
  }

  it('the generated fuzz is DETERMINISTIC — the same seed yields the same verdict twice', () => {
    const sut = sutById('canonical-cbor.decode') as DecoderSut;
    const a = fuzzGenerated(sut, 200);
    const b = fuzzGenerated(sut, 200);
    expect(a).toEqual(b);
  });
});

describe('decode-fuzz — the gate folds the LIVE verdicts (harness → gauntlet)', () => {
  /** Build the FuzzCorpusFacts from a live corpus + generated run over every decoder. */
  function liveFacts(): FuzzCorpusFacts {
    const decoders: DecoderFuzzFact[] = [];
    for (const sut of DECODER_SUTS) {
      // Corpus first (the regression floor), then the generated fuzz.
      let violation: DecoderFuzzFact['violation'];
      let exercised = 0;
      for (const seed of seedsForDecoder(sut.id)) {
        exercised += 1;
        const outcome = classifyDecode(sut, seed.input);
        if (!isFailClosed(outcome) && violation === undefined) {
          violation = {
            cls: outcome.tag === 'polluted' ? 'polluted' : outcome.tag === 'misparsed' ? 'misparsed' : 'crashed',
            source: seed.id,
            detail: outcome.detail ?? 'corpus seed broke the fail-closed invariant',
          };
        }
      }
      const generated = fuzzGenerated(sut);
      exercised += generated.inputsExercised;
      if (generated.firstViolation !== undefined && violation === undefined) {
        const o = generated.firstViolation.outcome;
        violation = {
          cls: o.tag === 'polluted' ? 'polluted' : o.tag === 'misparsed' ? 'misparsed' : 'crashed',
          source: generated.firstViolation.source,
          detail: o.detail ?? 'generated input broke the fail-closed invariant',
        };
      }
      decoders.push({
        decoderId: sut.id,
        failClosed: violation === undefined,
        inputsExercised: exercised,
        ...(violation !== undefined ? { violation } : {}),
      });
    }
    return { corpusAddress: corpusAddress(), decoders };
  }

  function factsContext(facts: FuzzCorpusFacts): GateContext {
    return { ...memoryContext({}), fuzzCorpus: facts };
  }

  it(
    'the gate reports a CLEAN run over the live fuzz facts (no error finding) — the decode surface is hardened',
    () => {
      const facts = liveFacts();
      // Every decoder fail-closed: no error finding (a green run).
      const findings = fuzzCorpusGate.run(factsContext(facts));
      const errors = findings.filter((f) => f.severity === 'error');
      expect(
        errors,
        `the gate folded decode-surface violations: ${errors.map((f) => f.title).join('; ')}`,
      ).toHaveLength(0);
      // Every decoder was attested fail-closed.
      expect(facts.decoders?.every((d) => d.failClosed)).toBe(true);
    },
    scaledTimeout(60000),
  );
});

describe('fuzzCorpusGate — authority ratchet (self-proof)', () => {
  it('self-proves and earns blocking authority', () => {
    const proof = verifyGate(fuzzCorpusGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });

  it('the level is L4 (avionics tier)', () => {
    expect(fuzzCorpusGate.level).toBe('L4');
  });

  it('NO injected facts → one advisory not-evidenced finding, zero errors (never a silent green)', () => {
    const findings = fuzzCorpusGate.run(memoryContext({}));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('advisory');
    expect(findings[0]?.ruleId).toBe('gauntlet/fuzz-corpus/not-evidenced');
  });

  it('a polluted-decoder fact reds the gate with a self-explaining L4 finding carrying the reproducer', () => {
    const facts: FuzzCorpusFacts = {
      decoders: [
        {
          decoderId: 'canonical-cbor.decode',
          failClosed: false,
          inputsExercised: 1,
          violation: { cls: 'polluted', source: 'cve-proto-pollution-cbor', detail: 'prototype mutated' },
        },
      ],
    };
    const findings = fuzzCorpusGate.run({ ...memoryContext({}), fuzzCorpus: facts });
    const err = findings.find((f) => f.severity === 'error');
    expect(err).toBeDefined();
    expect(err?.ruleId).toBe('gauntlet/fuzz-corpus/polluted');
    expect(err?.level).toBe('L4');
    expect(err?.detail).toContain('cve-proto-pollution-cbor');
  });
});

describe('decode-fuzz corpus — content-addressed identity (drift pin)', () => {
  it('the corpus has a stable content address (a silent seed edit changes it)', () => {
    const a = corpusAddress();
    const b = corpusAddress();
    expect(a).toBe(b);
    expect(a).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });

  it('every seed targets a real decoder SUT', () => {
    for (const seed of FUZZ_CORPUS) {
      expect(sutById(seed.decoderId), `seed "${seed.id}" targets unknown decoder "${seed.decoderId}"`).toBeDefined();
    }
  });
});
