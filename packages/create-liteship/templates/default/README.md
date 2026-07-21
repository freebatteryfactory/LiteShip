# liteship-app

A minimal adaptive Astro app scaffolded by `create-liteship`. One dependency
(`liteship`) and one import path.

## The mental model: define → apply → inspect

You author in terms of **inputs → states → outputs** — never the engine's plumbing:

- **Define an input's states.** `defineBoundary` maps a continuous input (viewport
  width) to a few named states — `mobile` / `tablet` / `desktop`
  (`src/boundaries/layout.boundaries.ts`).
- **Define each state's outputs.** `defineStyle` maps those states to CSS outputs —
  the card's padding per state (`src/styles/card.styles.ts`). Design values live in
  `defineToken` (`src/tokens/base.tokens.ts`).
- **Apply.** `adaptiveAttrs({ boundary })` wires a boundary onto a DOM element
  (`src/pages/index.astro`); the element carries `data-liteship-state`, updated on the
  client as the input crosses a threshold. The `@token` / `@style` / `@quantize`
  blocks compile your definitions to CSS at build time.
- **Inspect.** `liteship check --profile quick` verifies the project.

Everything comes from `liteship`: the authoring verbs from the root
(`import { defineBoundary, defineStyle, defineToken } from 'liteship'`) and the Astro
helper from a subpath (`import { adaptiveAttrs } from 'liteship/astro'`).

## Run

```sh
pnpm install
pnpm dev
```

Then verify the project at any time:

```sh
liteship check --profile quick
```

Open the page and drag the window edge — the layout's state flips
`mobile` → `tablet` → `desktop`, and the grid and cards restyle from the same boundary.
