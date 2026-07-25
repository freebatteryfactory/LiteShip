# liteship default example

The runnable workspace mirror of `npm create liteship`: one `liteship` facade
dependency and one complete **define → apply → inspect** loop. Nothing here is
showcase material; this is what a LiteShip page looks like before you add an
expert compiler or host surface.

When installing from npm (outside the monorepo), pin `@liteship/*` packages at `^0.21.0`.

## Run it

```bash
pnpm install
pnpm dev
```

## What to look for

- Resize the window across 768px / 1280px: `data-liteship-state` on the grid flips
  `mobile → tablet → desktop` (devtools → Elements), while the CSS emitted by
  `layout.plan()` follows the same state marker.
- `src/adaptive.ts` owns the one `defineAdaptive` declaration.
- `src/pages/index.astro` spreads `layout.attrs()`, emits `layout.plan().css`,
  and prints the result of `layout.explain(940)`.
- `liteship.config.ts` is the project configuration hub consumed by the Astro
  integration and the app-local `liteship check --profile quick` route.

Done here? Climb the [examples ladder](../README.md) — `tutorial/` teaches each
of these pieces one page at a time.
