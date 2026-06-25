[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FuzzCorpusFacts

# Interface: FuzzCorpusFacts

Defined in: [gauntlet/src/fuzz-facts.ts:35](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L35)

The decode-fuzz evidence the host supplies — the result of running the corpus +
the seeded generated fuzz across every L4 decoder. `decoders` is EVERY decode
surface the host fuzzed; an empty/absent `decoders` is reported by the gate as
an advisory "not-evidenced" finding (honest under-coverage, never a silent
green) — see [fuzzCorpusGate](../variables/fuzzCorpusGate.md).

## Properties

### corpusAddress?

> `readonly` `optional` **corpusAddress?**: `string`

Defined in: [gauntlet/src/fuzz-facts.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L44)

The content address of the committed corpus the host replayed — pins WHICH
corpus produced this verdict (a drifted corpus is a different address). The
gate surfaces it on the report; a host that omits it is honest about not
having pinned the corpus identity.

***

### decoders?

> `readonly` `optional` **decoders?**: readonly [`DecoderFuzzFact`](DecoderFuzzFact.md)[]

Defined in: [gauntlet/src/fuzz-facts.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/fuzz-facts.ts#L37)

Every decoder the host fuzzed (corpus + generated).
