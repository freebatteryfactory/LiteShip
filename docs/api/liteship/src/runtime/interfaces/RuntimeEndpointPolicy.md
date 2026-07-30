[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / RuntimeEndpointPolicy

# Interface: RuntimeEndpointPolicy

Defined in: web/dist/types.d.ts:163

Host-provided policy that governs which origins the runtime may talk
to. `same-origin` is the default; `allowlist` consults
`allowOrigins` plus any per-kind overrides in `byKind`.

## Properties

### allowOrigins?

> `readonly` `optional` **allowOrigins?**: readonly `string`[]

Defined in: web/dist/types.d.ts:167

Allowed origins when `mode` is `allowlist`.

***

### byKind?

> `readonly` `optional` **byKind?**: `Partial`\<`Record`\<[`RuntimeEndpointKind`](../type-aliases/RuntimeEndpointKind.md), readonly `string`[]\>\>

Defined in: web/dist/types.d.ts:169

Optional per-endpoint-kind override allowlists.

***

### mode

> `readonly` **mode**: `"same-origin"` \| `"allowlist"`

Defined in: web/dist/types.d.ts:165

Enforcement mode.
