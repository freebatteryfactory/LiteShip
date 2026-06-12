# @czap/detect

Device capability probes, GPU tier, DesignTier/MotionTier mapping.

## Docs

- [Naming & vocabulary](https://github.com/heyoub/LiteShip/blob/main/docs/GLOSSARY.md) — LiteShip, CZAP, `@czap/*`

- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/detect/) — generated from source TSDoc
- [Architecture index](https://github.com/heyoub/LiteShip/blob/main/docs/ARCHITECTURE.md)
- [ADRs](https://github.com/heyoub/LiteShip/tree/main/docs/adr/)

## Install

```bash
pnpm add @czap/detect
```

## Usage

You usually never call this package directly. In an Astro project the
`@czap/astro` boundary runs detection after DOMContentLoaded and publishes
the result as `window.__CZAP_DETECT__`, so satellites and the directive
runtime read it for free.

### Advanced — direct invocation

Every probe is synchronous, so `Effect.runSync` is the right executor:

```ts
import { Detect } from '@czap/detect';
import { Effect } from 'effect';

const result = Effect.runSync(Detect.detect());
result.tier;       // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
result.designTier; // 'minimal' | 'standard' | 'enhanced' | 'rich'
result.motionTier; // 'none' | 'transitions' | ...
```

`detect()` already returns `tier`, `capSet`, `designTier`, and `motionTier` in
one result — the standalone `*FromCapabilities` helpers exist only for callers
that hold a `DeviceCapabilities` without a `detect()` sweep.

## Part of [LiteShip](https://github.com/heyoub/LiteShip#readme)
