[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SlotRegistry

# Type Alias: SlotRegistry

> **SlotRegistry** = `object`

Defined in: [\_spine/web.d.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L176)

## Methods

### create()

> **create**(): `SlotRegistry`

Defined in: [\_spine/web.d.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L186)

#### Returns

`SlotRegistry`

***

### findElement()

> **findElement**(`path`): `Element` \| `null`

Defined in: [\_spine/web.d.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L194)

#### Parameters

##### path

[`SlotPath`](SlotPath.md)

#### Returns

`Element` \| `null`

***

### getPath()

> **getPath**(`element`): [`SlotPath`](SlotPath.md) \| `null`

Defined in: [\_spine/web.d.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L195)

#### Parameters

##### element

`Element`

#### Returns

[`SlotPath`](SlotPath.md) \| `null`

***

### observe()

> **observe**(`registry`, `root`): () => `void`

Defined in: [\_spine/web.d.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L193)

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

Defined in: [\_spine/web.d.ts:187](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L187)

#### Parameters

##### registry

`SlotRegistry`

##### root

`Element`

##### defaultMode?

[`IslandMode`](IslandMode.md)

#### Returns

`void`
