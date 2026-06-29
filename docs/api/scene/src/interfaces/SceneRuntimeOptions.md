[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / SceneRuntimeOptions

# Interface: SceneRuntimeOptions

Defined in: [scene/src/runtime.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L103)

Options accepted by [SceneRuntime.build](../variables/SceneRuntime.md#build).

## Properties

### mixSink?

> `readonly` `optional` **mixSink?**: (`receipt`) => `void`

Defined in: [scene/src/runtime.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L111)

Mix-receipt sink for PassThroughMixer. Defaults to a bounded ring
(last [DEFAULT\_MIX\_RECEIPT\_CAP](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts) receipts) accessible via
`handle.receipts`. Pass an explicit sink to receive every receipt.

#### Parameters

##### receipt

[`MixReceipt`](MixReceipt.md)

#### Returns

`void`

***

### sampleRate?

> `readonly` `optional` **sampleRate?**: `number`

Defined in: [scene/src/runtime.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L105)

Audio sample rate fed to AudioSystem. Defaults to 48_000.

***

### svgSink?

> `readonly` `optional` **svgSink?**: (`frame`) => `void`

Defined in: [scene/src/runtime.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/runtime.ts#L121)

SVG-egress sink. Invoked once per [SceneRuntimeHandle.tick](SceneRuntimeHandle.md#tick) AFTER
every system has run, with the entity-keyed [SvgAttrsFrame](../type-aliases/SvgAttrsFrame.md)
collected from the persisted `_svgAttrs` components SVGSystem composed
this tick. This is the reader that closes SVGSystem's dual-write: feed
the frame to `applySvgAttrs` for a live SVG tree, or snapshot it
headless. Regardless of whether a sink is supplied, the latest frame is
always available via [SceneRuntimeHandle.svgAttrs](SceneRuntimeHandle.md#svgattrs).

#### Parameters

##### frame

[`SvgAttrsFrame`](../type-aliases/SvgAttrsFrame.md)

#### Returns

`void`
