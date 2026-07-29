[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / streamReceiptCapsule

# Variable: streamReceiptCapsule

> `const` **streamReceiptCapsule**: `CapsuleDef`\<`"receiptedMutation"`, \{ `kind`: `"signal"` \| `"snapshot"` \| `"patch"` \| `"batch"`; `payload`: `unknown`; \}, \{ `receipt`: \{ `appliedAt`: `number`; `messageId`: `string`; `morphPath?`: `string`; \}; `status`: `"applied"` \| `"skipped"` \| `"failed"`; \}, `unknown`\>

Defined in: [web/src/stream-receipt-capsule.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream-receipt-capsule.ts#L35)

Declared capsule for the SSE stream receipt flow. Registered in the
immutable exported declaration; walked by the factory compiler.
