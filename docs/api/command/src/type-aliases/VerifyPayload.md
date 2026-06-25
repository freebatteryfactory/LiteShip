[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / VerifyPayload

# Type Alias: VerifyPayload

> **VerifyPayload** = `Omit`\<`Schema.Schema.Type`\<*typeof* [`VerifyPayloadSchema`](../variables/VerifyPayloadSchema.md)\>, `"capsule_id"`\> & `object`

Defined in: [command/src/commands/verify.ts:51](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/verify.ts#L51)

Structured payload returned alongside a verdict.

## Type Declaration

### capsule\_id

> `readonly` **capsule\_id**: [`ContentAddress`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/ContentAddress.md) \| `null`
