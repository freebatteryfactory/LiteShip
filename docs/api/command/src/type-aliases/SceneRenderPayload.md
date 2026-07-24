[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SceneRenderPayload

# Type Alias: SceneRenderPayload

> **SceneRenderPayload** = `object`

Defined in: [command/src/commands/scene.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L75)

Structured payload returned by `scene.render` — mirrors SceneRenderPayloadSchema:
the rendered scene id, output path, frame count, and elapsed render duration,
plus the optional `fps`/`cached` echoes (pre-fps replayed receipts lack `fps`;
`cached` rides the live/replay split).

## Properties

### cached?

> `readonly` `optional` **cached?**: `boolean`

Defined in: [command/src/commands/scene.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L81)

***

### elapsedMs

> `readonly` **elapsedMs**: `number`

Defined in: [command/src/commands/scene.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L79)

***

### fps?

> `readonly` `optional` **fps?**: `number`

Defined in: [command/src/commands/scene.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L80)

***

### frameCount

> `readonly` **frameCount**: `number`

Defined in: [command/src/commands/scene.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L78)

***

### output

> `readonly` **output**: `string`

Defined in: [command/src/commands/scene.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L77)

***

### sceneId

> `readonly` **sceneId**: `string`

Defined in: [command/src/commands/scene.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L76)
