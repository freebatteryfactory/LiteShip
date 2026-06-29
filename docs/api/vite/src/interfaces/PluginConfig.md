[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / PluginConfig

# Interface: PluginConfig

Defined in: [vite/src/plugin.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L54)

Configuration options for the [plugin](../functions/plugin.md) factory. Every field
is optional; omitted values use convention-based defaults.

## Properties

### dirs?

> `readonly` `optional` **dirs?**: `Partial`\<`Record`\<`"boundary"` \| `"style"` \| `"token"` \| `"theme"`, `string`\>\>

Defined in: [vite/src/plugin.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L56)

Override source directories for each primitive kind.

***

### emitBoundaryAssets?

> `readonly` `optional` **emitBoundaryAssets?**: `boolean`

Defined in: [vite/src/plugin.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L78)

Emit each deduplicated boundary CSS output as an immutable build asset and
add `assetUrls` to `virtual:czap/boundaries`. Default `false`: manifests
still carry compiled strings only.

***

### environments?

> `readonly` `optional` **environments?**: readonly (`"browser"` \| `"server"` \| `"shader"`)[]

Defined in: [vite/src/plugin.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L72)

Named Vite environments to configure (browser / server / shader). Defaults to browser when omitted.

***

### hmr?

> `readonly` `optional` **hmr?**: `boolean`

Defined in: [vite/src/plugin.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L58)

Toggle surgical HMR emission (default `true`).

***

### quantize?

> `readonly` `optional` **quantize?**: `object`

Defined in: [vite/src/plugin.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L70)

`@quantize` viewport-containment options.

`container` is the selector the auto-emitted viewport `@container`
containment is declared on — `:root` by default. Set it to a named
selector (e.g. `'.czap-vp'`) when `:root` can't be a container in your
layout (size containment removes `:root` from its parent's size calc,
which a fixed/absolute viewport-locked wrapper conflicts with); you then
own sizing that element to the viewport. Applies to both the CSS
transform and the emitted boundary assets.

#### container?

> `readonly` `optional` **container?**: `string`

***

### wasm?

> `readonly` `optional` **wasm?**: `boolean` \| \{ `enabled?`: `boolean`; `path?`: `string`; \}

Defined in: [vite/src/plugin.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L87)

WASM runtime configuration. Omitted (the default) **auto-detects**: the
deterministic 3-step search in [resolveWASM](../functions/resolveWASM.md) runs, and the compute
binary is wired up automatically when one is found (no flag needed). Pass
`false` (or `{ enabled: false }`) to force it off, `true` (or
`{ enabled: true }`) to require it (warn if no binary resolves), or
`{ path }` to point at a specific binary.
