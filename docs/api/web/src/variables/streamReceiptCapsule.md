[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / streamReceiptCapsule

# Variable: streamReceiptCapsule

> `const` **streamReceiptCapsule**: `CapsuleDef`\<`"receiptedMutation"`, \{ `kind`: `"snapshot"` \| `"patch"` \| `"batch"` \| `"signal"`; `payload`: `unknown`; \}, \{ `receipt`: \{ `appliedAt`: `number`; `messageId`: `string`; `morphPath?`: `string`; \}; `status`: `"applied"` \| `"skipped"` \| `"failed"`; \}, `unknown`\>

Defined in: [web/src/capsules/stream-receipt.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/capsules/stream-receipt.ts#L35)

Declared capsule for the SSE stream receipt flow. Registered in the
module-level catalog at import time; walked by the factory compiler.
