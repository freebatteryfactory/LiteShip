[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / EvidenceRecorder

# Interface: EvidenceRecorder

Defined in: [gauntlet/src/evidence-recorder.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L132)

A recorder + the wrapped context whose reads it captures.

## Properties

### context

> `readonly` **context**: [`GateContext`](GateContext.md)

Defined in: [gauntlet/src/evidence-recorder.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L134)

The instrumented context to hand to `gate.run` / `gate.evidenceDigest`.

## Methods

### reads()

> **reads**(): `ReadonlySet`\<`string`\>

Defined in: [gauntlet/src/evidence-recorder.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L136)

The set of channels read so far (an `out-of-IR readFile` records as `readFile:<path>`).

#### Returns

`ReadonlySet`\<`string`\>

***

### reset()

> **reset**(): `void`

Defined in: [gauntlet/src/evidence-recorder.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L138)

Reset the recorded read-set (so `run` and `evidenceDigest` can be observed separately).

#### Returns

`void`
