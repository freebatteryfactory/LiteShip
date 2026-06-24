[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / onDetectReady

# Function: onDetectReady()

> **onDetectReady**(`callback`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [detect/src/detect-ready.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect-ready.ts#L54)

Subscribe to the `czap:detect-ready` event on `document`, returning a
[Disposer](../type-aliases/Disposer.md) that removes the listener.

The callback receives the final [DetectReadyDetail](../type-aliases/DetectReadyDetail.md) (or `null` if a
synthetic event without a typed detail was dispatched). The probe guarantees a
single settle (success or error), so `{ once: true }` self-removes — no leak
even if the event lands after a View-Transition swap. Calling the returned
disposer before settle removes the pending listener.

SSR-safe: with no `document`, the subscription is inert and the disposer is a
no-op.

## Parameters

### callback

(`detail`) => `void`

## Returns

[`Disposer`](../type-aliases/Disposer.md)
