# @liteship/_spine

TypeScript declaration files — no runtime code — that published `@liteship/*` packages share so your compiler can resolve their types.

> You usually don't install this directly — it arrives as a dependency of [@liteship/core](https://www.npmjs.com/package/@liteship/core). Install `@liteship/core` instead unless you want only the shared type vocabulary, with zero JavaScript.

## Install

```bash
pnpm add @liteship/core # brings @liteship/_spine with it
```

## 30 seconds

```ts
import type { MotionTier, CapTier } from '@liteship/_spine';

const motion: MotionTier = 'transitions'; // 'none' | 'transitions' | 'animations' | 'physics' | 'compute'
const cap: CapTier = 'animated';          // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
```

This compiles and no runtime module is loaded. The npm tarball contains the declaration spine plus a small throwing JavaScript stub whose only job is to explain accidental value imports. Type-checking without errors is the success criterion.

## Where it sits

This is the type-only layer under the foundation: `@liteship/core`, `@liteship/scene`, and `@liteship/assets` depend on it so their published `.d.ts` files can reference one shared set of contracts instead of duplicating them. It has no runtime dependencies and no usable JavaScript API. Runtime implementations of mirrored declarations live in the corresponding `@liteship/*` package. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout. Its shipped stub exists only to fail accidental value imports with a teaching error.

## If it does nothing

A value import (`import { MotionTier } from '@liteship/_spine'`) reaches the package's teaching stub and fails immediately with an error explaining that the package is type-only. Use `import type`, or import the runtime value from the package that implements it.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Architecture index](https://github.com/freebatteryfactory/LiteShip/blob/main/ARCHITECTURE.md) — how the layers reference each other
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/@liteship/_spine/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
