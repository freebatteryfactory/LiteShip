# liteship-app

A minimal adaptive Astro app scaffolded by `create-liteship`. One dependency
(`liteship`) and one import path.

## The mental model: define → apply → inspect

You author in terms of **inputs → states → outputs** — never the engine's plumbing:

- **Define.** `defineAdaptive` in `src/adaptive.ts` maps viewport width to named
  states and gives each state its CSS output.
- **Apply.** `layout.attrs()` wires that definition onto the page; `layout.plan()`
  provides the byte-stable compiled CSS.
- **Inspect.** `layout.explain(value)` reports exactly why a state won, and
  the project-owned `check` script verifies the app.

The first adaptive feature is one 14-line definition imported from `liteship`.
Advanced packages and projection targets remain available through explicit subpaths.

## Run

```sh
pnpm install
pnpm dev
```

Then verify the project at any time:

```sh
pnpm check
# or: npm run check
```

Open the page and drag the window edge — the layout's state flips
`mobile` → `tablet` → `desktop`, and the grid and cards restyle from the same boundary.
