import { defineBoundary } from '@liteship/core';

/**
 * Viewport-width boundary driving the example's adaptive layout.
 *
 * `defineBoundary` mints the content address (`viewport.id`) that keys the
 * Workers KV boundary cache -- the build-derived manifest carries it into
 * `src/middleware.ts`, so no id is ever hand-typed.
 */
export const viewport = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});
