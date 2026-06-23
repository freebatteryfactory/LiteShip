[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / isExternalShaderSource

# Function: isExternalShaderSource()

> **isExternalShaderSource**(`shaderSrc`): `boolean`

Defined in: [web/src/security/shader-integrity.ts:259](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L259)

Does `shaderSrc` denote an EXTERNAL (network-fetched) shader, as opposed to an
inline source string?

SECURITY-CRITICAL — this classification is a PROVABLE FUNCTION OF the canonical URL
policy, not a parallel heuristic that drifts. It DELEGATES wholesale to
[isFetchableRuntimeUrl](isFetchableRuntimeUrl.md) — the single source of truth the URL guard uses to
decide "is this a fetchable runtime URL?". The rule is therefore exact and
drift-proof:

  a shaderSrc is EXTERNAL (must be fetched + integrity-verified, or refused
  secure-by-default) IFF the URL policy would treat it as a fetchable URL.

An INLINE shader is a genuine GLSL/WGSL BODY — multi-line program text carrying
inner whitespace / newlines / shader syntax — which [isFetchableRuntimeUrl](isFetchableRuntimeUrl.md)
rejects as a URL (inner whitespace ⟹ a body, never a single URL token). EVERY
URL-shaped input the policy accepts is EXTERNAL: root-absolute (`/x.glsl`),
path-relative (`shaders/x.glsl`, `./x`, `../x`), QUERY-relative (`?shader=wave`),
BARE same-dir (`wave`), protocol-relative (`//host/x`), scheme-absolute
(`http(s)://…`), and URL-scheme tokens (`data:…` / `blob:…`).

This closes the bypass a prior extension/slash/scheme heuristic left open: a bare
`wave` and a `?shader=wave` carry no slash, extension, or scheme, so the old
classifier returned `false` — slipping a fetchable same-origin URL into the inline
branch UNVERIFIED. Because the classifier now IS the URL-fetchability predicate, if
the URL policy ever learns a new fetchable shape the classifier follows it
automatically, and the cross-check property in the suite guards the equality.

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
