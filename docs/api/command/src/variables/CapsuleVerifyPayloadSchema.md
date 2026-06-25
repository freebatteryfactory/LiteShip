[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleVerifyPayloadSchema

# Variable: CapsuleVerifyPayloadSchema

> `const` **CapsuleVerifyPayloadSchema**: `Struct`\<\{ `benches`: `Struct`\<\{ `placeholder`: `$Array`\<`String`\>; `real`: `Number`; `total`: `Number`; \}\>; `capsuleCount`: `Number`; `errors`: `$Array`\<`String`\>; `status`: `Union`\<readonly \[`Literal`\<`"ok"`\>, `Literal`\<`"stale"`\>, `Literal`\<`"failed"`\>\]\>; \}\>

Defined in: [command/src/commands/capsule-verify.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/capsule-verify.ts#L47)

Structured payload returned by `capsule-verify` — ONE Effect Schema is the
source of both [CapsuleVerifyPayload](../type-aliases/CapsuleVerifyPayload.md) and the descriptor's `outputSchema`.
