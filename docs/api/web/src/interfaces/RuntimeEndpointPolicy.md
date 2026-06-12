[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / RuntimeEndpointPolicy

# Interface: RuntimeEndpointPolicy

Defined in: [web/src/types.ts:196](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L196)

Host-provided policy that governs which origins the runtime may talk
to. `same-origin` is the default; `allowlist` consults
`allowOrigins` plus any per-kind overrides in `byKind`.

## Properties

### allowOrigins?

> `readonly` `optional` **allowOrigins?**: readonly `string`[]

Defined in: [web/src/types.ts:200](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L200)

Allowed origins when `mode` is `allowlist`.

***

### byKind?

> `readonly` `optional` **byKind?**: `Partial`\<`Record`\<[`RuntimeEndpointKind`](../type-aliases/RuntimeEndpointKind.md), readonly `string`[]\>\>

Defined in: [web/src/types.ts:202](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L202)

Optional per-endpoint-kind override allowlists.

***

### mode

> `readonly` **mode**: `"same-origin"` \| `"allowlist"`

Defined in: [web/src/types.ts:198](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L198)

Enforcement mode.
