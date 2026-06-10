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

Docs: [GETTING-STARTED](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md) ·
[package surfaces](https://github.com/heyoub/LiteShip/blob/main/docs/PACKAGE-SURFACES.md)
