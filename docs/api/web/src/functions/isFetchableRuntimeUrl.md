[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / isFetchableRuntimeUrl

# Function: isFetchableRuntimeUrl()

> **isFetchableRuntimeUrl**(`rawUrl`): `boolean`

Defined in: [web/src/security/runtime-url.ts:324](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/runtime-url.ts#L324)

The CANONICAL "is this a fetchable runtime URL?" predicate — the single source of
truth that the shader-integrity classifier ([isExternalShaderSource](isExternalShaderSource.md))
DELEGATES to, so the two can never drift. A token is a fetchable runtime URL IFF:

  1. it is NOT a genuine inline shader BODY (isInlineShaderBody) — i.e. it
     is not MULTI-LINE program text (a raw newline). A URL/path CAN contain a space
     (`shader file.wgsl`) AND legal-but-shader-looking characters (`shader{1}.wgsl`,
     `./shader;v=1.wgsl`, `shader?x={y}`, `shaders/fn file.wgsl`), so NEITHER inner
     whitespace NOR any in-content character marker is the discriminator — only a
     raw newline (which a URL can never contain) marks a multi-line body; AND
  2. [resolveRuntimeUrl](resolveRuntimeUrl.md) treats it as a URL — i.e. the resolution is NEITHER
     `'missing'` (empty) NOR `'malformed'` (the parser rejected it). EVERY other
     variant (`allowed`, `cross-origin-rejected`, `origin-not-allowed`,
     `kind-not-allowed`, `private-ip-rejected`) means "this IS a URL the policy
     reasoned about" — fetchable in shape, even when the policy then refuses the
     ORIGIN. A refused-origin URL is still a URL, never an inline body.

This captures EXACTLY the inputs `resolveRuntimeUrl` would treat as a fetchable
URL vs an opaque body. It deliberately uses the `'gpu-shader'` kind and a
`same-origin` policy: the classification question is "URL-or-body?", which the
kind/origin-allowlist does NOT change (a cross-origin URL is still URL-SHAPED, it
is merely refused) — so the predicate is stable regardless of the host's policy.

Shapes this accepts (all URL-shaped, none an inline body): root-absolute
(`/x.glsl`), path-relative (`shaders/x.glsl`, `./x`, `../x`), path-WITH-A-SPACE
(`shader file.wgsl`, `./shader file.wgsl` — a fetchable URL the policy accepts),
path-WITH-SHADER-LOOKING-PUNCTUATION (`shader{1}.wgsl`, `./shader;v=1.wgsl`,
`shader?x={y}`, `shaders/fn file.wgsl` — all single-line, all legal URLs),
query-relative (`?shader=wave`), bare same-dir (`wave`), protocol-relative
(`//host/x`), scheme-absolute (`http(s)://…`), and URL-scheme tokens (`data:…`,
`blob:…`). A genuine MULTI-LINE GLSL/WGSL body (a raw newline) is rejected.

Pure + deterministic: no clock, no network — the resolution is a syntactic
classification only. Never throws ([resolveRuntimeUrl](resolveRuntimeUrl.md) never throws).

## Parameters

### rawUrl

`string` \| `null` \| `undefined`

the candidate token (e.g. a `data-czap-shader-src` value).

## Returns

`boolean`
