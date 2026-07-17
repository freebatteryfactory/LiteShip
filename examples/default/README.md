# czap default example

The floor: one boundary, eight tokens, a `@quantize` block, and the Astro fetch
layer — the same shape `npm create liteship` scaffolds, kept runnable inside the
monorepo. Nothing here is showcase material; this is what a LiteShip page looks
like before you've done anything interesting.

When installing from npm (outside the monorepo), pin `@czap/*` packages at `^0.12.0`.

## Run it

```bash
pnpm install
pnpm dev
```

## What to look for

- Resize the window across 768px / 1280px: `data-czap-state` on the grid flips
  `mobile → tablet → desktop` (devtools → Elements), and the
  `@quantize layout { … }` block in `src/pages/index.astro` re-lays it out as
  static container queries — no media queries, and the CSS path needs no client JS.
- `src/tokens/base.tokens.ts` + the `@token` blocks in `src/layouts/Base.astro`
  compile to `--czap-*` custom properties; change a token value and the page
  re-themes on save.
- `src/fetch.ts` wires `czapFetchLayer()` into Astro 7's front-of-pipeline
  `Fetchable` surface — the server-side seam the edge cache rides on.

Done here? Climb the [examples ladder](../README.md) — `tutorial/` teaches each
of these pieces one page at a time.
