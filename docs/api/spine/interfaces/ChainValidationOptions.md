[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ChainValidationOptions

# Interface: ChainValidationOptions

Defined in: [\_spine/core.d.ts:1002](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1002)

Optional trust material and bounds used while validating a receipt chain.

## Properties

### base?

> `readonly` `optional` **base?**: `string`

Defined in: [\_spine/core.d.ts:1003](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1003)

***

### checkpoint?

> `readonly` `optional` **checkpoint?**: [`ReceiptEnvelope`](ReceiptEnvelope.md)

Defined in: [\_spine/core.d.ts:1004](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1004)

***

### verifyCheckpoint?

> `readonly` `optional` **verifyCheckpoint?**: (`checkpoint`) => `Promise`\<`boolean`\>

Defined in: [\_spine/core.d.ts:1012](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1012)

Provenance verifier for the checkpoint attestation (injected capability). The
structural checks prove the checkpoint is well-formed but not that it attests to
the real dropped set; inject a verifier (e.g. a signature check) to close the
residual forgery vector in an adversarial setting. Absent, the structural floor
applies (sound for trusted self-compaction). See ADR-0026.

#### Parameters

##### checkpoint

[`ReceiptEnvelope`](ReceiptEnvelope.md)

#### Returns

`Promise`\<`boolean`\>
