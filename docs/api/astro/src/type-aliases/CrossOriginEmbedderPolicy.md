[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CrossOriginEmbedderPolicy

# Type Alias: CrossOriginEmbedderPolicy

> **CrossOriginEmbedderPolicy** = *typeof* `CROSS_ORIGIN_EMBEDDER_POLICIES`\[`number`\]

Defined in: edge/dist/cross-origin.d.ts:30

COEP values liteship can emit. Both establish cross-origin isolation (required for
`SharedArrayBuffer`); `credentialless` loads CORP-less third-party subresources
without credentials instead of blocking them.
