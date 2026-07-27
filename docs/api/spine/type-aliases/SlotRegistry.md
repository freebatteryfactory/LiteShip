[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SlotRegistry

# Type Alias: SlotRegistry

> **SlotRegistry** = `object`

Defined in: [\_spine/web.d.ts:188](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L188)

## Methods

### create()

> **create**(): `SlotRegistry`

Defined in: [\_spine/web.d.ts:198](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L198)

#### Returns

`SlotRegistry`

***

### findElement()

> **findElement**(`path`): `Element` \| `null`

Defined in: [\_spine/web.d.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L206)

#### Parameters

##### path

[`SlotPath`](SlotPath.md)

#### Returns

`Element` \| `null`

***

### getPath()

> **getPath**(`element`): [`SlotPath`](SlotPath.md) \| `null`

Defined in: [\_spine/web.d.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L207)

#### Parameters

##### element

`Element`

#### Returns

[`SlotPath`](SlotPath.md) \| `null`

***

### observe()

> **observe**(`registry`, `root`): () => `void`

Defined in: [\_spine/web.d.ts:205](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L205)

Attach a MutationObserver and return its disposer (was
`Effect.Effect<void, never, Scope>`): register the returned function on a
[Lifetime](../namespaces/Lifetime/README.md), or call it directly, to disconnect the observer.

#### Parameters

##### registry

`SlotRegistry`

##### root

`Element`

#### Returns

() => `void`

***

### scanDOM()

> **scanDOM**(`registry`, `root`, `defaultMode?`): `void`

Defined in: [\_spine/web.d.ts:199](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L199)

#### Parameters

##### registry

`SlotRegistry`

##### root

`Element`

##### defaultMode?

[`IslandMode`](IslandMode.md)

#### Returns

`void`
