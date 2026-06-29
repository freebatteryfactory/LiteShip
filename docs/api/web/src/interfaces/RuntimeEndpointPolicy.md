[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / RuntimeEndpointPolicy

# Interface: RuntimeEndpointPolicy

Defined in: [web/src/types.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L195)

Host-provided policy that governs which origins the runtime may talk
to. `same-origin` is the default; `allowlist` consults
`allowOrigins` plus any per-kind overrides in `byKind`.

## Properties

### allowOrigins?

> `readonly` `optional` **allowOrigins?**: readonly `string`[]

Defined in: [web/src/types.ts:199](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L199)

Allowed origins when `mode` is `allowlist`.

***

### byKind?

> `readonly` `optional` **byKind?**: `Partial`\<`Record`\<[`RuntimeEndpointKind`](../type-aliases/RuntimeEndpointKind.md), readonly `string`[]\>\>

Defined in: [web/src/types.ts:201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L201)

Optional per-endpoint-kind override allowlists.

***

### mode

> `readonly` **mode**: `"same-origin"` \| `"allowlist"`

Defined in: [web/src/types.ts:197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L197)

Enforcement mode.
