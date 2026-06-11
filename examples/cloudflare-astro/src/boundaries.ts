import { Boundary } from '@czap/core';

/**
 * Viewport-width boundary driving the example's adaptive layout.
 *
 * `Boundary.make` mints the content address (`viewport.id`) that keys the
 * Workers KV boundary cache -- the build-derived manifest carries it into
 * `src/middleware.ts`, so no id is ever hand-typed.
 */
export const viewport = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});
