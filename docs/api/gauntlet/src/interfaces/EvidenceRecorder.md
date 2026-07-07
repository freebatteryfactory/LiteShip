[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / EvidenceRecorder

# Interface: EvidenceRecorder

Defined in: [gauntlet/src/evidence-recorder.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L129)

A recorder + the wrapped context whose reads it captures.

## Properties

### context

> `readonly` **context**: [`GateContext`](GateContext.md)

Defined in: [gauntlet/src/evidence-recorder.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L131)

The instrumented context to hand to `gate.run` / `gate.evidenceDigest`.

## Methods

### reads()

> **reads**(): `ReadonlySet`\<`string`\>

Defined in: [gauntlet/src/evidence-recorder.ts:133](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L133)

The set of channels read so far (an `out-of-IR readFile` records as `readFile:<path>`).

#### Returns

`ReadonlySet`\<`string`\>

***

### reset()

> **reset**(): `void`

Defined in: [gauntlet/src/evidence-recorder.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L135)

Reset the recorded read-set (so `run` and `evidenceDigest` can be observed separately).

#### Returns

`void`
