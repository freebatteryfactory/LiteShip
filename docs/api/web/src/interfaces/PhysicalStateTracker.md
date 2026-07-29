[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / PhysicalStateTracker

# Interface: PhysicalStateTracker

Defined in: [web/src/physical/capture.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/physical/capture.ts#L28)

Explicit host-owned IME and physical-state capture controller.

Creating a tracker installs three capture-phase composition listeners on the
supplied document. Awaiting [dispose](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#dispose) removes all three listeners and
clears the tracked composition synchronously. Importing this module performs
no active work.

## Extends

- [`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../../liteship/src/reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#lifetime)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`[asyncDispose]`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#asyncdispose)

***

### capture()

> **capture**(`root`): [`PhysicalState`](PhysicalState.md)

Defined in: [web/src/physical/capture.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/physical/capture.ts#L30)

Capture focus, selection, scroll, and this tracker's current IME state.

#### Parameters

##### root

`Element`

#### Returns

[`PhysicalState`](PhysicalState.md)

***

### captureIME()

> **captureIME**(): [`IMEState`](IMEState.md) \| `null`

Defined in: [web/src/physical/capture.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/physical/capture.ts#L32)

Capture only this tracker's current IME composition, if one is active.

#### Returns

[`IMEState`](IMEState.md) \| `null`

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:110

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../../liteship/src/reactive/interfaces/AsyncOwnedResource.md#dispose)
