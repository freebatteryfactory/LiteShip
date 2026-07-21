[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / AdaptiveProps

# Interface: AdaptiveProps

Defined in: [astro/src/Adaptive.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L25)

Server-render props for an adaptive container. Astro components
typically destructure these and pass them to [adaptiveAttrs](../functions/adaptiveAttrs.md).

## Properties

### aria?

> `readonly` `optional` **aria?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `string`\>\>\>\>

Defined in: [astro/src/Adaptive.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L49)

Authored per-state ARIA/data attributes (`@aria` blocks) for this boundary,
keyed by state then attribute. The `<Adaptive>` component supplies this
automatically via a content-address join against the build manifest; pass
it explicitly when calling `adaptiveAttrs` directly. The initial state's
attributes are SSR'd onto the element; the client updates them live.

***

### boundary?

> `readonly` `optional` **boundary?**: [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

Defined in: [astro/src/Adaptive.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L27)

Boundary whose state the adaptive tracks.

***

### class?

> `readonly` `optional` **class?**: `string`

Defined in: [astro/src/Adaptive.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L31)

Extra CSS class names to merge with `liteship-adaptive`.

***

### component?

> `readonly` `optional` **component?**: [`Component`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/Component.md)

Defined in: [astro/src/Adaptive.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L29)

Component definition used to identify the adaptive on the client.

***

### directive?

> `readonly` `optional` **directive?**: `false` \| `DirectiveName`

Defined in: [astro/src/Adaptive.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L41)

Which client directive the boot scanner should activate for this
adaptive (serialised into `data-liteship-directive`). Defaults to
`'adaptive'` when a boundary is present — a serialized boundary
with no evaluator is exactly the inert-island bug. Pass `false`
for a CSS-only shell that ships zero runtime.

***

### glsl?

> `readonly` `optional` **glsl?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `number`\>\>\>\>

Defined in: [astro/src/Adaptive.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L58)

Authored per-state GLSL uniform values (`@glsl` blocks) for this boundary,
keyed by state then `u_*` uniform name. The `<Adaptive>` component supplies
this automatically via the same content-address join as `aria`; pass it
explicitly when calling `adaptiveAttrs` directly. Rides the boundary payload
so the client resolves `glslStateUniforms[currentState]` and the GPU runtime
updates uniforms live on every crossing — the GLSL analog of `aria`.

***

### glslDeclarations?

> `readonly` `optional` **glslDeclarations?**: `string`

Defined in: [astro/src/Adaptive.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L81)

Emitted GLSL preamble (`GLSLCompileResult.declarations`: `#define STATE_*` +
`uniform <type> u_*;` lines) for this boundary's `@glsl` cast. The
`<Adaptive>` component supplies it from the build manifest's
`outputs[].glsl.declarations` via the same content-address join as
[glsl](#glsl); pass it explicitly when calling `adaptiveAttrs` directly.
Rides the boundary payload (`glslDeclarations`) so the `client:gpu` GLSL
runtime PREPENDS the compiler's own uniform vocabulary to the fragment
source before `createProgram` — the author no longer hand-types `u_*`
declarations that must happen to match the compiler's. The single source of
truth (the compiler) produces both the declarations and the per-state values.

***

### initialState?

> `readonly` `optional` **initialState?**: `string`

Defined in: [astro/src/Adaptive.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L33)

Server-side initial state (serialised into `data-liteship-state`).

***

### wgsl?

> `readonly` `optional` **wgsl?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `WgslUniformValue`\>\>\>\>

Defined in: [astro/src/Adaptive.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L68)

Authored per-state WGSL uniform binding values (`@wgsl` blocks) for this
boundary, keyed by state then bare snake_case field name (e.g.
`{ mobile: { blur_radius: 2.0 } }`). Mirrors [aria](#aria): joined onto the
adaptive from the build manifest by content address. Rides the boundary
payload (`stateWgsl`) so the `client:gpu` WGSL runtime resolves the live
uniform-buffer values for the current state on every crossing — never
SSR-frozen.

***

### wgslDeclarations?

> `readonly` `optional` **wgslDeclarations?**: `string`

Defined in: [astro/src/Adaptive.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/Adaptive.ts#L90)

Emitted WGSL preamble (`WGSLCompileResult.declarations`: state consts + the
uniform struct + `@group(0) @binding(0)`) for this boundary's `@wgsl` cast.
Supplied by `<Adaptive>` from the manifest's `outputs[].wgsl.declarations`,
the WGSL analog of [glslDeclarations](#glsldeclarations). Rides the payload
(`wgslDeclarations`) so the WGSL `client:gpu` runtime prepends the compiler's
own struct to the shader module before `createShaderModule`.
