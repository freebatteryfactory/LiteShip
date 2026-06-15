# @czap/_spine

TypeScript declaration files — no runtime code — that published `@czap/*` packages share so your compiler can resolve their types.

> You usually don't install this directly — it arrives as a dependency of [@czap/core](https://www.npmjs.com/package/@czap/core). Install `@czap/core` instead unless you want only the shared type vocabulary, with zero JavaScript.

## Install

```bash
pnpm add @czap/core effect@beta # brings @czap/_spine with it
```

## 30 seconds

```ts
import type { MotionTier, CapLevel } from '@czap/_spine';

const motion: MotionTier = 'transitions'; // 'none' | 'transitions' | 'animations' | 'physics' | 'compute'
const cap: CapLevel = 'animated';         // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
```

This compiles and nothing runs — the npm tarball contains no JavaScript, only `.d.ts` files. Type-checking without errors is the success criterion.

## Where it sits

This is the type-only layer under the foundation: `@czap/core`, `@czap/scene`, and `@czap/assets` depend on it so their published `.d.ts` files can reference one shared set of contracts instead of duplicating them. It has no runtime dependencies and ships no JavaScript. The runtime implementations of every type declared here live in the corresponding `@czap/*` package. See the
[package surfaces map](https://github.com/heyoub/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

A value import (`import { MotionTier } from '@czap/_spine'`) fails at runtime or bundle time with a missing-module error: there is no JavaScript here. Use `import type`, or import the runtime value from the package that implements it.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/GETTING-STARTED.md)
- [Architecture index](https://github.com/heyoub/LiteShip/blob/main/ARCHITECTURE.md) — how the layers reference each other
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/@czap/_spine/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
