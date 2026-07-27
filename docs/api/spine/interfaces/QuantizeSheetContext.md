[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / QuantizeSheetContext

# Interface: QuantizeSheetContext

Defined in: [\_spine/vite.d.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L83)

Sheet-level aggregation context for viewport containment: thread ONE
instance through every `compileQuantizeBlock` call of a stylesheet and
emit a single `:root` rule via `viewportContainmentRule`
(`container-name` is a replaced property -- per-block rules would
overwrite each other).

## Properties

### viewportContainerNames

> `readonly` **viewportContainerNames**: `Set`\<`string`\>

Defined in: [\_spine/vite.d.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L84)
