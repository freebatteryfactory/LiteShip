[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / isExternalShaderSource

# Function: isExternalShaderSource()

> **isExternalShaderSource**(`shaderSrc`): `boolean`

Defined in: [web/src/security/shader-integrity.ts:267](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L267)

Does `shaderSrc` denote an EXTERNAL (network-fetched) shader, as opposed to an
inline source string?

SECURITY-CRITICAL — this classification is a PROVABLE FUNCTION OF the canonical URL
policy, not a parallel heuristic that drifts. It DELEGATES wholesale to
[isFetchableRuntimeUrl](isFetchableRuntimeUrl.md) — the single source of truth the URL guard uses to
decide "is this a fetchable runtime URL?". The rule is therefore exact and
drift-proof:

  a shaderSrc is EXTERNAL (must be fetched + integrity-verified, or refused
  secure-by-default) IFF the URL policy would treat it as a fetchable URL.

An INLINE shader is a genuine GLSL/WGSL BODY — program text identified by its
CONTENT (a newline, or a shader-syntax marker: `#version`, `void main`, `gl_`,
`precision`, `{`/`}`/`;`, or a WGSL `@group`/`@binding`/`fn `) — which
[isFetchableRuntimeUrl](isFetchableRuntimeUrl.md) rejects as a URL. The discriminator is CONTENT, not
raw whitespace: a URL/path CAN contain a space (`shader file.wgsl`), so inner
whitespace was the WRONG distinguisher. EVERY URL-shaped input the policy accepts
is EXTERNAL: root-absolute (`/x.glsl`), path-relative (`shaders/x.glsl`, `./x`,
`../x`), path-WITH-A-SPACE (`shader file.wgsl`, `./shader file.wgsl`),
QUERY-relative (`?shader=wave`), BARE same-dir (`wave`), protocol-relative
(`//host/x`), scheme-absolute (`http(s)://…`), and URL-scheme tokens
(`data:…` / `blob:…`).

This closes two bypasses. (1) A prior extension/slash/scheme heuristic left bare
`wave` and `?shader=wave` in the inline branch (no slash/extension/scheme). (2) A
raw inner-whitespace pre-check then let a single-line PATH-WITH-A-SPACE
(`shader file.wgsl`) — which `resolveRuntimeUrl` resolves as a fetchable
same-origin URL — slip into the inline branch UNVERIFIED. The content/policy-based
discriminator routes any value the policy treats as a fetchable URL to the external
(fetch+verify-or-refuse) path. Secure-by-default: an ambiguous single-line token
(no shader content) prefers EXTERNAL — fetch+verify beats compiling an unverified
path-string. Because the classifier IS the URL-fetchability predicate, a new
fetchable shape is followed automatically; the cross-check property guards equality.

A `data:` / `blob:` token is URL-SHAPED (the policy reasons about it as a URL —
`data:` resolves cross-origin and is origin-refused; `blob:` resolves same-origin
and is fetchable), so it classifies EXTERNAL: it is never a genuine inline body the
author typed, and secure-by-default it must take the external (fetch+verify-or-
refuse) path rather than be compiled as literal shader text.

## Parameters

### shaderSrc

`string`

## Returns

`boolean`
