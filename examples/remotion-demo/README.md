# liteship Remotion demo

The last rung of the ladder: the same definitions that style a page render a
video, headless. A `scale` boundary quantizes a 0–100 progress signal at
thresholds 0/33/66; each Remotion frame evaluates it, and the resulting
`CompositeState` drives CSS custom properties (scale, background, foreground)
on the composition — `useLiteshipState()` reads the current frame's state from the
`<Provider>` context.

When installing from npm (outside the monorepo), pin `@liteship/*` packages at `^0.18.0`.

## Run it

```bash
pnpm install
pnpm dev      # Remotion Studio — scrub the timeline
pnpm render   # headless render via render.ts
pnpm build    # typecheck — the CI gate for this example
```

## What to look for

- Scrub the Studio timeline: the composition crosses `small → medium → large`
  as the progress signal passes 33 and 66 — those are boundary crossings, not
  keyframes. The transform and colors move because the boundary state moved.
- `src/setup.ts` precomputes every frame's `CompositeState` once (wired through
  Remotion's `calculateMetadata` in `src/Root.tsx`), so rendering indexes an
  array instead of re-running the compositor per frame.
- It's the same `defineBoundary` the browser examples use — video is just
  another cast surface.
