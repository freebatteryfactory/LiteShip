# @liteship/_spine

TypeScript declaration files — no runtime code — that published `@liteship/*` packages share so your compiler can resolve their types.

> You usually don't install this directly — it arrives as a dependency of [@liteship/core](https://www.npmjs.com/package/@liteship/core). Install `@liteship/core` instead unless you want only the shared type vocabulary, with zero JavaScript.

## Install

```bash
pnpm add @liteship/core # brings @liteship/_spine with it
```

## 30 seconds

```ts
import type { MotionTier, CapLevel } from '@liteship/_spine';

const motion: MotionTier = 'transitions'; // 'none' | 'transitions' | 'animations' | 'physics' | 'compute'
const cap: CapLevel = 'animated';         // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
```

This compiles and nothing runs — the npm tarball contains no JavaScript, only `.d.ts` files. Type-checking without errors is the success criterion.

## Where it sits

This is the type-only layer under the foundation: `@liteship/core`, `@liteship/scene`, and `@liteship/assets` depend on it so their published `.d.ts` files can reference one shared set of contracts instead of duplicating them. It has no runtime dependencies and ships no JavaScript. The runtime implementations of every type declared here live in the corresponding `@liteship/*` package. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

A value import (`import { MotionTier } from '@liteship/_spine'`) fails at runtime or bundle time with a missing-module error: there is no JavaScript here. Use `import type`, or import the runtime value from the package that implements it.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Architecture index](https://github.com/freebatteryfactory/LiteShip/blob/main/ARCHITECTURE.md) — how the layers reference each other
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/@liteship/_spine/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
