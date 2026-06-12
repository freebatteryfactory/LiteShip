# liteship

The umbrella package for [LiteShip](https://github.com/heyoub/LiteShip) —
constraint-based adaptive rendering on the CZAP engine (Content-Zoned
Adaptive Projection, "see-zap"). The mental model is one sentence: a
continuous signal crosses boundaries into named states, and named states
project into outputs (CSS, ARIA, shaders).

```bash
npm install liteship effect@beta        # or yarn add liteship effect@beta
```

One dependency installs every publishable `@czap/*` package. Each release
ships in lockstep: `liteship` 0.1.5 pins every `@czap/*` package at exactly
0.1.5, so the fleet is always version-consistent.

`effect` is the one peer dependency, and it must be the Effect **4 beta**
(`effect@beta`) — the peer range is `>=4.0.0-beta.0`, while a bare
`npm install effect` resolves the 3.x `latest` tag and fails the peer check.

> **pnpm users:** pnpm's strict `node_modules` does not hoist transitive
> dependencies, and since `liteship` re-exports nothing, importing
> `@czap/core` through it will not resolve. Add the `@czap/*` packages you
> import as explicit dependencies (recommended):
>
> ```bash
> pnpm add @czap/core @czap/astro effect@beta
> ```
>
> or hoist the scope in `.npmrc` with `public-hoist-pattern[]=@czap/*`. The
> umbrella works as-is under npm and yarn's hoisted layouts.

You import from the individual scopes exactly as the docs show:

```ts
import { Boundary } from '@czap/core';
import { integration as czap, satelliteAttrs } from '@czap/astro';

const viewport = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ],
});
// Spread satelliteAttrs({ boundary: viewport }) onto any element;
// the integration's boot scanner activates the evaluator on the client.
```

This package deliberately re-exports nothing: the host integrations
(`@czap/astro`, `@czap/vite`, `@czap/cloudflare`) carry host-specific peer
expectations, and a barrel importing all of them would force every consumer
to satisfy all of them at once. `liteship` just makes sure the stack is
installed; pick the entry points your host needs.

If you only want one slice, install it directly — `@czap/astro` pulls the
core rendering stack transitively for the Astro path.

Docs: [GETTING-STARTED](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md) ·
[package surfaces](https://github.com/heyoub/LiteShip/blob/main/docs/PACKAGE-SURFACES.md) ·
[vocabulary](https://github.com/heyoub/LiteShip/blob/main/docs/GLOSSARY.md)
