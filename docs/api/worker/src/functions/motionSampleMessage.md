[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [worker/src](../README.md) / motionSampleMessage

# Function: motionSampleMessage()

> **motionSampleMessage**(`plan`, `t`): [`MotionSampleMessage`](../interfaces/MotionSampleMessage.md)

Defined in: [worker/src/motion-sample.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/worker/src/motion-sample.ts#L43)

Build the [MotionSampleMessage](../interfaces/MotionSampleMessage.md) for progress `t` by sampling the shared kernel
off-thread. This is the ENTIRE worker adapter: sample once, wrap in a structured-clone
safe envelope. A worker's `message` handler calls this and `self.postMessage(msg)`.

## Parameters

### plan

`RuntimeWritePlan`

### t

`number`

## Returns

[`MotionSampleMessage`](../interfaces/MotionSampleMessage.md)
