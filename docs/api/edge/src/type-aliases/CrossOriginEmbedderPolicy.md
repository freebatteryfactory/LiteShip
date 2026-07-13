[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / CrossOriginEmbedderPolicy

# Type Alias: CrossOriginEmbedderPolicy

> **CrossOriginEmbedderPolicy** = *typeof* `CROSS_ORIGIN_EMBEDDER_POLICIES`\[`number`\]

Defined in: [edge/src/cross-origin.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/cross-origin.ts#L35)

COEP values czap can emit. Both establish cross-origin isolation (required for
`SharedArrayBuffer`); `credentialless` loads CORP-less third-party subresources
without credentials instead of blocking them.
