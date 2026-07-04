# czap default example

Minimal Astro + `@czap/*` workspace example.

When installing from npm (outside the monorepo), pin `@czap/*` packages at `^0.8.0`.

This example also includes `src/fetch.ts`, wiring `czapFetchLayer()` into Astro 7's front-of-pipeline `Fetchable` surface.

```bash
pnpm install
pnpm dev
```
