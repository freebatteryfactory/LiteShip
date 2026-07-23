[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / IntegrationConfig

# Interface: IntegrationConfig

Defined in: [astro/src/integration.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L45)

Options passed to [integration](../functions/integration.md) from `astro.config.mjs`. Every
field is optional; omitted features fall back to conservative
defaults (detect enabled, stream/llm/gpu enabled, workers/wasm
opt-in).

## Properties

### adaptive?

> `readonly` `optional` **adaptive?**: `boolean`

Defined in: [astro/src/integration.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L49)

Enable the adaptive client directive (default true). Root project config supplies the same field.

***

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/integration.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L65)

Enable the inline detect script (default `true`).

***

### exclude?

> `readonly` `optional` **exclude?**: readonly `string`[]

Defined in: [astro/src/integration.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L63)

Route globs on which liteship's costly runtime scripts (detect, the GPU probe,
wasm, the dev inspector) should NOT run. For embedding liteship alongside another
Astro sub-app (e.g. a Starlight `/docs/**` section) that never consumes liteship,
so those pages don't pay for a pointless GPU probe or attr writes. Astro's
`injectScript` is global (no build-time route filter), so this is a runtime
guard: a tiny inline script matches `location.pathname` and short-circuits
the rest (re-evaluating on View-Transition swaps). The directive bootstrap
stays wired — it's a no-op without liteship markers, and keeps View Transitions
working across the boundary. Supports exact paths and a trailing `**` (e.g.
`'/docs/**'` matches `/docs` and everything under it). Default `[]` (liteship
runs everywhere).

***

### gpu?

> `readonly` `optional` **gpu?**: `object`

Defined in: [astro/src/integration.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L77)

GPU runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### preferWebGPU?

> `readonly` `optional` **preferWebGPU?**: `boolean`

***

### inspector?

> `readonly` `optional` **inspector?**: `boolean`

Defined in: [astro/src/integration.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L101)

Dev-only boundary inspector (default enabled in `astro dev`). Registered
as an Astro dev-toolbar app — toggle it from the toolbar icon. Pass
`false` to skip registering the toolbar app.

***

### llm?

> `readonly` `optional` **llm?**: `object`

Defined in: [astro/src/integration.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L88)

LLM streaming runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### middleware?

> `readonly` `optional` **middleware?**: `boolean`

Defined in: [astro/src/integration.ts:111](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L111)

Opt in (`true`) to auto-register a zero-config capability-detection
middleware, so a consumer needs no `src/middleware.ts` for the common case;
it populates `Astro.locals.liteship` from Client Hints. The edge boundary cache
(whose `theme`/`compile` carry functions) always needs a consumer
`src/middleware.ts` calling `liteshipMiddleware({ edge })`; when both are present
this auto entry runs first (`order: 'pre'`) and the consumer middleware
refines the same locals. Default off (wire middleware yourself).

***

### motion?

> `readonly` `optional` **motion?**: `object`

Defined in: [astro/src/integration.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L95)

Continuous-motion runtime (`client:motion`). Opt-in (default off): registers
the JS motion FLOOR that scrubs `data-liteship-motion-program` when native
`animation-timeline` is unavailable. The native CSS path (`MotionCompiler`)
needs no runtime and is unaffected.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### security?

> `readonly` `optional` **security?**: `object`

Defined in: [astro/src/integration.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L113)

Security policies applied to runtime fetch/HTML boundaries.

#### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: `RuntimeEndpointPolicy`

#### htmlPolicy?

> `readonly` `optional` **htmlPolicy?**: `RuntimeHtmlPolicy`

***

### ~~serverIslands?~~

> `readonly` `optional` **serverIslands?**: `boolean`

Defined in: [astro/src/integration.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L73)

#### Deprecated

No-op. Server Islands is stable in Astro (since v5); there is
no experimental flag to toggle on Astro 7. Using `server:defer` with a
configured adapter is all that's needed — liteship does nothing here. This
option is retained only so existing configs keep type-checking; it will
be removed in a future major.

***

### stream?

> `readonly` `optional` **stream?**: `object`

Defined in: [astro/src/integration.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L86)

SSE streaming runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### vite?

> `readonly` `optional` **vite?**: `PluginConfig`

Defined in: [astro/src/integration.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L47)

Overrides passed through to `@liteship/vite`'s plugin.

***

### wasm?

> `readonly` `optional` **wasm?**: `object`

Defined in: [astro/src/integration.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L75)

WASM runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### path?

> `readonly` `optional` **path?**: `string`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [astro/src/integration.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/integration.ts#L84)

Off-thread worker runtime configuration. `coep` selects the
Cross-Origin-Embedder-Policy value emitted with COOP (default
`'require-corp'`); `'credentialless'` keeps cross-origin isolation
while tolerating CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: `"require-corp"` \| `"credentialless"`

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
