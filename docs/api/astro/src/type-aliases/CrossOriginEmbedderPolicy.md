[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / CrossOriginEmbedderPolicy

# Type Alias: CrossOriginEmbedderPolicy

> **CrossOriginEmbedderPolicy** = `"require-corp"` \| `"credentialless"`

Defined in: [astro/src/headers.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/headers.ts#L34)

COEP values czap can emit. Both establish cross-origin isolation
(required for `SharedArrayBuffer`); `credentialless` loads CORP-less
third-party subresources without credentials instead of blocking them.
