[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / FromWorkerMessage

# Type Alias: FromWorkerMessage

> **FromWorkerMessage** = `ReadyMessage` \| `StateMessage` \| `ResolvedStateAckMessage` \| `FrameMessage` \| `RenderCompleteMessage` \| `ErrorMessage` \| `MetricsMessage`

Defined in: [worker/src/messages.ts:306](https://github.com/heyoub/LiteShip/blob/main/packages/worker/src/messages.ts#L306)

Every message a worker may send back to the main thread. Discriminated
on the `type` field. Includes readiness, state updates, frame output,
metrics, completion signals, and errors.
