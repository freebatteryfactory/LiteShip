[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [create-liteship/src](../README.md) / projectNameFromDir

# Function: projectNameFromDir()

> **projectNameFromDir**(`dir`): `string`

Defined in: [create-liteship/src/scaffold.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L79)

Derive a valid npm package name from a directory name: lowercased,
invalid characters collapsed to `-`, leading/trailing separators
trimmed. Falls back to `liteship-app` when nothing survives.

## Parameters

### dir

`string`

## Returns

`string`
