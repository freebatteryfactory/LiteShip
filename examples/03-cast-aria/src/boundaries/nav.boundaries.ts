import { Boundary } from '@czap/core';

/**
 * One boundary, cast to two targets. `nav` quantizes viewport width into
 * `compact` / `wide`; the `@quantize nav { ... }` block in index.astro casts those
 * same states to BOTH CSS (layout) and `@aria` (accessibility) — defined once, so
 * they can never drift.
 */
export const nav = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});
