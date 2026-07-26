[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / PluginConfig

# Interface: PluginConfig

Defined in: [vite/src/plugin.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L72)

Configuration options for the [plugin](../functions/plugin.md) factory. Every field
is optional; omitted values use convention-based defaults.

## Properties

### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<`"boundary"` \| `"style"` \| `"token"` \| `"theme"`, `string`\>\>

Defined in: [vite/src/plugin.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L74)

Override source directories for each primitive kind.

***

### emitBoundaryAssets?

> `readonly` `optional` **emitBoundaryAssets?**: `boolean`

Defined in: [vite/src/plugin.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L96)

Emit each deduplicated boundary CSS output as an immutable build asset and
add `assetUrls` to `virtual:liteship/boundaries`. Default `false`: manifests
still carry compiled strings only.

***

### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

Defined in: [vite/src/plugin.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L90)

Named Vite environments to configure (browser / server / shader). Defaults to browser when omitted.

***

### hmr?

> `readonly` `optional` **hmr?**: `boolean`

Defined in: [vite/src/plugin.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L76)

Toggle surgical HMR emission (default `true`).

***

### quantize?

> `readonly` `optional` **quantize?**: `object`

Defined in: [vite/src/plugin.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L88)

`@quantize` viewport-containment options.

`container` is the selector the auto-emitted viewport `@container`
containment is declared on — `:root` by default. Set it to a named
selector (e.g. `'.liteship-vp'`) when `:root` can't be a container in your
layout (size containment removes `:root` from its parent's size calc,
which a fixed/absolute viewport-locked wrapper conflicts with); you then
own sizing that element to the viewport. Applies to both the CSS
transform and the emitted boundary assets.

#### container?

> `readonly` `optional` **container?**: `string`

***

### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

Defined in: [vite/src/plugin.ts:105](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L105)

WASM runtime configuration. Omitted (the default) **auto-detects**: the
deterministic 3-step search in [resolveWASM](../functions/resolveWASM.md) runs, and the compute
binary is wired up automatically when one is found (no flag needed). Pass
`false` (or `{ enabled: false }`) to force it off, `true` (or
`{ enabled: true }`) to require it (warn if no binary resolves), or
`{ path }` to point at a specific binary.
