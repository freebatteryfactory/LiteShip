import { defineBoundary } from 'liteship';

// A boundary maps a continuous INPUT (viewport width) to a few named STATES.
// This is the first half of the author model: input -> states.
export const layout = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ] as const,
});
