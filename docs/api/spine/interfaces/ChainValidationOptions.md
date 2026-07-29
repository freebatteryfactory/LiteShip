[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ChainValidationOptions

# Interface: ChainValidationOptions

Defined in: [\_spine/core.d.ts:1218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1218)

Optional trust material and bounds used while validating a receipt chain.

## Properties

### base?

> `readonly` `optional` **base?**: `string`

Defined in: [\_spine/core.d.ts:1219](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1219)

***

### checkpoint?

> `readonly` `optional` **checkpoint?**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [\_spine/core.d.ts:1220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1220)

***

### verifyCheckpoint?

> `readonly` `optional` **verifyCheckpoint?**: (`checkpoint`) => `Promise`\<`boolean`\>

Defined in: [\_spine/core.d.ts:1228](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1228)

Provenance verifier for the checkpoint attestation (injected capability). The
structural checks prove the checkpoint is well-formed but not that it attests to
the real dropped set; inject a verifier (e.g. a signature check) to close the
residual forgery vector in an adversarial setting. Absent, the structural floor
applies (sound for trusted self-compaction).

#### Parameters

##### checkpoint

[`ReceiptEnvelope`](ReceiptEnvelope.md)

#### Returns

`Promise`\<`boolean`\>
