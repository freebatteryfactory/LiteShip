[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / SceneRenderPayload

# Type Alias: SceneRenderPayload

> **SceneRenderPayload** = `object`

Defined in: [command/src/commands/scene.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L77)

Structured payload returned by `scene.render` — mirrors SceneRenderPayloadSchema:
the rendered scene id, output path, frame count, and elapsed render duration,
plus the optional `fps`/`cached` echoes (pre-fps replayed receipts lack `fps`;
`cached` rides the live/replay split).

## Properties

### cached?

> `readonly` `optional` **cached?**: `boolean`

Defined in: [command/src/commands/scene.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L85)

***

### elapsedMs

> `readonly` **elapsedMs**: `number`

Defined in: [command/src/commands/scene.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L81)

***

### fps?

> `readonly` `optional` **fps?**: `number`

Defined in: [command/src/commands/scene.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L82)

***

### frameCount

> `readonly` **frameCount**: `number`

Defined in: [command/src/commands/scene.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L80)

***

### height?

> `readonly` `optional` **height?**: `number`

Defined in: [command/src/commands/scene.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L84)

***

### output

> `readonly` **output**: `string`

Defined in: [command/src/commands/scene.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L79)

***

### sceneId

> `readonly` **sceneId**: `string`

Defined in: [command/src/commands/scene.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L78)

***

### width?

> `readonly` `optional` **width?**: `number`

Defined in: [command/src/commands/scene.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/scene.ts#L83)
