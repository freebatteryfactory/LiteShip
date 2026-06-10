# liteship

The umbrella package for [LiteShip](https://github.com/heyoub/LiteShip) —
constraint-based adaptive rendering on the CZAP engine.

```bash
npm install liteship        # or: pnpm add liteship
```

One dependency installs every publishable `@czap/*` package. You still import
from the individual scopes exactly as the docs show:

```ts
import { Boundary } from '@czap/core';
import { Q } from '@czap/quantizer';
import { integration as czap } from '@czap/astro';
```

This package deliberately re-exports nothing: the host integrations
(`@czap/astro`, `@czap/vite`, `@czap/cloudflare`) carry host-specific peer
expectations, and a barrel importing all of them would force every consumer
to satisfy all of them at once. `liteship` just makes sure the stack is
installed; pick the entry points your host needs.

If you only want one slice, install it directly — `@czap/astro` pulls the
core rendering stack transitively for the Astro path.

> **pnpm users:** pnpm's strict `node_modules` does not hoist transitive
> dependencies, and since `liteship` re-exports nothing, importing
> `@czap/core` through it will not resolve. Either add the `@czap/*` packages
> you import as explicit dependencies (recommended), or hoist the scope in
> `.npmrc` with `public-hoist-pattern[]=@czap/*`. The umbrella works as-is
> under npm and yarn's hoisted layouts.

Docs: [GETTING-STARTED](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md) ·
[package surfaces](https://github.com/heyoub/LiteShip/blob/main/docs/PACKAGE-SURFACES.md)
