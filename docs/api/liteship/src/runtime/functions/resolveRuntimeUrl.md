[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / resolveRuntimeUrl

# Function: resolveRuntimeUrl()

> **resolveRuntimeUrl**(`rawUrl`, `options`): [`RuntimeUrlResolution`](../type-aliases/RuntimeUrlResolution.md)

Defined in: web/dist/security/runtime-url.d.ts:121

Resolve a user-supplied `rawUrl` under `options.policy` and classify
the result as one of [RuntimeUrlResolution](../type-aliases/RuntimeUrlResolution.md)'s variants.

The function never throws; malformed URLs produce a `malformed`
variant and cross-origin / policy violations produce correspondingly
typed rejections. Path-relative URLs (no leading `//`) inherit the base
origin and skip the private-IP SSRF check; any URL that resolves
cross-origin — scheme-absolute OR protocol-relative — is SSRF-checked.

## Parameters

### rawUrl

`string` \| `null` \| `undefined`

### options

`ResolveRuntimeUrlOptions`

## Returns

[`RuntimeUrlResolution`](../type-aliases/RuntimeUrlResolution.md)
