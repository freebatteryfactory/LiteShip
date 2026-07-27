[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / PhysicalStateTracker

# Interface: PhysicalStateTracker

Defined in: web/dist/physical/capture.d.ts:17

Explicit host-owned IME and physical-state capture controller.

Creating a tracker installs three capture-phase composition listeners on the
supplied document. Awaiting [dispose](../../reactive/interfaces/AsyncOwnedResource.md#dispose) removes all three listeners and
clears the tracked composition synchronously. Importing this module performs
no active work.

## Extends

- [`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../reactive/interfaces/AsyncOwnedResource.md#lifetime)

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`[asyncDispose]`](../../reactive/interfaces/AsyncOwnedResource.md#asyncdispose)

***

### capture()

> **capture**(`root`): [`PhysicalState`](PhysicalState.md)

Defined in: web/dist/physical/capture.d.ts:19

Capture focus, selection, scroll, and this tracker's current IME state.

#### Parameters

##### root

`Element`

#### Returns

[`PhysicalState`](PhysicalState.md)

***

### captureIME()

> **captureIME**(): [`IMEState`](IMEState.md) \| `null`

Defined in: web/dist/physical/capture.d.ts:21

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

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../reactive/interfaces/AsyncOwnedResource.md#dispose)
