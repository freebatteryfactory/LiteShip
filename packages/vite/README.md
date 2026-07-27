# @liteship/vite

Vite plugin that compiles `@token`, `@theme`, `@style`, and `@quantize` blocks in your CSS into native CSS, and hot-updates them without a full page reload.

> Install this directly when your app builds with plain Vite. If you build with Astro, install [`@liteship/astro`](https://www.npmjs.com/package/@liteship/astro) instead — it brings this plugin already wired.

## Install

```bash
pnpm add -D @liteship/vite
```

Requires `vite >= 8` as a peer dependency.

## 30 seconds

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { plugin as liteship } from '@liteship/vite';

export default defineConfig({
  plugins: [liteship()],
});
```

```css
/* hero.css — heroLayout is a defineBoundary() export the plugin finds by convention */
@quantize heroLayout {
  stacked { gap: 1rem; }
  cinematic { gap: 3rem; }
}
```

On dev serve or build, the `@quantize` block is rewritten to native `@container` queries — one per state — and `@token` / `@theme` / `@style` blocks become custom properties, `html[data-theme]` selectors, and scoped rules. Definitions are found by convention, no listing required: `boundaries.ts` / `*.boundaries.ts` (likewise `tokens.ts`, `themes.ts`, `styles.ts`) next to the referencing CSS file, then at the project root. Override per kind with `liteship({ dirs: { boundary: 'src/defs' } })`.

## Where it sits

A build-time adapter — it hooks Vite's transform and HMR phases so stylesheets can reference definitions authored in TypeScript. It reads the primitive types (a boundary is named states over a numeric input; tokens, themes, and styles are named outputs) from `@liteship/core`, compiles them to CSS through `@liteship/compiler`, and can emit a boundary manifest in the `@liteship/edge` shape for request-time adaptation. The definitions themselves are authored with `@liteship/core` factories — this package only finds and compiles them. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

Browsers discard unknown at-rules, so a `@quantize` block whose name matches no `defineBoundary()` export ships zero CSS — silently in the browser. The plugin prints a terminal warning naming every file it searched; the fix is `export const <name> = defineBoundary({ ... })` in one of those files, or a `dirs` override pointing at your definitions.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — the "Authoring surfaces in CSS" section covers all four at-rules
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/vite/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
