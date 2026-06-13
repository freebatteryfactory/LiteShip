# liteship

One dependency that installs every publishable `@czap/*` package at the same version — the front door to LiteShip. The mental model is one sentence: a continuous signal crosses boundaries into named states, and named states project into outputs (CSS, ARIA, shaders).

> Install this directly when you're starting a project and want the whole stack version-locked. If you only need one slice, install that slice instead — `@czap/astro` alone pulls the core rendering stack for the Astro path.

## Install

```bash
npm install liteship   # or yarn add liteship
```

**pnpm users:** pnpm's strict `node_modules` does not hoist transitive dependencies, and `liteship` re-exports nothing, so `import '@czap/core'` will not resolve through it. Add the `@czap/*` packages you import as explicit dependencies (`pnpm add @czap/core @czap/astro`), or hoist the scope with `public-hoist-pattern[]=@czap/*` in `.npmrc`. npm and yarn's hoisted layouts work as-is.

## 30 seconds

```ts
import { Boundary } from '@czap/core'; // installed for you by liteship

const viewport = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ],
});

console.log(Boundary.evaluate(viewport, 800)); // 'tablet'
```

Logs `tablet` — the named state for a 768–1279px viewport width. That signal-to-state step is the foundation; everything else (compiled CSS, host integrations, motion) projects from it.

## Where it sits

The umbrella sits above everything: it depends on all twenty publishable `@czap/*` packages, pinned at exactly its own version, and deliberately re-exports none of them — the host integrations (`@czap/astro`, `@czap/vite`, `@czap/cloudflare`) carry host-specific peer expectations, and a barrel importing all of them would force every consumer to satisfy all of them at once. You import from the individual scopes exactly as the docs show; this package just makes sure they're installed. Its only export is `LITESHIP_PACKAGES`, the list of what it installs. See the [package surfaces map](https://github.com/heyoub/LiteShip/blob/main/docs/PACKAGE-SURFACES.md) for the full layout.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md)
- [Authoring model](https://github.com/heyoub/LiteShip/blob/main/docs/AUTHORING-MODEL.md) — how definitions compose into surfaces
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/docs/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
