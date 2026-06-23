[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / isExternalShaderSource

# Function: isExternalShaderSource()

> **isExternalShaderSource**(`shaderSrc`): `boolean`

Defined in: [web/src/security/shader-integrity.ts:274](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L274)

Does `shaderSrc` denote an EXTERNAL (network-fetched) shader, as opposed to an
inline source string?

SECURITY-CRITICAL — this classification is a PROVABLE FUNCTION OF the canonical URL
policy, not a parallel heuristic that drifts. It DELEGATES wholesale to
[isFetchableRuntimeUrl](isFetchableRuntimeUrl.md) — the single source of truth the URL guard uses to
decide "is this a fetchable runtime URL?". The rule is therefore exact and
drift-proof:

  a shaderSrc is EXTERNAL (must be fetched + integrity-verified, or refused
  secure-by-default) IFF the URL policy would treat it as a fetchable URL.

An INLINE shader is a genuine GLSL/WGSL BODY — program text identified by the ONE
property a URL can NEVER have: a raw NEWLINE (multi-line text). The discriminator
is NEWLINE-only, with NO in-content character markers: a URL/path CAN contain a
space (`shader file.wgsl`) AND legal-but-shader-looking characters
(`shader{1}.wgsl`, `./shader;v=1.wgsl`, `shader?x={y}`, `shaders/fn file.wgsl`), so
neither inner whitespace NOR any `{`/`}`/`;`/`fn `-style marker is a sound
distinguisher — each collides with a real URL. EVERY single-line URL-shaped input
the policy accepts is EXTERNAL: root-absolute (`/x.glsl`), path-relative
(`shaders/x.glsl`, `./x`, `../x`), path-WITH-A-SPACE (`shader file.wgsl`,
`./shader file.wgsl`), path-WITH-SHADER-PUNCTUATION (`shader{1}.wgsl`,
`./shader;v=1.wgsl`, `shader?x={y}`, `shaders/fn file.wgsl`), QUERY-relative
(`?shader=wave`), BARE same-dir (`wave`), protocol-relative (`//host/x`),
scheme-absolute (`http(s)://…`), and URL-scheme tokens (`data:…` / `blob:…`).

This closes the whole CHARACTER-collision class. Prior heuristics each lost the
same way — a URL and shader source SHARE characters: (1) an extension/slash/scheme
test left bare `wave` and `?shader=wave` inline; (2) an inner-whitespace pre-check
let a PATH-WITH-A-SPACE (`shader file.wgsl`) slip inline; (3) a shader-syntax marker
(`{`/`;`/`fn `/`#version`) let `shader{1}.wgsl`, `./shader;v=1.wgsl`, `shader?x={y}`,
`shaders/fn file.wgsl` — all legal same-origin URLs — slip inline UNVERIFIED. The
NEWLINE rule depends on nothing an attacker can put in a URL, so the class is shut.

HONEST TRADE-OFF: a genuine SINGLE-LINE inline body (e.g. `void main(){discard;}` on
one line) is now treated as EXTERNAL — it is fetched (which fails loudly) rather than
compiled inline. That is the SECURE choice: you cannot tell a one-liner body from a
URL by content without a marker the attacker controls, so secure-by-default never
compiles an unverified single-line string. Real bodies are virtually always
multi-line. Because the classifier IS the URL-fetchability predicate, a new fetchable
shape is followed automatically; the cross-check property guards equality.

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
