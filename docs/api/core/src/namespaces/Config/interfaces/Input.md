[**LiteShip**](../../../../../README.md)

***

[LiteShip](../../../../../modules.md) / [core/src](../../../README.md) / [Config](../README.md) / Input

# Interface: Input

Defined in: [core/src/config.ts:139](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/config.ts#L139)

Raw user-facing input to [Config.make](../../../variables/Config.md#make) — every field is optional.

## Properties

### astro?

> `readonly` `optional` **astro?**: `Partial`\<[`CoreAstroConfig`](../../../interfaces/CoreAstroConfig.md)\>

Defined in: [core/src/config.ts:145](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/config.ts#L145)

***

### boundaries?

> `readonly` `optional` **boundaries?**: `Record`\<`string`, [`Shape`](../../Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>\>

Defined in: [core/src/config.ts:140](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/config.ts#L140)

***

### styles?

> `readonly` `optional` **styles?**: `Record`\<`string`, [`Shape`](../../Style/type-aliases/Shape.md)\<[`Shape`](../../Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>\>\>

Defined in: [core/src/config.ts:143](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/config.ts#L143)

***

### themes?

> `readonly` `optional` **themes?**: `Record`\<`string`, [`Shape`](../../Theme/type-aliases/Shape.md)\<readonly `string`[]\>\>

Defined in: [core/src/config.ts:142](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/config.ts#L142)

***

### tokens?

> `readonly` `optional` **tokens?**: `Record`\<`string`, [`Shape`](../../Token/type-aliases/Shape.md)\<`string`, readonly `string`[]\>\>

Defined in: [core/src/config.ts:141](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/config.ts#L141)

***

### vite?

> `readonly` `optional` **vite?**: `Partial`\<[`CorePluginConfig`](../../../interfaces/CorePluginConfig.md)\>

Defined in: [core/src/config.ts:144](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/config.ts#L144)
