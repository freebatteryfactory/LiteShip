[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / FromWorkerMessage

# Type Alias: FromWorkerMessage

> **FromWorkerMessage** = `ReadyMessage` \| `StateMessage` \| `ResolvedStateAckMessage` \| `FrameMessage` \| `RenderCompleteMessage` \| `ErrorMessage` \| [`MetricsMessage`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/worker/src/interfaces/MetricsMessage.md)

Defined in: [worker/src/messages.ts:328](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/messages.ts#L328)

Every message a worker may send back to the main thread. Discriminated
on the `type` field. Includes readiness, state updates, frame output,
metrics, completion signals, and errors.
