[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / EvidenceRecorder

# Interface: EvidenceRecorder

Defined in: [gauntlet/src/evidence-recorder.ts:128](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L128)

A recorder + the wrapped context whose reads it captures.

## Properties

### context

> `readonly` **context**: [`GateContext`](GateContext.md)

Defined in: [gauntlet/src/evidence-recorder.ts:130](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L130)

The instrumented context to hand to `gate.run` / `gate.evidenceDigest`.

## Methods

### reads()

> **reads**(): `ReadonlySet`\<`string`\>

Defined in: [gauntlet/src/evidence-recorder.ts:132](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L132)

The set of channels read so far (an `out-of-IR readFile` records as `readFile:<path>`).

#### Returns

`ReadonlySet`\<`string`\>

***

### reset()

> **reset**(): `void`

Defined in: [gauntlet/src/evidence-recorder.ts:134](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L134)

Reset the recorded read-set (so `run` and `evidenceDigest` can be observed separately).

#### Returns

`void`
