[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / IntegrationConfig

# Interface: IntegrationConfig

Defined in: [astro/src/integration.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L42)

Options passed to [integration](../functions/integration.md) from `astro.config.mjs`. Every
field is optional; omitted features fall back to conservative
defaults (detect enabled, stream/llm/gpu enabled, workers/wasm/server
islands opt-in).

## Properties

### detect?

> `readonly` `optional` **detect?**: `boolean`

Defined in: [astro/src/integration.ts:60](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L60)

Enable the inline detect script (default `true`).

***

### exclude?

> `readonly` `optional` **exclude?**: readonly `string`[]

Defined in: [astro/src/integration.ts:58](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L58)

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

Defined in: [astro/src/integration.ts:66](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L66)

GPU runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### preferWebGPU?

> `readonly` `optional` **preferWebGPU?**: `boolean`

***

### inspector?

> `readonly` `optional` **inspector?**: `boolean`

Defined in: [astro/src/integration.ts:82](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L82)

Dev-only boundary inspector overlay (default enabled in `astro dev`).
Pass `false` to opt out of the Alt+Shift+C overlay.

***

### llm?

> `readonly` `optional` **llm?**: `object`

Defined in: [astro/src/integration.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L77)

LLM streaming runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### security?

> `readonly` `optional` **security?**: `object`

Defined in: [astro/src/integration.ts:84](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L84)

Security policies applied to runtime fetch/HTML boundaries.

#### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: `RuntimeEndpointPolicy`

#### htmlPolicy?

> `readonly` `optional` **htmlPolicy?**: `RuntimeHtmlPolicy`

***

### serverIslands?

> `readonly` `optional` **serverIslands?**: `boolean`

Defined in: [astro/src/integration.ts:62](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L62)

Turn on Astro's experimental server-islands flag (default `false`).

***

### stream?

> `readonly` `optional` **stream?**: `object`

Defined in: [astro/src/integration.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L75)

SSE streaming runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

***

### vite?

> `readonly` `optional` **vite?**: `PluginConfig`

Defined in: [astro/src/integration.ts:44](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L44)

Overrides passed through to `@czap/vite`'s plugin.

***

### wasm?

> `readonly` `optional` **wasm?**: `object`

Defined in: [astro/src/integration.ts:64](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L64)

WASM runtime configuration.

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`

#### path?

> `readonly` `optional` **path?**: `string`

***

### workers?

> `readonly` `optional` **workers?**: `object`

Defined in: [astro/src/integration.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/astro/src/integration.ts#L73)

Off-thread worker runtime configuration. `coep` selects the
Cross-Origin-Embedder-Policy value emitted with COOP (default
`'require-corp'`); `'credentialless'` keeps cross-origin isolation
while tolerating CORP-less third-party assets.

#### coep?

> `readonly` `optional` **coep?**: [`CrossOriginEmbedderPolicy`](../type-aliases/CrossOriginEmbedderPolicy.md)

#### enabled?

> `readonly` `optional` **enabled?**: `boolean`
