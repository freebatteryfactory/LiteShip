[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / CarrierInstance

# Type Alias: CarrierInstance\<C\>

> **CarrierInstance**\<`C`\> = `C` *extends* (...`args`) => infer R ? `R` : `never`

Defined in: core/dist/schema/ast.d.ts:36

The instance type a [BytesCtor](BytesCtor.md) produces — `CarrierInstance<typeof Uint8Array>`
is `Uint8Array`. Avoids `InstanceType`'s `any`-typed constraint (banned here).

## Type Parameters

### C

`C`
