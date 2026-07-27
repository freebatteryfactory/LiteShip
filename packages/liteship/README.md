# liteship

The curated public facade for LiteShip: one dependency and one import path over the whole `@liteship/*` adaptive rendering stack. You author with a small set of verbs from the `liteship` root and reach deeper surfaces through domain subpaths — the twenty-plus `@liteship/*` packages remain the machinery underneath, installed for you at one matched version.

The mental model is one sentence: you declare an **input's named states** and **each state's outputs**, and LiteShip keeps every output (CSS, ARIA, shaders, video) in sync from that one definition.

## Install

```bash
npm install liteship   # or: pnpm add liteship
```

Starting a new app? `npm create liteship` (also `pnpm create liteship`) scaffolds a minimal Astro starter wired to this package.

## 30 seconds

```ts
import { defineAdaptive } from 'liteship';

const layout = defineAdaptive({
  boundary: {
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'desktop'],
    ],
  },
  style: {
    base: { properties: { padding: '1rem' } },
    states: { desktop: { properties: { padding: '2rem' } } },
  },
});
```

Apply its attributes and compiled plan in host markup, then inspect the same definition when needed:

```astro
---
const plan = layout.plan();
const preview = layout.explain(940);
---

<main {...layout.attrs()}>At 940px: {preview.boundary.state}</main>
<style is:inline set:html={plan.css}></style>
```

## The surface

The root `liteship` entry is a curated, budget-enforced immutable authoring and diagnostic-inspection surface. Stateful allocation, motion, tiers, receipts, testing, and fleet metadata ride governed expert subpaths:

| Subpath             | What it re-exports                                            |
| ------------------- | ------------------------------------------------------------- |
| `liteship/schema`   | the effect-free schema kernel                                 |
| `liteship/reactive` | signals, cells, lifetimes, the scheduler                      |
| `liteship/motion`   | timelines, transitions, easing                                |
| `liteship/graph`    | the DocumentGraph IR + mutation/query channels                |
| `liteship/media`    | the compositor + responsive media                             |
| `liteship/evidence` | receipts, tiers, diagnostics, the validated-apply envelope    |
| `liteship/compiler` | the CSS / GLSL / WGSL / ARIA / AI projection targets          |
| `liteship/runtime`  | the `@liteship/web` DOM client runtime                        |
| `liteship/astro`    | LiteShip on Astro (integration, `adaptiveAttrs`, routes)      |
| `liteship/vite`     | the Vite plugin + `@token` / `@style` / `@quantize` compilers |
| `liteship/testing`  | the test-only registry reset + harness generators             |
| `liteship/migrate`  | source migration adapters with refusal diagnostics            |
| `liteship/genui`    | trusted generated-UI catalogs, validation, and rendering      |

Importing the root `.` never evaluates a host integration: `liteship/astro` and `liteship/vite` live behind their own subpaths (with `astro` / `vite` as optional peers), so a host-free or vite-only app pays no astro cost. The full rationale is [ADR-0048](../../docs/adr/0048-facade-export-budget.md).

`LITESHIP_PACKAGES` remains available from `liteship/testing` for audit and release tooling; it is not production-root ontology.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md) — how definitions compose into surfaces
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
