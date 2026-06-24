[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / isExternalShaderSource

# Function: isExternalShaderSource()

> **isExternalShaderSource**(`shaderSrc`): `boolean`

Defined in: [web/src/security/shader-integrity.ts:294](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L294)

Does `shaderSrc` denote an EXTERNAL (network-fetched) shader, as opposed to an
inline source string?

SECURITY-CRITICAL — this classification DELEGATES to [isFetchableRuntimeUrl](isFetchableRuntimeUrl.md),
the single source of truth the URL guard uses to decide "is this a fetchable runtime
URL?". For SINGLE-LINE values it agrees exactly with that predicate; it diverges,
deliberately, on MULTI-LINE values (see below). The rule:

  a shaderSrc is EXTERNAL (must be fetched + integrity-verified, or refused
  secure-by-default) IFF [isFetchableRuntimeUrl](isFetchableRuntimeUrl.md) reports it fetchable — which
  excludes any value carrying a raw newline (an authored multi-line body).

An INLINE shader is a genuine GLSL/WGSL BODY — multi-line PROGRAM TEXT, marked by a
raw NEWLINE. IMPORTANT: a newline does NOT make a string un-URL-parseable. The
WHATWG URL parser STRIPS ASCII tab/newline/CR from its input, so
`URL.canParse("shader\n.wgsl", base)` is `true` and normalizes to `…/shader.wgsl`.
A newline's presence therefore does NOT prove "not a URL"; it signals AUTHORED
multi-line text. The classifier makes a DELIBERATE choice to treat a multi-line
value as an inline body and never follow the newline-stripped URL the parser would
salvage. This is a divergence from [resolveRuntimeUrl](resolveRuntimeUrl.md) — which WOULD accept
`…/shader.wgsl` — not an equivalence (see the "secure-by-default" note below).

The discriminator is NEWLINE-only, with NO in-content character markers: a URL/path
CAN contain a space (`shader file.wgsl`) AND legal-but-shader-looking characters
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
NEWLINE rule depends on no in-content character an attacker can vary in a URL.

THE REAL GUARANTEE (why the multi-line case is safe even though such a value CAN be
newline-stripped into a valid URL): the safety argument is NOT "a newline can't be a
URL" — it can (the WHATWG parser strips it). It is: a real external shader URL is
authored single-line and fetchable, so a MULTI-LINE value is treated as an inline
BODY and compiled literally. If that multi-line value is not valid shader source —
e.g. the codex case `"shader\n.wgsl"` — it FAILS LOUD at `gl.shaderSource` /
`device.createShaderModule`; it is NEVER silently fetched as the salvaged
`…/shader.wgsl`. So a multi-line value cannot become an UNVERIFIED FETCH — there is
no SRI bypass, only a loud compile failure. This is the secure-by-default divergence
from [resolveRuntimeUrl](resolveRuntimeUrl.md), which WOULD have followed the stripped URL.

SECURE-BY-DEFAULT TRADE-OFF: a genuine SINGLE-LINE inline body (e.g.
`void main(){discard;}` on one line) is treated as EXTERNAL — it is fetched (which
fails loudly) rather than compiled inline. You cannot tell a one-liner body from a
URL by content without a marker the attacker controls, so secure-by-default never
compiles an unverified single-line string. Real bodies are virtually always
multi-line. For single-line inputs the classifier IS the URL-fetchability predicate,
so a new fetchable shape is followed automatically; the cross-check property guards
that equality (it excludes the deliberately-divergent multi-line case).

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
