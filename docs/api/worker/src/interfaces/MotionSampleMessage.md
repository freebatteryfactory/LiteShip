[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / MotionSampleMessage

# Interface: MotionSampleMessage

Defined in: [worker/src/motion-sample.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/motion-sample.ts#L28)

The message a worker posts for one sampled motion frame. The host relays `css`/`wgsl`
onto a bound element via `dispatchCzapEvent(el, 'czap:uniform-update', { css, wgsl })`.
Kept OUTSIDE the compositor/render `FromWorkerMessage` union on purpose — the motion
sampler is a self-contained adapter, not an extension of the render protocol.

## Properties

### css

> `readonly` **css**: `Record`\<`string`, `string`\>

Defined in: [worker/src/motion-sample.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/motion-sample.ts#L33)

Formatted leaf values → `czap:uniform-update` `detail.css`.

***

### t

> `readonly` **t**: `number`

Defined in: [worker/src/motion-sample.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/motion-sample.ts#L31)

Normalized program time this sample was taken at.

***

### type

> `readonly` **type**: `"motion-sample"`

Defined in: [worker/src/motion-sample.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/motion-sample.ts#L29)

***

### wgsl

> `readonly` **wgsl**: `Record`\<`string`, `number`\>

Defined in: [worker/src/motion-sample.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/motion-sample.ts#L35)

GPU-bound numeric leaves → `czap:uniform-update` `detail.wgsl`.
