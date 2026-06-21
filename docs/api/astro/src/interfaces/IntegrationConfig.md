[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / IntegrationConfig

# Interface: IntegrationConfig

Defined in: [astro/src/integration.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L43)

Options passed to [integration](../functions/integration.md) from `astro.config.mjs`. Every
field is optional; omitted features fall back to conservative
defaults (detect enabled, stream/llm/gpu enabled, workers/wasm
opt-in).

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/integration.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L61)

Enable the inline detect script (default `true`).

***

### exclude?

> `readonly` `optional` **exclude?**: readonly `string`[]

Defined in: [astro/src/integration.ts:59](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L59)

Route globs on which czap's costly runtime scripts (detect, the GPU probe,
wasm, the dev inspector) should NOT run. For embedding czap alongside another
Astro sub-app (e.g. a Starlight `/docs/**` section) that never consumes czap,
so those pages don't pay for a pointless GPU probe or attr writes. Astro's
`injectScript` is global (no build-time route filter), so this is a runtime
guard: a tiny inline script matches `location.pathname` and short-circuits
the rest (re-evaluating on View-Transition swaps). The directive bootstrap
stays wired — it's a no-op without czap markers, and keeps View Transitions
working across the boundary. Supports exact paths and a trailing `**` (e.g.
`'/docs/**'` matches `/docs` and everything under it). Default `[]` (czap
runs everywhere).

***

### gpu?

> `readonly` `optional` **gpu?**: `object`

Defined in: [astro/src/integration.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L73)

GPU runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### preferWebGPU?

> `readonly` `optional` **preferWebGPU?**: `boolean`

***

### inspector?

> `readonly` `optional` **inspector?**: `boolean`

Defined in: [astro/src/integration.ts:90](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L90)

Dev-only boundary inspector (default enabled in `astro dev`). Registered
as an Astro dev-toolbar app — toggle it from the toolbar icon. Pass
`false` to skip registering the toolbar app.

***

### llm?

> `readonly` `optional` **llm?**: `object`

Defined in: [astro/src/integration.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L84)

LLM streaming runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### middleware?

> `readonly` `optional` **middleware?**: `boolean`

Defined in: [astro/src/integration.ts:100](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L100)

Opt in (`true`) to auto-register a zero-config capability-detection
middleware, so a consumer needs no `src/middleware.ts` for the common case;
it populates `Astro.locals.czap` from Client Hints. The edge boundary cache
(whose `theme`/`compile` carry functions) always needs a consumer
`src/middleware.ts` calling `czapMiddleware({ edge })`; when both are present
this auto entry runs first (`order: 'pre'`) and the consumer middleware
refines the same locals. Default off (wire middleware yourself).

***

### security?

> `readonly` `optional` **security?**: `object`

Defined in: [astro/src/integration.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L102)

Security policies applied to runtime fetch/HTML boundaries.

#### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: `RuntimeEndpointPolicy`

#### htmlPolicy?

> `readonly` `optional` **htmlPolicy?**: `RuntimeHtmlPolicy`

***

### ~~serverIslands?~~

> `readonly` `optional` **serverIslands?**: `boolean`

Defined in: [astro/src/integration.ts:69](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L69)

#### Deprecated

No-op. Server Islands is stable in Astro (since v5); there is
no experimental flag to toggle on Astro 6. Using `server:defer` with a
configured adapter is all that's needed — czap does nothing here. This
option is retained only so existing configs keep type-checking; it will
be removed in a future major.

***

### stream?

> `readonly` `optional` **stream?**: `object`

Defined in: [astro/src/integration.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L82)

SSE streaming runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### vite?

> `readonly` `optional` **vite?**: `PluginConfig`

Defined in: [astro/src/integration.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L45)

Overrides passed through to `@czap/vite`'s plugin.

***

### wasm?

> `readonly` `optional` **wasm?**: `object`

Defined in: [astro/src/integration.ts:71](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L71)

WASM runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### path?

> `readonly` `optional` **path?**: `string`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [astro/src/integration.ts:80](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L80)

Off-thread worker runtime configuration. `coep` selects the
Cross-Origin-Embedder-Policy value emitted with COOP (default
`'require-corp'`); `'credentialless'` keeps cross-origin isolation
while tolerating CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
