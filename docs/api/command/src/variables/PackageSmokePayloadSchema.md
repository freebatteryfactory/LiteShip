[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PackageSmokePayloadSchema

# Variable: PackageSmokePayloadSchema

> `const` **PackageSmokePayloadSchema**: `Struct`\<\{ `failedStep`: `NullOr`\<`String`\>; `failure`: `NullOr`\<`String`\>; `importsSmoked`: `Number`; `ok`: `Boolean`; `packagesPacked`: `Number`; \}\>

Defined in: [command/src/commands/package-smoke.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke.ts#L35)

Structured payload returned by `package-smoke` — ONE Effect Schema is the
source of both [PackageSmokePayload](../type-aliases/PackageSmokePayload.md) and the descriptor's `outputSchema`.
