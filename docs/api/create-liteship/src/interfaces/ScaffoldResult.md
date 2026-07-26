[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [create-liteship/src](../README.md) / ScaffoldResult

# Interface: ScaffoldResult

Defined in: [create-liteship/src/scaffold.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L52)

Result of a successful scaffold: where it went and what was written.

## Properties

### files

> `readonly` **files**: readonly `string`[]

Defined in: [create-liteship/src/scaffold.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L58)

Relative paths of every file written, sorted, `/`-separated.

***

### projectDir

> `readonly` **projectDir**: `string`

Defined in: [create-liteship/src/scaffold.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L54)

Absolute path of the scaffolded project.

***

### projectName

> `readonly` **projectName**: `string`

Defined in: [create-liteship/src/scaffold.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L56)

The npm package name written into the project's package.json.
