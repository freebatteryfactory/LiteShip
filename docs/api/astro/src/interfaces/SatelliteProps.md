[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / SatelliteProps

# Interface: SatelliteProps

Defined in: [astro/src/Satellite.ts:23](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L23)

Server-render props for a satellite container. Astro components
typically destructure these and pass them to [satelliteAttrs](../functions/satelliteAttrs.md).

## Properties

### aria?

> `readonly` `optional` **aria?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `string`\>\>\>\>

Defined in: [astro/src/Satellite.ts:47](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L47)

Authored per-state ARIA/data attributes (`@aria` blocks) for this boundary,
keyed by state then attribute. The `<Satellite>` component supplies this
automatically via a content-address join against the build manifest; pass
it explicitly when calling `satelliteAttrs` directly. The initial state's
attributes are SSR'd onto the element; the client updates them live.

***

### boundary?

> `readonly` `optional` **boundary?**: [`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>

Defined in: [astro/src/Satellite.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L25)

Boundary whose state the satellite tracks.

***

### class?

> `readonly` `optional` **class?**: `string`

Defined in: [astro/src/Satellite.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L29)

Extra CSS class names to merge with `czap-satellite`.

***

### component?

> `readonly` `optional` **component?**: [`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Component/type-aliases/Shape.md)\<[`Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)\<`string`, readonly \[`string`, `string`\]\>, readonly `string`[]\>

Defined in: [astro/src/Satellite.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L27)

Component definition used to identify the satellite on the client.

***

### directive?

> `readonly` `optional` **directive?**: `false` \| `DirectiveName`

Defined in: [astro/src/Satellite.ts:39](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L39)

Which client directive the boot scanner should activate for this
satellite (serialised into `data-czap-directive`). Defaults to
`'satellite'` when a boundary is present — a serialized boundary
with no evaluator is exactly the inert-island bug. Pass `false`
for a CSS-only shell that ships zero runtime.

***

### glsl?

> `readonly` `optional` **glsl?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `number`\>\>\>\>

Defined in: [astro/src/Satellite.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L56)

Authored per-state GLSL uniform values (`@glsl` blocks) for this boundary,
keyed by state then `u_*` uniform name. The `<Satellite>` component supplies
this automatically via the same content-address join as `aria`; pass it
explicitly when calling `satelliteAttrs` directly. Rides the boundary payload
so the client resolves `glslStateUniforms[currentState]` and the GPU runtime
updates uniforms live on every crossing — the GLSL analog of `aria`.

***

### glslDeclarations?

> `readonly` `optional` **glslDeclarations?**: `string`

Defined in: [astro/src/Satellite.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L79)

Emitted GLSL preamble (`GLSLCompileResult.declarations`: `#define STATE_*` +
`uniform <type> u_*;` lines) for this boundary's `@glsl` cast. The
`<Satellite>` component supplies it from the build manifest's
`outputs[].glsl.declarations` via the same content-address join as
[glsl](#glsl); pass it explicitly when calling `satelliteAttrs` directly.
Rides the boundary payload (`glslDeclarations`) so the `client:gpu` GLSL
runtime PREPENDS the compiler's own uniform vocabulary to the fragment
source before `createProgram` — the author no longer hand-types `u_*`
declarations that must happen to match the compiler's. The single source of
truth (the compiler) produces both the declarations and the per-state values.

***

### initialState?

> `readonly` `optional` **initialState?**: `string`

Defined in: [astro/src/Satellite.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L31)

Server-side initial state (serialised into `data-czap-state`).

***

### wgsl?

> `readonly` `optional` **wgsl?**: `Readonly`\<`Record`\<`string`, `Readonly`\<`Record`\<`string`, `number`\>\>\>\>

Defined in: [astro/src/Satellite.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L66)

Authored per-state WGSL uniform binding values (`@wgsl` blocks) for this
boundary, keyed by state then bare snake_case field name (e.g.
`{ mobile: { blur_radius: 2.0 } }`). Mirrors [aria](#aria): joined onto the
satellite from the build manifest by content address. Rides the boundary
payload (`stateWgsl`) so the `client:gpu` WGSL runtime resolves the live
uniform-buffer values for the current state on every crossing — never
SSR-frozen.

***

### wgslDeclarations?

> `readonly` `optional` **wgslDeclarations?**: `string`

Defined in: [astro/src/Satellite.ts:88](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/Satellite.ts#L88)

Emitted WGSL preamble (`WGSLCompileResult.declarations`: state consts + the
uniform struct + `@group(0) @binding(0)`) for this boundary's `@wgsl` cast.
Supplied by `<Satellite>` from the manifest's `outputs[].wgsl.declarations`,
the WGSL analog of [glslDeclarations](#glsldeclarations). Rides the payload
(`wgslDeclarations`) so the WGSL `client:gpu` runtime prepends the compiler's
own struct to the shader module before `createShaderModule`.
